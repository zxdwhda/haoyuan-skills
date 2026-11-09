/**
 * `pan.cjs` CLI 入口。
 *
 * Commander 注册的子命令(Week 1 P0):
 *   login / logout / status / scope / ls / mkdir
 *
 * Week 2/3 再追加:upload / download / search / mv / cp / rename / rm / share / trash。
 *
 * 设计要点:
 * - 所有 handler 走统一 try/catch + formatError 兜底,异常退出码 1。
 * - 子命令打印走 stdout(默认),诊断信息走 stderr。
 * - --json 仅由 ls 实现(可被脚本 jq 消费),其余命令都是人类可读输出。
 */

import { Command } from 'commander';
import { stdout, stderr, exit } from 'node:process';

import { runLogin } from './login.js';
import { logout } from './auth.js';
import { loadConfig, saveConfig, loadToken, listProfiles, deleteToken, type ConfigFile } from './config.js';
import { getUserInfo, getQuota, ls, lsAll, listRecursive, mkdir, softRm, hardRm, statByPath, search, semanticSearch, move, copy, rename, categoryList, CATEGORY_NAMES, pollTask, queryTask } from './fileops.js';
import { upload } from './upload.js';
import { download } from './download.js';
import { guardHardDelete } from './delete-policy.js';
import type { HardDeleteTarget } from './delete-policy.js';
import { getScopeRoot, toDisplayPath, assertInScope } from './scope.js';
import { color, formatBytes, formatTime, info, success, warn, error as logError, ProgressBar, osc8 } from './ui.js';
import { createShare, transferShare } from './share.js';
import {
  AuthError,
  BaiduError,
  ConfigError,
  HttpError,
  PolicyError,
  ScopeError,
  formatError,
} from './errors.js';

const VERSION = '0.0.1-alpha.0';

// ---------- 共享辅助 ----------

interface GlobalLikeOpts {
  clientId?: string;
  clientSecret?: string;
}

function parseLimit(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`--limit 必须是正整数,实际为 ${raw}`);
  }
  return n;
}

async function runWithErrorHandling(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (e) {
    if (e instanceof AuthError) {
      logError(formatError(e));
      stderr.write(color.dim('提示:运行 `pan.cjs login` 重新登录。\n'));
    } else if (
      e instanceof ScopeError ||
      e instanceof PolicyError ||
      e instanceof ConfigError ||
      e instanceof BaiduError ||
      e instanceof HttpError
    ) {
      logError(formatError(e));
    } else if (e instanceof Error) {
      logError(e.message);
    } else {
      logError(String(e));
    }
    exit(1);
  }
}

// ---------- 子命令实现 ----------

async function cmdStatus(opts: GlobalLikeOpts): Promise<void> {
  const cfg = loadConfig();
  const profile = cfg.activeProfile ?? 'default';
  const tok = loadToken(profile);
  if (!tok) {
    info('未登录。运行 ' + color.cyan('pan.cjs login') + ' 完成登录。');
    return;
  }

  const now = Math.floor(Date.now() / 1000);
  const remaining = tok.expires_at - now;
  const expiryTxt = formatTime(tok.expires_at);
  const expirySuffix =
    remaining <= 0
      ? color.red('(已过期)')
      : remaining < 600
        ? color.yellow(`(${Math.max(0, Math.floor(remaining / 60))} 分钟后过期)`)
        : color.dim(`(还有 ${Math.floor(remaining / 3600)} 小时)`);

  info(color.bold('=== 登录状态 ==='));
  info(`profile:  ${profile}`);
  info(`登录方式: ${tok.kind}${tok.kind === 'manual' ? color.yellow(' (无自动续期,过期需重新粘贴)') : ''}`);
  info(`token 过期: ${expiryTxt} ${expirySuffix}`);
  info(`scope:    ${tok.scope}`);

  info('');
  info(color.bold('=== 作用域 ==='));
  const envScope = process.env.BAIDU_DRIVE_SCOPE;
  const envAppName = process.env.BAIDU_DRIVE_APP_NAME;
  const envAllowed = process.env.BAIDU_DRIVE_ALLOWED_PATHS;
  info(`当前模式: ${cfg.scope}${envScope ? color.yellow(' (由 BAIDU_DRIVE_SCOPE 覆盖)') : ''}`);
  info(`默认根:   ${getScopeRoot(cfg)}  ${color.dim('(' + toDisplayPath(getScopeRoot(cfg)) + ')')}`);
  if (cfg.scope === 'full' && cfg.allowedPaths.length > 0) {
    info(`白名单:   ${cfg.allowedPaths.join(', ')}${envAllowed ? color.yellow(' (由 BAIDU_DRIVE_ALLOWED_PATHS 覆盖)') : ''}`);
  }
  if (envAppName) {
    info(`应用名:   ${cfg.appName} ${color.yellow('(由 BAIDU_DRIVE_APP_NAME 覆盖)')}`);
  }
  if (cfg.scope === 'full') {
    warn('已开启全盘模式,所有命令将作用于整个网盘,请审慎操作。');
  }

  // 对外接口可能因 token 过期失败,不要让 status 整体崩。
  try {
    const u = await getUserInfo(cfg, opts);
    const q = await getQuota(cfg, opts);
    info('');
    info(color.bold('=== 账号 ==='));
    info(`用户:     ${u.netdisk_name ?? u.baidu_name ?? '-'}`);
    if (typeof u.vip_type === 'number') {
      info(`会员:     ${u.vip_type === 0 ? '普通用户' : `VIP${u.vip_type}`}`);
    }
    if (typeof u.uk === 'number') {
      info(`uk:       ${u.uk}`);
    }
    if (typeof q.total === 'number' && typeof q.used === 'number') {
      const pct = q.total > 0 ? ((q.used / q.total) * 100).toFixed(1) : '0';
      info(`容量:     ${formatBytes(q.used)} / ${formatBytes(q.total)} (${pct}%)`);
    }
  } catch (e) {
    info('');
    warn(`无法获取账号信息: ${formatError(e)}`);
  }
}

