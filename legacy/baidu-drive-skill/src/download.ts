/**
 * 文件下载 —— filemetas → dlink → Range 分片(并发可调)。
 *
 * 协议要点:
 * - 调 `filemetas?dlink=1` 拿到 `dlink` + size + md5。
 * - GET dlink 时:
 *     - **必须**带 `User-Agent: pan.baidu.com`(client.ts/dlinkFetch 已硬编码),
 *       否则百度返回 403。
 *     - access_token 必须拼到 dlink query 上(也已封装好)。
 *     - dlink 一般有效期较长,但视为短期凭证 —— 失败重新拉一次 filemetas 即可。
 *
 * 分片策略:
 * - size < 50MB → 单连接顺序读流写盘
 * - size ≥ 50MB → 切成 50MB 一片,并发 N 写入同一个 fd 的不同 offset
 *
 * 完整性校验:
 * - 写完后用 `md5sum` 对比 filemetas 返回的 md5(若有)。
 * - 不一致直接抛错并删除本地输出。
 *
 * 输出策略:
 * - 写入 `<local>.partial`,完整且校验通过后再 `rename` 到 `<local>`。
 * - 如果 `<local>` 已存在,默认覆盖(调用方在更上层负责询问)。
 */

import { existsSync } from 'node:fs';
import { promises as fsp } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname } from 'node:path';

import { dlinkFetch } from './client.js';
import { filemetas, statByPath } from './fileops.js';
import { assertInScope } from './scope.js';
import type { ConfigFile } from './config.js';
import type { CredentialsOpts } from './auth.js';

// ---------- 常量 ----------

/** 分片下载触发阈值。size 小于此值走单连接。 */
const RANGE_THRESHOLD = 50 * 1024 * 1024;
/** 单分片大小。 */
const RANGE_CHUNK_SIZE = 50 * 1024 * 1024;

// ---------- 选项 / 结果 ----------

export interface DownloadOptions {
  /** 并发分片数。默认取 `cfg.concurrency.downloadChunks`。 */
  concurrency?: number;
  /** 进度回调:done/total 都是字节数。 */
  onProgress?: (done: number, total: number) => void;
  /**
   * 校验 md5。默认 true。
   * - true:写完用本地 md5 对比 filemetas 返回的 md5,不一致抛错。
   * - false:跳过(调用方已知 OK,不想再读一次磁盘)。
   */
  verify?: boolean;
}

export interface DownloadResult {
  localPath: string;
  remotePath: string;
  size: number;
  /** filemetas 返回的服务端 md5(可能缺失,百度对很大或刚上传文件偶尔返回空)。 */
  serverMd5?: string;
  /** 本地 md5(verify=false 时缺省)。 */
  localMd5?: string;
  /** 实际下载分片数(单连接=1)。 */
  parts: number;
}

// ---------- 主流程 ----------

export async function download(
  cfg: ConfigFile,
  remoteRawPath: string,
  localPath: string,
  opts: DownloadOptions = {},
  creds?: CredentialsOpts,
): Promise<DownloadResult> {
  const remotePath = assertInScope(remoteRawPath, cfg);

  const entry = await statByPath(cfg, remotePath, creds);
  if (!entry) {
    throw new Error(`远端文件不存在: ${remotePath}`);
  }
  if (entry.isdir === 1) {
    throw new Error(`download 不支持目录,请按文件下载: ${remotePath}`);
  }

  const metas = await filemetas(cfg, [entry.fs_id], true, creds);
  const meta = metas[0];
  if (!meta || !meta.dlink) {
    throw new Error(
      '未取到 dlink。请确认应用已勾选 netdisk 权限,且当前 access_token 有效。',
    );
  }
  const size = meta.size;
  const concurrency = Math.max(
    1,
    opts.concurrency ?? cfg.concurrency.downloadChunks ?? 4,
  );
  const reportProgress = opts.onProgress ?? (() => {});
  const verify = opts.verify !== false;

  // 准备本地目录与临时文件
  const dir = dirname(localPath);
  if (dir && !existsSync(dir)) {
    await fsp.mkdir(dir, { recursive: true });
  }
  const tmpPath = `${localPath}.partial`;
  if (existsSync(tmpPath)) {
    await fsp.unlink(tmpPath);
  }

  // 创建并预分配空间(快速失败:磁盘不够直接报错)
  const fh = await fsp.open(tmpPath, 'w+');
  let parts = 1;
  try {
    if (size > 0) {
      try {
        await fh.truncate(size);
      } catch (e) {
        throw new Error(
          `预分配本地文件 ${tmpPath} 失败(磁盘空间不足?): ${(e as Error).message}`,
        );
      }
    }

    if (size === 0) {
      // 0 字节文件:直接关闭
      reportProgress(0, 0);
    } else if (size < RANGE_THRESHOLD) {
      // 单连接
      reportProgress(0, size);
      await downloadSingle(cfg, meta.dlink, fh, size, reportProgress, creds);
    } else {
      // 分片并发
      parts = Math.ceil(size / RANGE_CHUNK_SIZE);
      reportProgress(0, size);
      await downloadRanges(
        cfg,
        meta.dlink,
        fh,
        size,
        concurrency,
        parts,
        reportProgress,
        creds,
      );
    }
  } finally {
    await fh.close();
  }

  // 校验
  let localMd5: string | undefined;
  if (verify && meta.md5 && size > 0) {
    localMd5 = await md5OfFile(tmpPath);
    if (localMd5.toLowerCase() !== meta.md5.toLowerCase()) {
      try {
        await fsp.unlink(tmpPath);
      } catch {
        /* best-effort */
      }
      throw new Error(
        `下载完成但 md5 不一致(本地 ${localMd5} ≠ 服务端 ${meta.md5})。已删除 ${tmpPath},请重试。`,
      );
    }
  }

  // 移到最终位置(覆盖现有文件)
  await fsp.rename(tmpPath, localPath);

  return {
    localPath,
    remotePath,
    size,
    serverMd5: meta.md5,
    localMd5,
    parts,
  };
}

