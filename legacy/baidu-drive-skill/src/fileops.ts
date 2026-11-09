/**
 * 文件操作 —— Week 1 ls / mkdir / 用户信息;Week 2 加 softRm / hardRm,
 * 余下 mv / cp / rename / search 在 Week 3。
 */

import { ENDPOINTS, xpanGet, xpanPostForm, xpanPostJson } from './client.js';
import { assertInScope, getSandboxRoot, getScopeRoot, normalizePath } from './scope.js';
import { BaiduError } from './errors.js';
import type { ConfigFile } from './config.js';
import type { CredentialsOpts } from './auth.js';
import type { XpanResponse } from './client.js';

// ---------- types ----------

export interface FileEntry {
  fs_id: number;
  path: string; // 中文展示路径,如 "我的应用数据/myapp/foo.txt"
  server_filename: string;
  size: number;
  isdir: 0 | 1; // 百度返回的就是 0/1
  category?: number;
  md5?: string;
  server_mtime: number; // unix seconds
  server_ctime: number;
  local_mtime?: number;
  local_ctime?: number;
}

export interface ListResponse extends XpanResponse {
  list?: FileEntry[];
  has_more?: 0 | 1;
}

export interface SearchResponse extends XpanResponse {
  list?: FileEntry[];
  has_more?: number;
  cursor?: string;
}

export interface UserInfo {
  baidu_name?: string;
  netdisk_name?: string;
  avatar_url?: string;
  vip_type?: number;
  uk?: number;
}

export interface UserInfoResponse extends XpanResponse {
  baidu_name?: string;
  netdisk_name?: string;
  avatar_url?: string;
  vip_type?: number;
  uk?: number;
}

export interface QuotaResponse extends XpanResponse {
  total?: number;
  used?: number;
  free?: number;
  expire?: boolean;
}

// ---------- ls ----------

export interface LsOptions {
  /** 排序字段:name | time | size。默认 time。 */
  order?: 'name' | 'time' | 'size';
  /** 是否倒序。默认 false。 */
  desc?: boolean;
  /** 仅返回文件夹。 */
  folderOnly?: boolean;
  /** 分页起点,默认 0。 */
  start?: number;
  /** 单次返回上限,默认 1000(API 上限)。 */
  limit?: number;
  /** 是否用 web 端展示路径(中文)。默认 true。 */
  webFormat?: boolean;
  /** 是否查询子目录。0 = 不递归(默认),1 = 递归。 */
  recursion?: 0 | 1;
}

export async function ls(
  cfg: ConfigFile,
  rawPath: string,
  opts: LsOptions = {},
  creds?: CredentialsOpts,
): Promise<FileEntry[]> {
  const dir = assertInScope(rawPath, cfg);
  const params: Record<string, string | number | undefined> = {
    dir,
    order: opts.order ?? 'time',
    desc: opts.desc ? 1 : 0,
    folder: opts.folderOnly ? 1 : 0,
    start: opts.start ?? 0,
    limit: opts.limit ?? 1000,
    web: opts.webFormat === false ? 0 : 1,
  };
  if (opts.recursion === 1) params.recursion = 1;
  try {
    const res = await xpanGet<ListResponse>(cfg, ENDPOINTS.fileList, params, {}, creds);
    return res.list ?? [];
  } catch (e) {
    // 沙盒根目录在新注册自有应用上是「懒创建」的:百度后端不会预先建好
    // /apps/<appName>/,首次任意写入(mkdir/upload)才触发。这种情况下
    // ls 撞 errno=-9 的「文件不存在」对用户极易误导(以为 appName 配错),
    // 因此对「沙盒模式 + 路径恰好是沙盒根 + errno=-9」给一条专用提示。
    if (
      e instanceof BaiduError &&
      e.errno === -9 &&
      cfg.scope === 'sandbox' &&
      dir === getSandboxRoot(cfg)
    ) {
      throw new BaiduError(
        -9,
        `沙盒根目录 ${dir}/ 在百度网盘后端尚未创建。\n这是新注册自有应用的常见现象 —— 后端不会预先建好,首次任意写入操作即可触发懒创建。\n例如:  pan.cjs mkdir ${dir}/uploads/`,
        { endpoint: e.endpoint, raw: e.raw },
      );
    }
    throw e;
  }
}

/**
 * 自动翻页 ls,适合大目录。每页 1000 条,直到没有更多。
 */