async function cmdScope(arg: string | undefined, opts: { print?: boolean; appName?: string }): Promise<void> {
  const cfg = loadConfig();
  const envScope = process.env.BAIDU_DRIVE_SCOPE;
  const envAppName = process.env.BAIDU_DRIVE_APP_NAME;
  const envAllowed = process.env.BAIDU_DRIVE_ALLOWED_PATHS;

  if (opts.print || (!arg && !opts.appName)) {
    stdout.write(cfg.scope + '\n');
    if (envScope) {
      warn(`注意:BAIDU_DRIVE_SCOPE=${envScope} 环境变量正在覆盖 config.json 的值。`);
    }
    return;
  }

  const next: ConfigFile = { ...cfg };
  if (opts.appName) {
    next.appName = opts.appName;
  }
  if (arg) {
    if (arg !== 'sandbox' && arg !== 'full') {
      throw new Error(`scope 只能是 sandbox 或 full,实际为: ${arg}`);
    }
    next.scope = arg;
  }
  saveConfig(next);

  const warnings: string[] = [];
  if (envScope) warnings.push(`BAIDU_DRIVE_SCOPE=${envScope} 会覆盖刚写入的 scope,实际生效为 ${envScope}。`);
  if (envAppName && opts.appName) warnings.push(`BAIDU_DRIVE_APP_NAME=${envAppName} 会覆盖刚写入的 appName。`);
  if (envAllowed && next.scope === 'full' && next.allowedPaths.length > 0) warnings.push('BAIDU_DRIVE_ALLOWED_PATHS 会覆盖 config.json 的白名单。');

  if (next.scope === 'full' && next.scope !== cfg.scope) {
    warn('已开启全盘模式 ⚠');
    warn('所有命令将作用于整个网盘。建议在 config.json 设置 allowedPaths 限制范围。');
  }
  success(
    `已保存:scope=${next.scope}, appName=${next.appName}` +
      (next.scope === 'sandbox' ? `, 沙盒根=${getScopeRoot(next)}` : ''),
  );
  for (const w of warnings) warn(w);
}

async function cmdLs(
  rawPath: string,
  opts: GlobalLikeOpts & {
    limit?: string;
    json?: boolean;
    all?: boolean;
    desc?: boolean;
    order?: 'name' | 'time' | 'size';
    folder?: boolean;
    recursive?: boolean;
  },
): Promise<void> {
  const cfg = loadConfig();
  const limit = parseLimit(opts.limit, 1000);
  const order = opts.order ?? 'time';

  let entries: import('./fileops.js').FileEntry[];
  if (opts.recursive) {
    entries = await listRecursive(cfg, rawPath, { order, desc: opts.desc, limit }, opts);
  } else if (opts.all) {
    entries = await lsAll(cfg, rawPath, { order, desc: opts.desc, folderOnly: opts.folder }, opts);
  } else {
    entries = await ls(
      cfg,
      rawPath,
      { order, desc: opts.desc, folderOnly: opts.folder, limit },
      opts,
    );
  }

  if (opts.json) {
    stdout.write(JSON.stringify(entries, null, 2) + '\n');
    return;
  }

  if (entries.length === 0) {
    info(color.dim('(空目录)'));
    return;
  }

  const totalSize = entries.reduce((s, e) => s + (e.isdir ? 0 : e.size), 0);
  const fileCnt = entries.filter((e) => !e.isdir).length;
  const dirCnt = entries.length - fileCnt;

  // 简单两列对齐
  const widthName = Math.min(
    60,
    Math.max(...entries.map((e) => visibleWidth(e.server_filename + (e.isdir ? '/' : '')))),
  );
  for (const e of entries) {
    const name = e.server_filename + (e.isdir ? '/' : '');
    const sizeStr = e.isdir ? color.dim('       -') : formatBytes(e.size).padStart(8);
    const mtime = formatTime(e.server_mtime);
    const colored = e.isdir ? color.cyan(name) : name;
    stdout.write(`${padRight(colored, widthName, name)}  ${sizeStr}  ${color.dim(mtime)}\n`);
  }
  info('');
  info(
    color.dim(
      `共 ${entries.length} 项(${dirCnt} 目录, ${fileCnt} 文件, 合计 ${formatBytes(totalSize)})`,
    ),
  );
}

async function cmdMkdir(rawPath: string, opts: GlobalLikeOpts): Promise<void> {
  const cfg = loadConfig();
  const res = await mkdir(cfg, rawPath, {}, opts);
  success(`已创建目录: ${res.path ?? rawPath}`);
}