// ---------- 单连接 ----------

async function downloadSingle(
  cfg: ConfigFile,
  dlink: string,
  fh: fsp.FileHandle,
  total: number,
  reportProgress: (done: number, total: number) => void,
  creds?: CredentialsOpts,
): Promise<void> {
  const res = await dlinkFetch(cfg, dlink, undefined, {}, creds);
  if (!res.body) {
    throw new Error('dlink 响应没有 body');
  }
  let written = 0;
  for await (const raw of res.body as unknown as AsyncIterable<Uint8Array>) {
    const chunk = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
    await fh.write(chunk, 0, chunk.length, written);
    written += chunk.length;
    reportProgress(written, total);
  }
  if (written !== total) {
    throw new Error(`下载字节数不匹配:写入 ${written} / 期望 ${total}`);
  }
}

// ---------- 分片并发 ----------

interface RangeJob {
  index: number;
  start: number;
  end: number; // inclusive
}

async function downloadRanges(
  cfg: ConfigFile,
  dlink: string,
  fh: fsp.FileHandle,
  total: number,
  concurrency: number,
  parts: number,
  reportProgress: (done: number, total: number) => void,
  creds?: CredentialsOpts,
): Promise<void> {
  const jobs: RangeJob[] = [];
  for (let i = 0; i < parts; i++) {
    const start = i * RANGE_CHUNK_SIZE;
    const end = Math.min(total - 1, start + RANGE_CHUNK_SIZE - 1);
    jobs.push({ index: i, start, end });
  }

  let cursor = 0;
  let firstError: unknown = null;
  let doneBytes = 0;

  async function worker(): Promise<void> {
    for (;;) {
      if (firstError) return;
      const i = cursor++;
      if (i >= jobs.length) return;
      const job = jobs[i];
      try {
        const res = await dlinkFetch(
          cfg,
          dlink,
          { start: job.start, end: job.end },
          {},
          creds,
        );
        if (!res.body) {
          throw new Error(`Range ${job.start}-${job.end} 响应没有 body`);
        }
        const expected = job.end - job.start + 1;
        let written = 0;
        for await (const raw of res.body as unknown as AsyncIterable<Uint8Array>) {
          const chunk = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
          if (firstError) return;
          await fh.write(chunk, 0, chunk.length, job.start + written);
          written += chunk.length;
          doneBytes += chunk.length;
          reportProgress(doneBytes, total);
        }
        if (written !== expected) {
          throw new Error(
            `分片 ${job.index} 字节数不匹配:写入 ${written} / 期望 ${expected}`,
          );
        }
      } catch (e) {
        if (!firstError) firstError = e;
        return;
      }
    }
  }

  const workers: Promise<void>[] = [];
  for (let i = 0; i < Math.min(concurrency, jobs.length); i++) {
    workers.push(worker());
  }
  await Promise.all(workers);
  if (firstError) throw firstError;
}

// ---------- 工具 ----------

async function md5OfFile(path: string): Promise<string> {
  const hasher = createHash('md5');
  const fh = await fsp.open(path, 'r');
  try {
    const stream = fh.createReadStream({ highWaterMark: 1024 * 1024 });
    for await (const c of stream as AsyncIterable<Buffer>) {
      hasher.update(c);
    }
  } finally {
    await fh.close();
  }
  return hasher.digest('hex');
}