export async function lsAll(
  cfg: ConfigFile,
  rawPath: string,
  opts: Omit<LsOptions, 'start' | 'limit'> = {},
  creds?: CredentialsOpts,
): Promise<FileEntry[]> {
  const all: FileEntry[] = [];
  let start = 0;
  const limit = 1000;
  for (;;) {
    const page = await ls(cfg, rawPath, { ...opts, start, limit }, creds);
    all.push(...page);
    if (page.length < limit) break;
    start += limit;
    if (start > 100000) break; // 安全上限
  }
  return all;
}

// ---------- recursive list (listall) ----------

export interface ListallResponse extends XpanResponse {
  list?: FileEntry[];
  has_more?: 0 | 1;
  cursor?: number;
}

export interface ListallOptions {
  /** 排序字段:time(修改时间) | name(文件名) | size(大小)。默认 time。 */
  order?: 'time' | 'name' | 'size';
  /** 是否倒序。默认 false。 */
  desc?: boolean;
  /** 分页起点(cursor),默认 0。 */
  start?: number;
  /** 单次返回上限,默认 1000(API 上限)。 */
  limit?: number;
  /** 仅返回上传时间大于 ctime 的文件。 */
  ctime?: number;
  /** 仅返回修改时间大于 mtime 的文件。 */
  mtime?: number;
  /** 为 1 时返回缩略图地址。 */
  web?: 0 | 1;
}

/**
 * 递归获取指定目录下的文件列表。
 * 与 `ls` 不同:支持 recursion=1 遍历子目录,分页使用 cursor 而非 start。
 *
 * 端点: GET /rest/2.0/xpan/multimedia?method=listall
 */
export async function listRecursive(
  cfg: ConfigFile,
  rawPath: string,
  opts: ListallOptions = {},
  creds?: CredentialsOpts,
): Promise<FileEntry[]> {
  const dir = assertInScope(rawPath, cfg);
  const all: FileEntry[] = [];
  let cursor = opts.start ?? 0;
  const limit = Math.min(1000, opts.limit ?? 1000);

  for (;;) {
    const params: Record<string, string | number | undefined> = {
      path: dir,
      recursion: 1,
      order: opts.order ?? 'time',
      desc: opts.desc ? 1 : 0,
      start: cursor,
      limit,
      web: opts.web ?? 0,
    };
    if (opts.ctime !== undefined) params.ctime = opts.ctime;
    if (opts.mtime !== undefined) params.mtime = opts.mtime;

    const res = await xpanGet<ListallResponse>(cfg, ENDPOINTS.listall, params, {}, creds);
    const page = res.list ?? [];
    all.push(...page);

    if (res.has_more !== 1) break;
    cursor = res.cursor ?? (cursor + page.length);
    if (all.length > 100000) break; // 安全上限
  }
  return all;
}

// ---------- mkdir ----------

export interface MkdirResponse extends XpanResponse {
  fs_id?: number;
  path?: string;
  ctime?: number;
  mtime?: number;
  isdir?: number;
}

/**
 * 创建一个目录。等同于 xpanfilecreate(isdir=1, size=0, block_list='[]')。
 * - 已存在(errno=10/-8/31075)走幂等返回,不抛错(用 `force` 行为也由调用方决定)。
 */
export async function mkdir(
  cfg: ConfigFile,
  rawPath: string,
  opts: { idempotent?: boolean } = {},
  creds?: CredentialsOpts,
): Promise<MkdirResponse> {
  const path = assertInScope(rawPath, cfg);
  try {
    return await xpanPostForm<MkdirResponse>(
      cfg,
      ENDPOINTS.fileCreate,
      {
        path,
        isdir: 1,
        size: 0,
        uploadid: '',
        block_list: '[]',
        rtype: 0,
      },
      {},
      {},
      creds,
    );
  } catch (e: unknown) {
    if (
      opts.idempotent !== false &&
      isExistsError(e)
    ) {
      return { errno: 0, path, isdir: 1 };
    }
    throw e;
  }
}

function isExistsError(e: unknown): boolean {
  if (typeof e !== 'object' || e === null) return false;
  const errno = (e as { errno?: unknown }).errno;
  return errno === 10 || errno === -8 || errno === 31075;
}

// ---------- user info & quota ----------

export async function getUserInfo(cfg: ConfigFile, creds?: CredentialsOpts): Promise<UserInfo> {
  const res = await xpanGet<UserInfoResponse>(cfg, ENDPOINTS.uinfo, {}, {}, creds);
  return {
    baidu_name: res.baidu_name,
    netdisk_name: res.netdisk_name,
    avatar_url: res.avatar_url,
    vip_type: res.vip_type,
    uk: res.uk,
  };
}

