/**
 * 大文件上传 —— precreate → superfile2 → create 三段式 + 秒传 + 断点续传。
 *
 * 协议要点(整理自百度 OpenAPI 文档):
 * - **precreate**:声明要上传的文件(path / size / block_list / content-md5 / slice-md5)。
 *     - 命中秒传 → return_type=2,直接 commit 即可,无需上传。
 *     - 未命中  → return_type=1 + uploadid,后端 `block_list` 给出真正需要传的分片序号。
 * - **superfile2 upload**:对每个 partseq 用 `pcsUpload`(d.pcs.baidu.com),POST 一个
 *   multipart/form-data,字段名 `file`,query 带 uploadid + path + partseq。
 * - **create**:提交 uploadid + 所有分片 MD5,后端落盘并返回 fs_id。
 *
 * 分片大小:
 * - 普通用户 4MB,VIP 16MB,SVIP 32MB。我们不读 vip_type,直接 4MB 最稳(VIP 也可以传,
 *   只是分片更多一点)。
 *
 * 秒传(rapid upload):
 * - 在 precreate 里附 content-md5 + slice-md5(前 256KB 的 MD5),后端命中即跳过上传。
 * - 文件 < 256KB 时秒传无意义,直接走普通流程。
 *
 * 断点续传:
 * - state 文件:`<configDir>/uploads/<sha256(remotePath)>.json`
 *   含 `path / size / contentMd5 / blockMd5s / uploadid / completed[]`。
 * - 复用条件:size 与 contentMd5 都匹配 → 跳过已完成 partseq。
 * - 文件改了 / 远端路径不同 → 删 state 重来。
 * - 全部成功后删除 state。
 */

import { existsSync, mkdirSync, statSync, createReadStream } from 'node:fs';
import { promises as fsp } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

import { ENDPOINTS, pcsUpload, xpanPostForm, type XpanResponse } from './client.js';
import { assertInScope } from './scope.js';
import { getConfigDir } from './config.js';
import { BaiduError } from './errors.js';
import type { ConfigFile } from './config.js';
import type { CredentialsOpts } from './auth.js';

// ---------- 常量 ----------

/** 默认分片大小 4MB(普通用户上限,VIP 也兼容)。 */
const CHUNK_SIZE = 4 * 1024 * 1024;
/** 用于 slice-md5 的前 N 字节。 */
const SLICE_MD5_SIZE = 256 * 1024;
/** state 文件目录(配置目录下的 uploads/)。 */
function getUploadStateDir(): string {
  return join(getConfigDir(), 'uploads');
}

// ---------- precreate / create 响应 ----------

interface PrecreateResponse extends XpanResponse {
  uploadid?: string;
  /** 1=正常上传 / 2=秒传命中。 */
  return_type?: 1 | 2;
  /** 后端要求上传的分片序号(已存在的分片会被跳过,通常为入参的子集)。 */
  block_list?: number[];
  path?: string;
  /** 秒传命中时返回的文件信息。 */
  info?: {
    fs_id?: number;
    path?: string;
    size?: number;
    md5?: string;
    server_mtime?: number;
    server_ctime?: number;
    isdir?: number;
  };
}

interface CreateFileResponse extends XpanResponse {
  fs_id?: number;
  md5?: string;
  path?: string;
  size?: number;
  ctime?: number;
  mtime?: number;
  category?: number;
  isdir?: number;
  name?: string;
  server_filename?: string;
}

// ---------- state 文件 ----------

interface UploadState {
  /** 远端绝对路径(标准化后的 API 路径)。 */
  path: string;
  /** 本地文件大小(字节)。 */
  size: number;
  /** 整文件 MD5(小写十六进制)。 */
  contentMd5: string;
  /** 前 256KB 的 MD5。 */
  sliceMd5: string;
  /** 每个分片的 MD5(顺序与 partseq 一致)。 */
  blockMd5s: string[];
  /** 后端返回的 uploadid。 */
  uploadid: string;
  /** 已上传完成的 partseq 列表。 */
  completed: number[];
  /** state 创建时间戳(unix seconds)。 */
  createdAt: number;
}

function stateFilePath(remotePath: string): string {
  const hash = createHash('sha256').update(remotePath).digest('hex').slice(0, 32);
  return join(getUploadStateDir(), `${hash}.json`);
}