async function cmdUpload(
  localPath: string,
  remotePath: string,
  opts: GlobalLikeOpts & {
    noResume?: boolean;
    rtype?: string;
    yes?: boolean;
  },
): Promise<void> {
  const cfg = loadConfig();
  const rtypeNum =
    opts.rtype === '0' ? 0 :
    opts.rtype === '1' ? 1 :
    opts.rtype === '2' ? 2 :
    opts.rtype === '3' ? 3 : 1;

  let bar: ProgressBar | undefined;
  const res = await upload(cfg, localPath, remotePath, {
    noResume: opts.noResume,
    rtype: rtypeNum,
    onProgress: (done, total) => {
      if (!bar) {
        bar = new ProgressBar({ total, label: `上传 ${localPath}` });
      }
      bar.update(done);
    },
  }, opts);
  bar?.done();
  if (res.rapid) {
    success(`秒传成功: ${res.remotePath} (fs_id=${res.fs_id}, md5=${res.md5})`);
  } else {
    success(`上传完成: ${res.remotePath} (fs_id=${res.fs_id}, 分片=${res.parts}${res.resumed ? ', 已续传' : ''})`);
  }
}

async function cmdDownload(
  remotePath: string,
  localPath: string,
  opts: GlobalLikeOpts,
): Promise<void> {
  const cfg = loadConfig();
  let bar: ProgressBar | undefined;
  const res = await download(cfg, remotePath, localPath, {
    onProgress: (done, total) => {
      if (!bar) {
        bar = new ProgressBar({ total, label: `下载 ${remotePath}` });
      }
      bar.update(done);
    },
  }, opts);
  bar?.done();
  success(`下载完成: ${res.localPath} (${formatBytes(res.size)}, ${res.parts} 个分片${res.localMd5 ? ', md5 OK' : ''})`);
}

async function cmdRm(
  paths: string[],
  opts: GlobalLikeOpts & { hard?: boolean; yes?: boolean },
): Promise<void> {
  const cfg = loadConfig();
  if (paths.length === 0) {
    throw new Error('未指定要删除的路径');
  }

  if (opts.hard) {
    // ---- 硬删除:先收集目标信息 ----
    const targets: HardDeleteTarget[] = [];
    for (const p of paths) {
      const entry = await statByPath(cfg, p, opts);
      if (!entry) {
        throw new Error(`路径不存在,无法硬删除: ${p}`);
      }
      targets.push({
        path: entry.path,
        size: entry.size,
        mtime: entry.server_mtime,
        isdir: entry.isdir === 1,
        children: entry.isdir === 1 ? undefined : undefined,
      });
    }

    await guardHardDelete({ cfg, targets, yes: opts.yes });
    const res = await hardRm(cfg, paths, opts);
    const okCount = (res.info ?? []).filter((i) => i.errno === 0 || i.errno === undefined).length;
    success(`硬删除完成: ${okCount}/${paths.length} 项`);
  } else {
    // ---- 软删除 ----
    for (const p of paths) {
      const r = await softRm(cfg, p, opts);
      success(`已软删除: ${r.src} → ${r.movedAs}`);
    }
  }
}

async function cmdSearch(
  keyword: string,
  opts: GlobalLikeOpts & {
    category?: string;
    dir?: string;
    json?: boolean;
    semantic?: boolean;
    auto?: boolean;
  },
): Promise<void> {
  const cfg = loadConfig();

  // ---- 语义搜索分支 ----
  if (opts.semantic || opts.auto) {
    const searchType: 0 | 1 | 2 = opts.semantic ? 1 : 2;
    const categoryArr = opts.category
      ? opts.category.split(',').map((s) => Number.parseInt(s.trim(), 10)).filter((n) => n >= 1 && n <= 7)
      : undefined;

    const list = await semanticSearch(cfg, {
      query: keyword,
      dir: opts.dir,
      category: categoryArr,
      num: 500,
      searchType,
    }, opts);

    if (opts.json) {
      stdout.write(JSON.stringify(list, null, 2) + '\n');
      return;
    }

    if (list.length === 0) {
      info(color.dim('(未找到匹配项)'));
      return;
    }

    const totalSize = list.reduce((s, e) => s + (e.isdir ? 0 : e.size), 0);
    const fileCnt = list.filter((e) => e.isdir !== 1).length;
    const dirCnt = list.length - fileCnt;

    const widthName = Math.min(
      60,
      Math.max(...list.map((e) => visibleWidth(e.filename + (e.isdir ? '/' : '')))),
    );
    for (const e of list) {
      const name = e.filename + (e.isdir ? '/' : '');
      const sizeStr = e.isdir ? color.dim('       -') : formatBytes(e.size).padStart(8);
      const mtime = formatTime(e.server_mtime);
      const colored = e.isdir ? color.cyan(name) : name;
      const catNum = Number.parseInt(e.category, 10);
      const cat = !Number.isNaN(catNum) && CATEGORY_NAMES[catNum]
        ? color.dim(`[${CATEGORY_NAMES[catNum]}]`)
        : '';
      const contentHint = e.content ? color.dim('(内容匹配)') : '';
      const ocrHint = e.ocr ? color.dim('(OCR匹配)') : '';
      stdout.write(`${padRight(colored, widthName, name)}  ${sizeStr}  ${color.dim(mtime)}  ${cat} ${contentHint}${ocrHint}\n`);
    }
    info('');
    info(
      color.dim(
        `共 ${list.length} 项(${dirCnt} 目录, ${fileCnt} 文件, 合计 ${formatBytes(totalSize)})`,
      ),
    );
    return;
  }

  // ---- 关键词搜索分支 ----
  const categoryNum = opts.category ? Number.parseInt(opts.category, 10) : undefined;
  const res = await search(cfg, {
    key: keyword,
    dir: opts.dir,
    category: categoryNum,
    recursion: true,
    page: 1,
    num: 1000,
  }, opts);

  if (opts.json) {
    stdout.write(JSON.stringify(res.list, null, 2) + '\n');
    return;
  }

  if (res.list.length === 0) {
    info(color.dim('(未找到匹配项)'));
    return;
  }

  const totalSize = res.list.reduce((s, e) => s + (e.isdir ? 0 : e.size), 0);
  const fileCnt = res.list.filter((e) => !e.isdir).length;
  const dirCnt = res.list.length - fileCnt;

  const widthName = Math.min(
    60,
    Math.max(...res.list.map((e) => visibleWidth(e.server_filename + (e.isdir ? '/' : '')))),
  );
  for (const e of res.list) {
    const name = e.server_filename + (e.isdir ? '/' : '');
    const sizeStr = e.isdir ? color.dim('       -') : formatBytes(e.size).padStart(8);
    const mtime = formatTime(e.server_mtime);
    const colored = e.isdir ? color.cyan(name) : name;
    const cat = e.category && CATEGORY_NAMES[e.category] ? color.dim(`[${CATEGORY_NAMES[e.category]}]`) : '';
    stdout.write(`${padRight(colored, widthName, name)}  ${sizeStr}  ${color.dim(mtime)}  ${cat}\n`);
  }
  info('');
  info(
    color.dim(
      `共 ${res.list.length} 项(${dirCnt} 目录, ${fileCnt} 文件, 合计 ${formatBytes(totalSize)})`,
    ),
  );
  if (res.hasMore) {
    warn('结果较多,仅展示前 1000 条。请用 --json 获取完整数据或缩小关键词。');
  }
}