export async function getQuota(cfg: ConfigFile, creds?: CredentialsOpts): Promise<QuotaResponse> {
  // /api/quota 略有不同:不含 ?method=,access_token 直接附加,checkfree=1&checkexpire=1
  return xpanGet<QuotaResponse>(
    cfg,
    `${ENDPOINTS.quota}?checkfree=1&checkexpire=1`,
    {},
    {},
    creds,
  );
}

// ---------- 单文件信息(给 download 选策略用,Week 2 也会用到) ----------

export interface FileMeta {
  fs_id: number;
  path: string;
  server_filename: string;
  size: number;
  isdir: 0 | 1;
  md5?: string;
  dlink?: string;
  server_mtime: number;
}

export interface FilemetasResponse extends XpanResponse {
  list?: FileMeta[];
}

/**
 * 通过 fs_id 拉文件元数据,可选返回 dlink。
 * 主要给 Week 2 的 download 用,Week 1 顺手暴露。
 */
export async function filemetas(
  cfg: ConfigFile,
  fs_ids: number[],
  withDlink = false,
  creds?: CredentialsOpts,
): Promise<FileMeta[]> {
  const res = await xpanGet<FilemetasResponse>(
    cfg,
    ENDPOINTS.fileFilemetas,
    {
      fsids: JSON.stringify(fs_ids),
      dlink: withDlink ? 1 : 0,
      thumb: 0,
      extra: 0,
    },
    {},
    creds,
  );
  return res.list ?? [];
}

/**
 * 给定路径,返回 fs_id(从父目录 ls 中匹配)。找不到返回 null。
 * 适用场景:用户给路径,我们要 fs_id 用 filemetas / 删除等。
 */
export async function statByPath(
  cfg: ConfigFile,
  rawPath: string,
  creds?: CredentialsOpts,
): Promise<FileEntry | null> {
  const path = assertInScope(rawPath, cfg);
  const lastSlash = path.lastIndexOf('/');
  if (lastSlash < 0) return null;
  const parent = lastSlash === 0 ? '/' : path.slice(0, lastSlash);
  const name = path.slice(lastSlash + 1);
  // 父目录可能也越界(理论上不该,assertInScope 已经保证 path 在 scope 内,
  // parent 必然也在),所以再调一次 ls
  const entries = await lsAll(cfg, parent, {}, creds);
  for (const e of entries) {
    if (e.server_filename === name) return e;
  }
  return null;
}

// ---------- 分类列表(doclist / imagelist / videolist / btlist) ----------

export type CategoryListType = 'doc' | 'image' | 'video' | 'bt';

const CATEGORY_ENDPOINTS: Record<CategoryListType, string> = {
  doc: ENDPOINTS.fileDoclist,
  image: ENDPOINTS.fileImagelist,
  video: ENDPOINTS.fileVideolist,
  bt: ENDPOINTS.fileBtlist,
};

export interface CategoryListOptions {
  /** 起始目录,默认根目录。 */
  dir?: string;
  /** 排序字段。默认 time。 */
  order?: 'name' | 'time' | 'size';
  /** 是否倒序。默认 true(最新的在前)。 */
  desc?: boolean;
  /** 分页起点,默认 0。 */
  start?: number;
  /** 每页数量,默认 100,最大 1000。 */
  limit?: number;
  /** 是否只显示回收站内容。默认 false。 */
  recycle?: boolean;
}

export interface CategoryListResponse extends XpanResponse {
  list?: FileEntry[];
}

/**
 * 按分类列出文件:doc(文档) / image(图片) / video(视频) / bt(种子)。
 */
export async function categoryList(
  cfg: ConfigFile,
  type: CategoryListType,
  opts: CategoryListOptions = {},
  creds?: CredentialsOpts,
): Promise<FileEntry[]> {
  const endpoint = CATEGORY_ENDPOINTS[type];
  const params: Record<string, string | number | undefined> = {
    dir: opts.dir ?? '/',
    order: opts.order ?? 'time',
    desc: opts.desc !== false ? 1 : 0,
    start: opts.start ?? 0,
    limit: Math.min(1000, opts.limit ?? 100),
    web: 1,
  };
  if (opts.recycle) params.recycle = 1;
  const res = await xpanGet<CategoryListResponse>(cfg, endpoint, params, {}, creds);
  return res.list ?? [];
}