async function loadState(
  remotePath: string,
  size: number,
  contentMd5: string,
): Promise<UploadState | null> {
  const path = stateFilePath(remotePath);
  if (!existsSync(path)) return null;
  try {
    const txt = await fsp.readFile(path, 'utf-8');
    const raw = JSON.parse(txt) as Partial<UploadState>;
    if (
      raw.path !== remotePath ||
      raw.size !== size ||
      raw.contentMd5 !== contentMd5 ||
      typeof raw.uploadid !== 'string' ||
      !Array.isArray(raw.blockMd5s) ||
      !Array.isArray(raw.completed)
    ) {
      return null;
    }
    return {
      path: raw.path,
      size: raw.size,
      contentMd5: raw.contentMd5,
      sliceMd5: typeof raw.sliceMd5 === 'string' ? raw.sliceMd5 : '',
      blockMd5s: raw.blockMd5s.filter((x: unknown): x is string => typeof x === 'string'),
      uploadid: raw.uploadid,
      completed: raw.completed.filter((x: unknown): x is number => typeof x === 'number'),
      createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : 0,
    };
  } catch {
    return null;
  }
}

async function saveState(state: UploadState): Promise<void> {
  const dir = getUploadStateDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  const path = stateFilePath(state.path);
  await fsp.writeFile(path, JSON.stringify(state, null, 2) + '\n', { encoding: 'utf-8', mode: 0o600 });
}

async function dropState(remotePath: string): Promise<void> {
  const path = stateFilePath(remotePath);
  try {
    await fsp.unlink(path);
  } catch {
    /* best-effort */
  }
}

// ---------- 哈希计算 ----------

interface FileHashes {
  blockMd5s: string[];
  contentMd5: string;
  sliceMd5: string;
}

/**
 * 单遍流式读文件,同时算:
 * - 整文件 MD5(content-md5)
 * - 前 256KB MD5(slice-md5)
 * - 每个 4MB 分片的 MD5(block_list)
 */
export async function hashFile(localPath: string, expectedSize: number): Promise<FileHashes> {
  const blockMd5s: string[] = [];
  const contentHasher = createHash('md5');
  const sliceHasher = createHash('md5');
  let chunkHasher = createHash('md5');
  let chunkBytes = 0;
  let totalBytes = 0;
  let sliceBytesLeft = SLICE_MD5_SIZE;

  const stream = createReadStream(localPath, { highWaterMark: 64 * 1024 });
  for await (const buf of stream as AsyncIterable<Buffer>) {
    let offset = 0;
    while (offset < buf.length) {
      const remainingChunk = CHUNK_SIZE - chunkBytes;
      const take = Math.min(remainingChunk, buf.length - offset);
      const slice = buf.subarray(offset, offset + take);
      chunkHasher.update(slice);
      contentHasher.update(slice);
      if (sliceBytesLeft > 0) {
        const sliceTake = Math.min(sliceBytesLeft, slice.length);
        sliceHasher.update(slice.subarray(0, sliceTake));
        sliceBytesLeft -= sliceTake;
      }
      chunkBytes += take;
      totalBytes += take;
      offset += take;
      if (chunkBytes === CHUNK_SIZE) {
        blockMd5s.push(chunkHasher.digest('hex'));
        chunkHasher = createHash('md5');
        chunkBytes = 0;
      }
    }
  }
  // 最后一个分片(可能不足 4MB)
  if (chunkBytes > 0) {
    blockMd5s.push(chunkHasher.digest('hex'));
  }
  // 0 字节文件:百度要求至少一个分片(空 MD5)
  if (blockMd5s.length === 0) {
    blockMd5s.push(createHash('md5').digest('hex'));
  }

  if (totalBytes !== expectedSize) {
    throw new Error(
      `读取本地文件字节数(${totalBytes})与 stat.size(${expectedSize})不一致,文件可能被并发修改。`,
    );
  }
  return {
    blockMd5s,
    contentMd5: contentHasher.digest('hex'),
    sliceMd5: sliceHasher.digest('hex'),
  };
}

// ---------- 主流程 ----------

export type RtypeStrategy = 0 | 1 | 2 | 3;