async function cmdMv(
  src: string,
  dst: string,
  opts: GlobalLikeOpts & { overwrite?: boolean },
): Promise<void> {
  const cfg = loadConfig();
  const ondup = opts.overwrite ? 'overwrite' : 'newcopy';
  const infoList = await move(cfg, src, dst, { ondup }, opts);
  const ok = infoList.filter((i) => i.errno === 0 || i.errno === undefined).length;
  success(`移动完成: ${ok}/${infoList.length} 项`);
  for (const i of infoList) {
    if (i.path) info(`  → ${i.path}`);
  }
}

async function cmdCp(
  src: string,
  dst: string,
  opts: GlobalLikeOpts & { overwrite?: boolean },
): Promise<void> {
  const cfg = loadConfig();
  const ondup = opts.overwrite ? 'overwrite' : 'newcopy';
  const infoList = await copy(cfg, src, dst, { ondup }, opts);
  const ok = infoList.filter((i) => i.errno === 0 || i.errno === undefined).length;
  success(`复制完成: ${ok}/${infoList.length} 项`);
  for (const i of infoList) {
    if (i.path) info(`  → ${i.path}`);
  }
}

async function cmdRename(
  path: string,
  newName: string,
  opts: GlobalLikeOpts,
): Promise<void> {
  const cfg = loadConfig();
  const infoList = await rename(cfg, path, newName, opts);
  const ok = infoList.filter((i) => i.errno === 0 || i.errno === undefined).length;
  success(`重命名完成: ${ok}/${infoList.length} 项`);
}

async function cmdShare(
  rawPath: string,
  opts: GlobalLikeOpts & { pwd?: string; days?: string; json?: boolean },
): Promise<void> {
  const cfg = loadConfig();
  const entry = await statByPath(cfg, rawPath, opts);
  if (!entry) {
    throw new Error(`路径不存在: ${rawPath}`);
  }
  const period = opts.days ? Number.parseInt(opts.days, 10) : 0;
  const res = await createShare(cfg, [entry.fs_id], { pwd: opts.pwd, period }, opts);

  if (opts.json) {
    stdout.write(JSON.stringify(res, null, 2) + '\n');
    return;
  }

  if (res.link || res.shortlink) {
    success('分享创建成功');
    if (res.link) info(`链接: ${osc8(res.link, res.link)}`);
    if (res.shortlink) info(`短链: ${osc8(res.shortlink, res.shortlink)}`);
    if (res.pwd) info(`密码: ${color.bold(res.pwd)}`);
  } else {
    throw new Error('分享创建失败:未返回链接');
  }
}

async function cmdTransfer(
  destPath: string,
  opts: GlobalLikeOpts & { shareid?: string; uk?: string; pwd?: string; fsids?: string },
): Promise<void> {
  const cfg = loadConfig();
  if (!opts.shareid || !opts.uk) {
    throw new Error('转存分享必须提供 --shareid 和 --uk');
  }
  const shareid = Number.parseInt(opts.shareid, 10);
  const uk = Number.parseInt(opts.uk, 10);
  if (!Number.isFinite(shareid) || !Number.isFinite(uk)) {
    throw new Error('--shareid 和 --uk 必须是数字');
  }
  const fsids = opts.fsids
    ? opts.fsids.split(',').map((s) => Number.parseInt(s.trim(), 10)).filter(Number.isFinite)
    : undefined;
  const res = await transferShare(
    cfg,
    { shareid, uk, pwd: opts.pwd, destPath, fsids },
    opts,
  );
  success('转存完成');
  if (res.extra?.list && res.extra.list.length > 0) {
    for (const item of res.extra.list) {
      if (item.to) info(`  → ${item.to}`);
    }
  }
}