// ---------- 内部:把命令行用户输入路径标准化(展示一致性) ----------

export function displayablePath(rawPath: string): string {
  return normalizePath(rawPath);
}

// ---------- search ----------

export interface SearchOptions {
  /** 搜索关键词 */
  key: string;
  /** 搜索起始目录,默认根目录。 */
  dir?: string;
  /** 分类过滤:1=视频 2=音频 3=图片 4=文档 5=应用 6=其他 7=种子 */
  category?: number;
  /** 是否递归子目录,默认 true。 */
  recursion?: boolean;
  /** 分页起点 */
  page?: number;
  /** 每页数量,默认 100,最大 1000 */
  num?: number;
}

export interface SearchResult {
  list: FileEntry[];
  hasMore: boolean;
}

/**
 * 搜索网盘文件/目录。
 * category 含义:
 *   1=视频 2=音频 3=图片 4=文档 5=应用 6=其他 7=种子
 */
export async function search(
  cfg: ConfigFile,
  opts: SearchOptions,
  creds?: CredentialsOpts,
): Promise<SearchResult> {
  const params: Record<string, string | number | undefined> = {
    key: opts.key,
    dir: opts.dir ?? '/',
    page: opts.page ?? 1,
    num: Math.min(1000, opts.num ?? 100),
    web: 1,
  };
  if (opts.category !== undefined && opts.category > 0 && opts.category <= 7) {
    params.category = opts.category;
  }
  if (opts.recursion !== false) {
    params.recursion = 1;
  }
  const res = await xpanGet<SearchResponse>(cfg, ENDPOINTS.fileSearch, params, {}, creds);
  return {
    list: res.list ?? [],
    hasMore: (res.has_more ?? 0) === 1,
  };
}

/** category 数字 → 中文名映射(用于 CLI 展示) */
export const CATEGORY_NAMES: Record<number, string> = {
  1: '视频',
  2: '音频',
  3: '图片',
  4: '文档',
  5: '应用',
  6: '其他',
  7: '种子',
};

// ---------- semantic search ----------

export interface SemanticSearchResultItem {
  category: string; // "1"-"7"
  filename: string;
  fsid: number;
  isdir: number; // 0-否,1-是
  parent_path: string;
  path: string;
  content?: string; // 语义向量召回的文本段落
  pid?: number;
  ocr?: string; // 图片ocr原始文本
  server_ctime: number;
  server_mtime: number;
  size: number;
}

export interface SemanticSearchResponse extends XpanResponse {
  list?: SemanticSearchResultItem[];
}

export interface SemanticSearchOptions {
  /** 搜索 query */
  query: string;
  /** 指定路径搜索,默认根目录 "/" */
  dir?: string;
  /** 分类过滤:1=视频 2=音频 3=图片 4=文档 5=应用 6=其他 7=种子 */
  category?: number[];
  /** 搜索返回的最大数量,默认 500 */
  num?: number;
  /** 搜索方式:0=简单搜索 1=语义搜索 2=自动(5字以上语义,5字及以下简单) */
  searchType?: 0 | 1 | 2;
  /** 搜索来源,为空时按 search_type 自动默认 */
  sources?: number[];
}

/**
 * 语义搜索 —— 支持自然语言查询的文件搜索能力。
 *
 * 端点: POST /xpan/unisearch
 * 请求体: application/json
 * scene 固定为 "mcpserver"
 *
 * searchType 说明:
 *   0 = 简单搜索(query 为关键词)
 *   1 = 语义搜索(query 为复杂自然语言描述)
 *   2 = 自动(5字以上走语义,5字及以下走简单)
 */
export async function semanticSearch(
  cfg: ConfigFile,
  opts: SemanticSearchOptions,
  creds?: CredentialsOpts,
): Promise<SemanticSearchResultItem[]> {
  const body: Record<string, unknown> = {
    scene: 'mcpserver',
    query: opts.query,
    data: {},
  };
  if (opts.dir) body.dir = [opts.dir];
  if (opts.category && opts.category.length > 0) body.category = opts.category;
  if (opts.num !== undefined) body.num = opts.num;
  if (opts.searchType !== undefined) body.search_type = opts.searchType;
  if (opts.sources && opts.sources.length > 0) body.sources = opts.sources;

  const res = await xpanPostJson<SemanticSearchResponse>(
    cfg,
    ENDPOINTS.unisearch,
    body,
    {},
    {},
    creds,
  );
  return res.list ?? [];
}