export interface UploadOptions {
  /**
   * 冲突策略:
   * - 0 报错(同名直接拒绝)
   * - 1 同名重命名加序号(默认)
   * - 2 同 path 同 size 直接返回已有文件(秒传场景)
   * - 3 覆盖(危险,需调用方显式选)
   */
  rtype?: RtypeStrategy;
  /** 关闭断点续传(每次都从头上传)。默认 false。 */
  noResume?: boolean;
  /** 并发分片数,默认取 cfg.concurrency.uploadParts。 */
  concurrency?: number;
  /** 进度回调:done/total 都是字节数。 */
  onProgress?: (done: number, total: number) => void;
  /** 内部:跳过秒传探测(测试 / 调试用)。 */
  forceUpload?: boolean;
}

export interface UploadResult {
  fs_id: number;
  remotePath: string;
  size: number;
  md5: string;
  rapid: boolean; // 是否秒传命中
  parts: number;  // 实际上传分片数
  resumed: boolean; // 是否复用了断点 state
}

export async function upload(
  cfg: ConfigFile,
  localPath: string,
  remoteRawPath: string,
  opts: UploadOptions = {},
  creds?: CredentialsOpts,
): Promise<UploadResult> {
  if (!existsSync(localPath)) {
    throw new Error(`本地文件不存在: ${localPath}`);
  }
  const stat = statSync(localPath);
  if (stat.isDirectory()) {
    throw new Error(`upload 不支持目录,请按文件传:${localPath}`);
  }
  const remotePath = assertInScope(remoteRawPath, cfg);
  const size = stat.size;
  const rtype: RtypeStrategy = opts.rtype ?? 1;
  const concurrency = Math.max(1, opts.concurrency ?? cfg.concurrency.uploadParts ?? 4);
  const reportProgress = opts.onProgress ?? (() => {});

  // ---- 1. 计算哈希 ----
  const { blockMd5s, contentMd5, sliceMd5 } = await hashFile(localPath, size);
  const totalParts = blockMd5s.length;

  // ---- 2. 尝试复用 state ----
  let state: UploadState | null = opts.noResume
    ? null
    : await loadState(remotePath, size, contentMd5);
  let resumed = false;
  if (state && state.uploadid && state.blockMd5s.join(',') === blockMd5s.join(',')) {
    resumed = true;
  } else {
    state = null;
  }

  // ---- 3. precreate(若未复用 state)----
  let uploadid = state?.uploadid;
  let backendBlockList: number[] | null = null; // 后端要求上传的 partseq;null 表示「全传」
  let rapidHit = false;
  let rapidInfo: PrecreateResponse['info'] | undefined;

  if (!uploadid) {
    const pre = await xpanPostForm<PrecreateResponse>(
      cfg,
      ENDPOINTS.filePrecreate,
      {
        path: remotePath,
        size,
        isdir: 0,
        autoinit: 1,
        block_list: JSON.stringify(blockMd5s),
        rtype,
        ...(opts.forceUpload || size < SLICE_MD5_SIZE
          ? {}
          : { 'content-md5': contentMd5, 'slice-md5': sliceMd5 }),
      },
      {},
      {},
      creds,
    );
    if (pre.return_type === 2) {
      // 秒传命中
      rapidHit = true;
      rapidInfo = pre.info;
    } else {
      uploadid = pre.uploadid;
      if (!uploadid) {
        throw new BaiduError(
          pre.errno ?? -1,
          'precreate 未返回 uploadid 也未命中秒传,无法继续上传',
          { endpoint: ENDPOINTS.filePrecreate, raw: pre },
        );
      }
      if (Array.isArray(pre.block_list) && pre.block_list.length > 0) {
        backendBlockList = pre.block_list;
      }
      // 立刻把新 state 落盘,后续每片完成后会更新 completed[]
      state = {
        path: remotePath,
        size,
        contentMd5,
        sliceMd5,
        blockMd5s,
        uploadid,
        completed: [],
        createdAt: Math.floor(Date.now() / 1000),
      };
      await saveState(state);
    }
  }

  // ---- 4. 秒传命中:直接 commit + 返回 ----
  if (rapidHit) {
    const fs_id = rapidInfo?.fs_id ?? 0;
    if (!fs_id) {
      // 极少数情况下后端不在 info 里给 fs_id,显式 commit 一次拿 fs_id
      const cr = await commit(
        cfg,
        remotePath,
        size,
        '',
        blockMd5s,
        rtype,
        creds,
      );
      reportProgress(size, size);
      await dropState(remotePath);
      return {
        fs_id: cr.fs_id ?? 0,
        remotePath,
        size,
        md5: cr.md5 ?? rapidInfo?.md5 ?? contentMd5,
        rapid: true,
        parts: 0,
        resumed: false,
      };
    }
    reportProgress(size, size);
    await dropState(remotePath);
    return {
      fs_id,
      remotePath,
      size,
      md5: rapidInfo?.md5 ?? contentMd5,
      rapid: true,
      parts: 0,
      resumed: false,
    };
  }

  // ---- 5. 上传分片 ----
  if (!state || !uploadid) {
    throw new Error('内部错误:state 未初始化');
  }

  // 决定要传的 partseq 列表
  const completedSet = new Set(state.completed);
  const allSeqs = backendBlockList ?? Array.from({ length: totalParts }, (_, i) => i);
  const todo = allSeqs.filter((seq) => !completedSet.has(seq));

  // 进度初值:已完成的字节数(粗粒度按 chunk size 算,最后一片可能偏小)
  let doneBytes = state.completed.reduce(
    (acc, seq) => acc + chunkSizeAt(seq, size, totalParts),
    0,
  );
  reportProgress(doneBytes, size);

  // 串行 + 受限并发:简单实现 —— 用 worker pool
  let cursor = 0;
  let firstError: unknown = null;
  const workers: Promise<void>[] = [];

  async function worker(): Promise<void> {
    for (;;) {
      if (firstError) return;
      const i = cursor++;
      if (i >= todo.length) return;
      const seq = todo[i];
      try {
        const part = await readPart(localPath, seq, size, totalParts);
        await pcsUpload(
          cfg,
          { path: remotePath, uploadid: uploadid!, partseq: seq },
          part,
          // multipart 字段需要一个 filename,百度对内容不挑剔,固定即可
          `partseq-${seq}`,
          {},
          creds,
        );
        if (firstError) return;
        state!.completed.push(seq);
        doneBytes += part.length;
        reportProgress(doneBytes, size);
        // 每完成一片落一次 state(代价低,断点准)
        await saveState(state!);
      } catch (e) {
        if (!firstError) firstError = e;
        return;
      }
    }
  }

  for (let i = 0; i < Math.min(concurrency, todo.length); i++) {
    workers.push(worker());
  }
  await Promise.all(workers);
  if (firstError) throw firstError;

  // ---- 6. commit ----
  const cr = await commit(cfg, remotePath, size, uploadid, blockMd5s, rtype, creds);
  await dropState(remotePath);
  reportProgress(size, size);

  return {
    fs_id: cr.fs_id ?? 0,
    remotePath,
    size,
    md5: cr.md5 ?? contentMd5,
    rapid: false,
    parts: todo.length,
    resumed,
  };
}