async function cmdCategory(
  typeStr: string,
  opts: GlobalLikeOpts & {
    dir?: string;
    json?: boolean;
    desc?: boolean;
    order?: 'name' | 'time' | 'size';
  },
): Promise<void> {
  const cfg = loadConfig();
  const validTypes = ['doc', 'image', 'video', 'bt'] as const;
  const type = validTypes.find((t) => t === typeStr);
  if (!type) {
    throw new Error(`不支持的分类类型:${typeStr}。可选:doc | image | video | bt`);
  }
  const entries = await categoryList(cfg, type, {
    dir: opts.dir,
    order: opts.order,
    desc: opts.desc,
    limit: 1000,
  }, opts);

  if (opts.json) {
    stdout.write(JSON.stringify(entries, null, 2) + '\n');
    return;
  }

  if (entries.length === 0) {
    info(color.dim('(无内容)'));
    return;
  }

  const widthName = Math.min(
    60,
    Math.max(...entries.map((e) => visibleWidth(e.server_filename + (e.isdir ? '/' : '')))),
  );
  for (const e of entries) {
    const name = e.server_filename + (e.isdir ? '/' : '');
    const sizeStr = e.isdir ? color.dim('       -') : formatBytes(e.size).padStart(8);
    const mtime = formatTime(e.server_mtime);
    const colored = e.isdir ? color.cyan(name) : name;
    stdout.write(`${padRight(colored, widthName, name)}  ${sizeStr}  ${color.dim(mtime)}\n`);
  }
  info(color.dim(`共 ${entries.length} 项`));
}

async function cmdTask(
  taskidStr: string,
  opts: GlobalLikeOpts & { poll?: boolean },
): Promise<void> {
  const cfg = loadConfig();
  const taskid = Number.parseInt(taskidStr, 10);
  if (!Number.isFinite(taskid)) {
    throw new Error(`taskid 必须是数字: ${taskidStr}`);
  }

  if (opts.poll) {
    info(`开始轮询任务 ${taskid}...`);
    const res = await pollTask(cfg, taskid, opts, (status, retry) => {
      const statusText = status === 1 ? '进行中' : status === 0 ? '完成' : status === 2 ? '失败' : '未知';
      info(`第 ${retry} 次查询: ${statusText}`);
    });
    if (res.status === 0) {
      success(`任务完成: ${taskid}`);
    } else if (res.status === 2) {
      throw new Error(`任务失败(task_errno=${res.task_errno})`);
    }
    return;
  }

  const res = await queryTask(cfg, taskid, opts);
  const statusText =
    res.status === 0 ? '完成' :
    res.status === 1 ? '进行中' :
    res.status === 2 ? '失败' : '未知';
  info(`任务 ${taskid}: ${statusText}`);
  if (res.list && res.list.length > 0) {
    for (const item of res.list) {
      if (item.path) info(`  ${item.path}: result=${item.result}`);
    }
  }
}