// ---------- filemanager:move / copy / rename / delete 共用响应类型 ----------

export interface FilemanagerInfo {
  errno?: number;
  /** move/copy 后落点的实际路径(若同名冲突 + ondup=newcopy 会带 _N 后缀)。 */
  path?: string;
  /** 部分接口返回的源路径回显。 */
  src?: string;
  /** 异步任务 id(async=1 时)。 */
  taskid?: number;
}

export interface FilemanagerResponse extends XpanResponse {
  info?: FilemanagerInfo[];
  taskid?: number;
}

// ---------- move / copy / rename ----------

export interface MoveCopyOptions {
  /** 同名冲突策略:newcopy(默认加 _N 后缀) / overwrite / fail */
  ondup?: 'newcopy' | 'overwrite' | 'fail';
}

function ondupValue(v?: string): string {
  if (v === 'overwrite') return 'overwrite';
  if (v === 'fail') return 'fail';
  return 'newcopy';
}

/**
 * 移动文件/目录。
 * - 跨目录移动:path → dest/newname
 * - 同目录改名:path → parent/newname(此时 dest=parent)
 */
export async function move(
  cfg: ConfigFile,
  rawSrc: string,
  rawDst: string,
  opts: MoveCopyOptions = {},
  creds?: CredentialsOpts,
): Promise<FilemanagerInfo[]> {
  const src = assertInScope(rawSrc, cfg);
  const dst = assertInScope(rawDst, cfg);

  const lastSlash = src.lastIndexOf('/');
  const name = lastSlash >= 0 ? src.slice(lastSlash + 1) : src;

  // dst 如果以 / 结尾,视为目录;否则视为完整目标路径
  const destDir = dst.endsWith('/') ? dst : dst.slice(0, dst.lastIndexOf('/') + 1) || '/';
  const newname = dst.endsWith('/') ? name : dst.slice(dst.lastIndexOf('/') + 1);

  const res = await xpanPostForm<FilemanagerResponse>(
    cfg,
    ENDPOINTS.fileManager,
    {
      filelist: JSON.stringify([
        { path: src, dest: destDir, newname, ondup: ondupValue(opts.ondup) },
      ]),
    },
    { opera: 'move', async: 0 },
    {},
    creds,
  );
  return res.info ?? [];
}

/**
 * 复制文件/目录。
 */
export async function copy(
  cfg: ConfigFile,
  rawSrc: string,
  rawDst: string,
  opts: MoveCopyOptions = {},
  creds?: CredentialsOpts,
): Promise<FilemanagerInfo[]> {
  const src = assertInScope(rawSrc, cfg);
  const dst = assertInScope(rawDst, cfg);

  const lastSlash = src.lastIndexOf('/');
  const name = lastSlash >= 0 ? src.slice(lastSlash + 1) : src;

  const destDir = dst.endsWith('/') ? dst : dst.slice(0, dst.lastIndexOf('/') + 1) || '/';
  const newname = dst.endsWith('/') ? name : dst.slice(dst.lastIndexOf('/') + 1);

  const res = await xpanPostForm<FilemanagerResponse>(
    cfg,
    ENDPOINTS.fileManager,
    {
      filelist: JSON.stringify([
        { path: src, dest: destDir, newname, ondup: ondupValue(opts.ondup) },
      ]),
    },
    { opera: 'copy', async: 0 },
    {},
    creds,
  );
  return res.info ?? [];
}

/**
 * 重命名(同目录改名)。
 * 等价于 move(src, parentDir/newname)。
 */
export async function rename(
  cfg: ConfigFile,
  rawPath: string,
  newName: string,
  creds?: CredentialsOpts,
): Promise<FilemanagerInfo[]> {
  const path = assertInScope(rawPath, cfg);
  const lastSlash = path.lastIndexOf('/');
  const parent = lastSlash >= 0 ? path.slice(0, lastSlash + 1) || '/' : '/';
  return move(cfg, path, parent + newName, {}, creds);
}

// ---------- softRm / hardRm ----------

export interface SoftRmResult {
  src: string;
  /** 目标 .trash 子目录(YYYY-MM-DD)。 */
  trashDir: string;
  /** 实际落点路径(冲突时百度会加 _N 后缀)。 */
  movedAs: string;
}