// ---------- 内部 helper ----------

function chunkSizeAt(seq: number, total: number, parts: number): number {
  if (parts <= 0) return 0;
  const lastSize = total - CHUNK_SIZE * (parts - 1);
  return seq === parts - 1 ? Math.max(0, lastSize) : CHUNK_SIZE;
}

async function readPart(
  localPath: string,
  seq: number,
  total: number,
  parts: number,
): Promise<Buffer> {
  const start = seq * CHUNK_SIZE;
  const size = chunkSizeAt(seq, total, parts);
  if (size === 0) return Buffer.alloc(0);
  const stream = createReadStream(localPath, {
    start,
    end: start + size - 1,
    highWaterMark: 64 * 1024,
  });
  const chunks: Buffer[] = [];
  for await (const c of stream as AsyncIterable<Buffer>) {
    chunks.push(c);
  }
  return Buffer.concat(chunks, size);
}

async function commit(
  cfg: ConfigFile,
  remotePath: string,
  size: number,
  uploadid: string,
  blockMd5s: string[],
  rtype: RtypeStrategy,
  creds?: CredentialsOpts,
): Promise<CreateFileResponse> {
  const body: Record<string, string | number> = {
    path: remotePath,
    size,
    isdir: 0,
    block_list: JSON.stringify(blockMd5s),
    rtype,
  };
  if (uploadid) body.uploadid = uploadid;
  return xpanPostForm<CreateFileResponse>(
    cfg,
    ENDPOINTS.fileCreate,
    body,
    {},
    {},
    creds,
  );
}