async function cmdTrash(
  opts: GlobalLikeOpts & { gc?: boolean; restore?: string; to?: string; list?: boolean },
): Promise<void> {
  const cfg = loadConfig();
  const root = getScopeRoot(cfg);
  const trashDir = `${root}/.trash`;

  // ---- 列出 .trash 内容 ----
  if (opts.list || (!opts.gc && !opts.restore)) {
    try {
      const dates = await ls(cfg, trashDir, {}, opts);
      if (dates.length === 0) {
        info(color.dim('.trash 为空'));
        return;
      }
      for (const d of dates) {
        if (d.isdir !== 1) continue;
        const datePath = `${trashDir}/${d.server_filename}`;
        const items = await lsAll(cfg, datePath, {}, opts);
        const size = items.reduce((s, e) => s + (e.isdir ? 0 : e.size), 0);
        info(`${color.cyan(d.server_filename + '/')}: ${items.length} 项, 合计 ${formatBytes(size)}`);
        for (const item of items.slice(0, 20)) {
          const name = item.server_filename + (item.isdir ? '/' : '');
          const sizeStr = item.isdir ? '-' : formatBytes(item.size);
          stdout.write(`  ${name.padEnd(40)} ${sizeStr}\n`);
        }
        if (items.length > 20) {
          stdout.write(`  ... 还有 ${items.length - 20} 项\n`);
        }
      }
    } catch (e) {
      if (e instanceof BaiduError && e.errno === -9) {
        info(color.dim('.trash 尚未创建'));
        return;
      }
      throw e;
    }
    return;
  }

  // ---- 恢复 ----
  if (opts.restore) {
    const srcPath = assertInScope(opts.restore, cfg);
    if (!srcPath.startsWith(`${trashDir}/`)) {
      throw new Error(`恢复源必须在 .trash 目录内: ${opts.restore}`);
    }
    const dest = opts.to ?? root;
    const infoList = await move(cfg, srcPath, dest, { ondup: 'newcopy' }, opts);
    const ok = infoList.filter((i) => i.errno === 0 || i.errno === undefined).length;
    success(`恢复完成: ${ok}/${infoList.length} 项`);
    for (const i of infoList) {
      if (i.path) info(`  → ${i.path}`);
    }
    return;
  }

  // ---- GC:清理超过 retainDays 的项 ----
  if (opts.gc) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - cfg.trash.retainDays);

    let dates: import('./fileops.js').FileEntry[];
    try {
      dates = await ls(cfg, trashDir, {}, opts);
    } catch (e) {
      if (e instanceof BaiduError && e.errno === -9) {
        info(color.dim('.trash 为空,无需清理'));
        return;
      }
      throw e;
    }

    const targets: HardDeleteTarget[] = [];
    for (const d of dates) {
      if (d.isdir !== 1) continue;
      const dateStr = d.server_filename;
      const dateObj = new Date(dateStr + 'T00:00:00');
      if (Number.isNaN(dateObj.getTime()) || dateObj >= cutoff) continue;

      const datePath = `${trashDir}/${dateStr}`;
      const items = await lsAll(cfg, datePath, {}, opts);
      for (const item of items) {
        targets.push({
          path: item.path,
          size: item.size,
          mtime: item.server_mtime,
          isdir: item.isdir === 1,
        });
      }
    }

    if (targets.length === 0) {
      info(color.dim(`没有超过 ${cfg.trash.retainDays} 天的项目需要清理`));
      return;
    }

    info(`即将清理 ${targets.length} 项(超过 ${cfg.trash.retainDays} 天):`);
    for (const t of targets.slice(0, 10)) {
      info(`  ${t.path} (${formatBytes(t.size)})`);
    }
    if (targets.length > 10) {
      info(`  ... 还有 ${targets.length - 10} 项`);
    }

    // 走完整四级保护(与 rm --hard 同等级)
    await guardHardDelete({ cfg, targets, yes: false });

    // 执行硬删除(百度 filemanager 单次上限 100,分批)
    const paths = targets.map((t) => t.path);
    const BATCH = 100;
    let deleted = 0;
    for (let i = 0; i < paths.length; i += BATCH) {
      const batch = paths.slice(i, i + BATCH);
      const res = await hardRm(cfg, batch, opts);
      const ok = (res.info ?? []).filter((item) => item.errno === 0 || item.errno === undefined).length;
      deleted += ok;
    }
    success(`清理完成: ${deleted}/${targets.length} 项`);
    return;
  }
}

async function cmdLogout(): Promise<void> {
  const cfg = loadConfig();
  const profile = cfg.activeProfile ?? 'default';
  logout(profile);
  success(`已退出登录,profile "${profile}" 的 token 已清除。如有自有应用客户端密钥仍存放于 config.json,请按需自行管理。`);
}

async function cmdProfile(
  opts: { list?: boolean; switch?: string; add?: string; remove?: string },
): Promise<void> {
  const cfg = loadConfig();
  const current = cfg.activeProfile ?? 'default';

  if (opts.switch) {
    const next = opts.switch;
    const nextCfg: ConfigFile = { ...cfg, activeProfile: next };
    saveConfig(nextCfg);
    success(`已切换 profile:"${next}"`);
    const tok = loadToken(next);
    if (!tok) {
      warn(`profile "${next}" 尚未登录,运行 pan.cjs login 完成登录。`);
    }
    return;
  }

  if (opts.add) {
    const name = opts.add;
    success(`已添加 profile:"${name}",当前仍为 "${current}"。运行 pan.cjs profile --switch ${name} 切换。`);
    return;
  }

  if (opts.remove) {
    const name = opts.remove;
    if (name === 'default') {
      throw new Error('不能删除 default profile');
    }
    if (name === current) {
      throw new Error(`不能删除当前激活的 profile "${name}",请先切换到其他 profile。`);
    }
    deleteToken(name);
    success(`已删除 profile:"${name}" 的 token。`);
    return;
  }

  // 默认:列出所有 profile
  const profiles = listProfiles();
  info(color.bold('=== Profile 列表 ==='));
  for (const p of profiles) {
    const marker = p === current ? color.green(' (当前)') : '';
    const hasToken = loadToken(p) ? color.dim(' [已登录]') : color.dim(' [未登录]');
    info(`  ${p}${marker}${hasToken}`);
  }
}

// ---------- 终端宽度对齐(粗略支持中文) ----------

function visibleWidth(s: string): number {
  let w = 0;
  for (const ch of s) {
    const code = ch.codePointAt(0) ?? 0;
    // CJK / 全角 简化判断:U+1100~U+115F(Hangul) / U+2E80~U+9FFF / U+A000~U+A4CF / U+AC00~U+D7A3 /
    // U+F900~U+FAFF / U+FE30~U+FE4F / U+FF00~U+FF60 / U+FFE0~U+FFE6
    const isWide =
      (code >= 0x1100 && code <= 0x115f) ||
      (code >= 0x2e80 && code <= 0x9fff) ||
      (code >= 0xa000 && code <= 0xa4cf) ||
      (code >= 0xac00 && code <= 0xd7a3) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xfe30 && code <= 0xfe4f) ||
      (code >= 0xff00 && code <= 0xff60) ||
      (code >= 0xffe0 && code <= 0xffe6);
    w += isWide ? 2 : 1;
  }
  return w;
}