/**
 * 软删除:把目标 mv 到 `<scopeRoot>/.trash/<YYYY-MM-DD>/`。
 *
 * - 沙盒模式 → `<scopeRoot> = /apps/<appName>`
 * - full 模式 + 单白名单 → `<scopeRoot> = allowedPaths[0]`
 * - full 模式 + 全开 → 拒绝(无明确 trash 根,需用户先 `pan.cjs scope` 设置一个)
 *
 * 同名冲突时百度自动加 `_N` 后缀(ondup=newcopy)。
 */
export async function softRm(
  cfg: ConfigFile,
  rawPath: string,
  creds?: CredentialsOpts,
): Promise<SoftRmResult> {
  const path = assertInScope(rawPath, cfg);
  const root = getScopeRoot(cfg);
  if (root === '/') {
    throw new Error(
      'full 模式且无 allowedPaths 时,没有明确的 .trash 根目录。请先 `pan.cjs scope` 配置 allowedPaths,或显式 `pan.cjs rm --hard`。',
    );
  }
  if (path === root) {
    throw new Error(`不能删除当前 scope 的根目录:${path}`);
  }
  if (path.startsWith(`${root}/.trash/`) || path === `${root}/.trash`) {
    throw new Error(
      `${path} 已经位于 .trash 中。如要彻底清理,请用 \`pan.cjs trash --gc\`(Week 3)或 \`pan.cjs rm --hard\`。`,
    );
  }

  const date = new Date().toISOString().slice(0, 10);
  const trashDir = `${root}/.trash/${date}`;
  await mkdir(cfg, trashDir, { idempotent: true }, creds);

  const lastSlash = path.lastIndexOf('/');
  const name = lastSlash >= 0 ? path.slice(lastSlash + 1) : path;

  const res = await xpanPostForm<FilemanagerResponse>(
    cfg,
    ENDPOINTS.fileManager,
    {
      filelist: JSON.stringify([
        { path, dest: trashDir, newname: name, ondup: 'newcopy' },
      ]),
    },
    { opera: 'move', async: 0 },
    {},
    creds,
  );

  const movedAs = res.info?.[0]?.path ?? `${trashDir}/${name}`;
  return { src: path, trashDir, movedAs };
}

/**
 * 硬删除(永久)—— **裸调 OpenAPI 删除接口**,不带任何防护。
 * 调用方必须先通过 `delete-policy.ts` 的四级保护守卫。
 */
export async function hardRm(
  cfg: ConfigFile,
  rawPaths: string[],
  creds?: CredentialsOpts,
): Promise<FilemanagerResponse> {
  if (rawPaths.length === 0) {
    throw new Error('hardRm 调用时 rawPaths 为空');
  }
  const normalized = rawPaths.map((p) => assertInScope(p, cfg));
  return xpanPostForm<FilemanagerResponse>(
    cfg,
    ENDPOINTS.fileManager,
    { filelist: JSON.stringify(normalized) },
    { opera: 'delete', async: 0 },
    {},
    creds,
  );
}

// ---------- async task polling ----------

export interface QueryTaskResponse extends XpanResponse {
  status?: number; // 0=完成 1=进行中 2=失败
  task_errno?: number;
  list?: Array<{
    result?: number;
    path?: string;
    from?: string;
    to?: string;
  }>;
}

/**
 * 查询异步任务状态。
 * - status=0: 任务完成
 * - status=1: 任务进行中
 * - status=2: 任务失败
 */
export async function queryTask(
  cfg: ConfigFile,
  taskid: number,
  creds?: CredentialsOpts,
): Promise<QueryTaskResponse> {
  return xpanGet<QueryTaskResponse>(
    cfg,
    ENDPOINTS.queryTask,
    { taskid, op_type: 1 },
    {},
    creds,
  );
}

/**
 * 轮询异步任务直到完成或超时。
 * - 间隔 2 秒轮询一次
 * - 最多 60 次(约 2 分钟)
 */
export async function pollTask(
  cfg: ConfigFile,
  taskid: number,
  creds?: CredentialsOpts,
  onProgress?: (status: number, retry: number) => void,
): Promise<QueryTaskResponse> {
  const MAX_RETRIES = 60;
  const INTERVAL_MS = 2000;
  for (let i = 0; i < MAX_RETRIES; i++) {
    const res = await queryTask(cfg, taskid, creds);
    onProgress?.(res.status ?? -1, i + 1);
    if (res.status === 0 || res.status === 2) {
      return res;
    }
    await new Promise((r) => setTimeout(r, INTERVAL_MS));
  }
  throw new Error(`异步任务轮询超时(taskid=${taskid}),请稍后手动查询。`);
}