function padRight(coloredText: string, targetWidth: number, plainTextForWidth: string): string {
  const pad = Math.max(0, targetWidth - visibleWidth(plainTextForWidth));
  return coloredText + ' '.repeat(pad);
}

// ---------- 入口 ----------

function main(): void {
  const program = new Command();

  program
    .name('pan.cjs')
    .description('百度网盘开源 Skill CLI(直连 OpenAPI,无 binary 依赖)')
    .version(VERSION)
    .option('--client-id <id>', 'OAuth 自有应用 client_id(覆盖 env / config.json)')
    .option('--client-secret <secret>', 'OAuth 自有应用 client_secret(覆盖 env / config.json)');

  program
    .command('login')
    .description('登录百度账号(默认 device code,失败可加 --oob)')
    .option('--device', '使用 device code 登录(默认)')
    .option('--oob', '使用 OOB authorization code(SSH/无浏览器场景)')
    .option('--manual', '粘贴限时体验 access_token(无自动续期)')
    .option('--token <token>', 'manual 模式下直接传入 token(高危,仅自动化用)')
    .option('--yes', '跳过免责声明(仅推荐自动化测试使用)')
    .action(async (cmdOpts) => {
      const root = program.opts<GlobalLikeOpts>();
      const mode = cmdOpts.oob
        ? 'oob'
        : cmdOpts.manual
          ? 'manual'
          : cmdOpts.device
            ? 'device'
            : 'auto';
      await runWithErrorHandling(() =>
        runLogin({
          mode,
          clientId: root.clientId,
          clientSecret: root.clientSecret,
          token: cmdOpts.token,
          skipDisclaimer: Boolean(cmdOpts.yes),
        }),
      );
    });

  program
    .command('logout')
    .description('退出登录,删除当前 profile 的 token')
    .action(async () => {
      await runWithErrorHandling(cmdLogout);
    });

  program
    .command('profile')
    .description('管理多账号 profile')
    .option('--list', '列出所有 profile(默认行为)')
    .option('--switch <name>', '切换到指定 profile')
    .option('--add <name>', '添加新 profile')
    .option('--remove <name>', '删除 profile 及其 token')
    .action(async (cmdOpts) => {
      await runWithErrorHandling(() => cmdProfile(cmdOpts));
    });

  program
    .command('status')
    .description('显示当前登录账号、配额、scope、token 过期时间')
    .action(async () => {
      const root = program.opts<GlobalLikeOpts>();
      await runWithErrorHandling(() => cmdStatus(root));
    });

  program
    .command('scope [mode]')
    .description('查看或切换作用域(sandbox / full)。无参数等同于 --print')
    .option('--print', '仅打印当前 scope')
    .option('--app-name <name>', '设置沙盒模式下的应用名(=沙盒根 /apps/<name>/)')
    .action(async (mode: string | undefined, cmdOpts: { print?: boolean; appName?: string }) => {
      await runWithErrorHandling(() => cmdScope(mode, cmdOpts));
    });

  program
    .command('ls <path>')
    .description('列目录(沙盒模式下 path 必须以 /apps/<your-app>/ 开头)')
    .option('--limit <n>', '单页上限(默认 1000,API 上限 1000)', '1000')
    .option('--all', '自动翻页拉全部(大目录慎用)')
    .option('--recursive', '递归列出子目录下所有文件')
    .option('--json', '输出 JSON,便于脚本消费')
    .option('--desc', '倒序排列')
    .option('--order <field>', '排序字段:name | time | size', 'time')
    .option('--folder', '仅显示子目录')
    .action(async (path: string, cmdOpts) => {
      const root = program.opts<GlobalLikeOpts>();
      await runWithErrorHandling(() =>
        cmdLs(path, { ...cmdOpts, clientId: root.clientId, clientSecret: root.clientSecret }),
      );
    });

  program
    .command('mkdir <path>')
    .description('新建目录(已存在视为成功,幂等)')
    .action(async (path: string) => {
      const root = program.opts<GlobalLikeOpts>();
      await runWithErrorHandling(() => cmdMkdir(path, root));
    });

  program
    .command('upload <local> <remote>')
    .description('上传本地文件到网盘(自动分片、断点续传、秒传)')
    .option('--no-resume', '关闭断点续传,每次都从头上传')
    .option('--rtype <n>', '冲突策略:0=报错 1=重命名(默认) 2=同大小秒传 3=覆盖', '1')
    .action(async (local: string, remote: string, cmdOpts) => {
      const root = program.opts<GlobalLikeOpts>();
      await runWithErrorHandling(() =>
        cmdUpload(local, remote, { ...cmdOpts, clientId: root.clientId, clientSecret: root.clientSecret }),
      );
    });

  program
    .command('download <remote> <local>')
    .description('下载网盘文件到本地(>50MB 自动分片并发)')
    .action(async (remote: string, local: string) => {
      const root = program.opts<GlobalLikeOpts>();
      await runWithErrorHandling(() => cmdDownload(remote, local, root));
    });

  program
    .command('rm <path...>')
    .description('删除文件/目录(默认软删除到 .trash;--hard 永久删除)')
    .option('--hard', '永久删除(走四级保护,逐字确认「我确认永久删除」)')
    .option('--yes', '非 Agent 环境下跳过 L3/L4 确认(仍列出范围)')
    .action(async (paths: string[], cmdOpts: { hard?: boolean; yes?: boolean }) => {
      const root = program.opts<GlobalLikeOpts>();
      await runWithErrorHandling(() =>
        cmdRm(paths, { ...cmdOpts, clientId: root.clientId, clientSecret: root.clientSecret }),
      );
    });

  program
    .command('search <keyword>')
    .description('搜索网盘文件/目录')
    .option('--category <n>', '分类过滤:1=视频 2=音频 3=图片 4=文档 5=应用 6=其他 7=种子(语义搜索支持多选,逗号分隔)')
    .option('--dir <path>', '限定搜索起始目录')
    .option('--json', '输出 JSON')
    .option('--semantic', '使用语义搜索(自然语言查询)')
    .option('--auto', '自动判断搜索方式(5字以上语义,5字及以下关键词)')
    .action(async (keyword: string, cmdOpts) => {
      const root = program.opts<GlobalLikeOpts>();
      await runWithErrorHandling(() =>
        cmdSearch(keyword, { ...cmdOpts, clientId: root.clientId, clientSecret: root.clientSecret }),
      );
    });

  program
    .command('mv <src> <dst>')
    .description('移动文件/目录')
    .option('--overwrite', '覆盖同名文件(默认重命名加后缀)')
    .action(async (src: string, dst: string, cmdOpts) => {
      const root = program.opts<GlobalLikeOpts>();
      await runWithErrorHandling(() =>
        cmdMv(src, dst, { ...cmdOpts, clientId: root.clientId, clientSecret: root.clientSecret }),
      );
    });

  program
    .command('cp <src> <dst>')
    .description('复制文件/目录')
    .option('--overwrite', '覆盖同名文件(默认重命名加后缀)')
    .action(async (src: string, dst: string, cmdOpts) => {
      const root = program.opts<GlobalLikeOpts>();
      await runWithErrorHandling(() =>
        cmdCp(src, dst, { ...cmdOpts, clientId: root.clientId, clientSecret: root.clientSecret }),
      );
    });

  program
    .command('rename <path> <newname>')
    .description('重命名文件/目录')
    .action(async (path: string, newname: string) => {
      const root = program.opts<GlobalLikeOpts>();
      await runWithErrorHandling(() => cmdRename(path, newname, root));
    });

  program
    .command('share <path>')
    .description('创建分享链接')
    .option('--pwd <pwd>', '4位分享密码')
    .option('--days <n>', '有效期天数(0=永久)')
    .option('--json', '输出 JSON')
    .action(async (path: string, cmdOpts) => {
      const root = program.opts<GlobalLikeOpts>();
      await runWithErrorHandling(() =>
        cmdShare(path, { ...cmdOpts, clientId: root.clientId, clientSecret: root.clientSecret }),
      );
    });

  program
    .command('transfer <destPath>')
    .description('转存他人分享到自己网盘')
    .requiredOption('--shareid <id>', '分享 ID')
    .requiredOption('--uk <uk>', '分享者 uk')
    .option('--pwd <pwd>', '分享密码(私密分享必填)')
    .option('--fsids <ids>', '要转存的文件 fs_id 列表,逗号分隔(不传则全部)')
    .action(async (destPath: string, cmdOpts) => {
      const root = program.opts<GlobalLikeOpts>();
      await runWithErrorHandling(() =>
        cmdTransfer(destPath, { ...cmdOpts, clientId: root.clientId, clientSecret: root.clientSecret }),
      );
    });

  program
    .command('category <type>')
    .description('按分类列出文件:doc | image | video | bt')
    .option('--dir <path>', '起始目录')
    .option('--json', '输出 JSON')
    .option('--desc', '倒序排列(默认)')
    .option('--order <field>', '排序字段:name | time | size', 'time')
    .action(async (type: string, cmdOpts) => {
      const root = program.opts<GlobalLikeOpts>();
      await runWithErrorHandling(() =>
        cmdCategory(type, { ...cmdOpts, clientId: root.clientId, clientSecret: root.clientSecret }),
      );
    });

  program
    .command('trash')
    .description('管理 .trash 回收站')
    .option('--gc', '清理超过保留期的项目')
    .option('--restore <path>', '从 .trash 恢复文件/目录')
    .option('--to <path>', '恢复的目标路径(默认 scope 根目录)')
    .option('--list', '列出 .trash 内容(默认行为)')
    .action(async (cmdOpts) => {
      const root = program.opts<GlobalLikeOpts>();
      await runWithErrorHandling(() =>
        cmdTrash({ ...cmdOpts, clientId: root.clientId, clientSecret: root.clientSecret }),
      );
    });

  program
    .command('task <taskid>')
    .description('查询异步任务状态')
    .option('--poll', '轮询直到任务完成(约2秒/次,最多2分钟)')
    .action(async (taskid: string, cmdOpts) => {
      const root = program.opts<GlobalLikeOpts>();
      await runWithErrorHandling(() =>
        cmdTask(taskid, { ...cmdOpts, clientId: root.clientId, clientSecret: root.clientSecret }),
      );
    });

  // commander 默认在没传子命令时打印帮助并退出 0;保留默认行为。
  program.showHelpAfterError(color.dim('(运行 pan.cjs --help 查看可用命令)'));

  program.parseAsync(process.argv).catch((e) => {
    logError(formatError(e));
    exit(1);
  });
}

main();
