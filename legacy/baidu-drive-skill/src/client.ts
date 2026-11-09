/**
 * 百度网盘 OpenAPI fetch 封装。
 *
 * 关键约束:
 * - access_token **必须**作为 query 参数传递,不要用 Authorization 头(百度 OpenAPI 规范如此)
 * - HTTP 200 响应里 `errno != 0` 是百度的常见错误模式,必须双重校验
 * - 频控错误(31034/31399/42214/HTTP 429/5xx)走指数退避,最多 4 次
 * - 上传走 d.pcs.baidu.com,下载 dlink 走 d.pcs.baidu.com 也需要 `User-Agent: pan.baidu.com`
 */

import { BaiduError, HttpError, mapErrno } from './errors.js';
import { getAccessToken } from './auth.js';
import type { ConfigFile } from './config.js';
import type { CredentialsOpts } from './auth.js';

// ---------- endpoints ----------

const HOST_XPAN = 'https://pan.baidu.com';
const HOST_PCS_UPLOAD = 'https://d.pcs.baidu.com';
const DEFAULT_UA = 'baidu-drive-pro/0.0.1-alpha';
const DLINK_UA = 'pan.baidu.com'; // 百度规定下载必须用这个 UA,否则 403

export const ENDPOINTS = {
  fileList: '/rest/2.0/xpan/file?method=list',
  fileSearch: '/rest/2.0/xpan/file?method=search',
  fileFilemetas: '/rest/2.0/xpan/multimedia?method=filemetas',
  filePrecreate: '/rest/2.0/xpan/file?method=precreate',
  fileCreate: '/rest/2.0/xpan/file?method=create',
  fileManager: '/rest/2.0/xpan/file?method=filemanager',
  fileDoclist: '/rest/2.0/xpan/file?method=doclist',
  fileImagelist: '/rest/2.0/xpan/file?method=imagelist',
  fileVideolist: '/rest/2.0/xpan/file?method=videolist',
  fileBtlist: '/rest/2.0/xpan/file?method=btlist',
  queryTask: '/rest/2.0/xpan/file?method=query_task',
  shareSet: '/rest/2.0/xpan/share?method=set',
  shareTransfer: '/rest/2.0/xpan/share?method=transfer',
  uinfo: '/rest/2.0/xpan/nas?method=uinfo',
  quota: '/api/quota',
  pcsSuperfile: '/rest/2.0/pcs/superfile2',
  listall: '/rest/2.0/xpan/multimedia?method=listall',
  unisearch: '/xpan/unisearch',
};

// ---------- backoff ----------

const RETRY_HTTP_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);
const RETRY_ERRNOS = new Set([31034, 31399, 42214]);
const MAX_RETRIES = 4;
const BASE_BACKOFF_MS = 500;

interface BackoffOpts {
  maxRetries?: number;
  baseDelayMs?: number;
  shouldRetry?: (err: unknown) => boolean;
}

export function isRetryableError(err: unknown): boolean {
  if (err instanceof HttpError && RETRY_HTTP_STATUSES.has(err.status)) return true;
  if (err instanceof BaiduError && RETRY_ERRNOS.has(err.errno)) return true;
  if (err instanceof Error && /ETIMEDOUT|ECONNRESET|ENETUNREACH|ENOTFOUND|EAI_AGAIN|fetch failed/i.test(err.message)) {
    return true;
  }
  return false;
}

export async function withBackoff<T>(
  fn: () => Promise<T>,
  opts: BackoffOpts = {},
): Promise<T> {
  const max = opts.maxRetries ?? MAX_RETRIES;
  const base = opts.baseDelayMs ?? BASE_BACKOFF_MS;
  const shouldRetry = opts.shouldRetry ?? isRetryableError;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= max; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (attempt === max || !shouldRetry(e)) throw e;
      const jitter = Math.random() * base;
      const delay = base * Math.pow(2, attempt) + jitter;
      await sleep(delay);
    }
  }
  throw lastErr;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------- 双错误检查 ----------

export interface XpanResponse {
  errno?: number;
  errmsg?: string;
  request_id?: string | number;
  [k: string]: unknown;
}

function buildXpanError(
  body: XpanResponse,
  endpoint: string,
): BaiduError | null {
  const errno = body.errno;
  if (typeof errno !== 'number' || errno === 0) return null;
  const msg = mapErrno(errno, body.errmsg);
  return new BaiduError(errno, msg, { endpoint, raw: body });
}

async function readJson<T>(res: Response, endpoint: string): Promise<T> {
  if (!res.ok) {
    let body = '';
    try {
      body = await res.text();
    } catch {
      /* ignore */
    }
    throw new HttpError(res.status, endpoint, `${endpoint} HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  let json: unknown;
  try {
    json = await res.json();
  } catch (e) {
    throw new HttpError(res.status, endpoint, `${endpoint} 响应不是合法 JSON: ${(e as Error).message}`);
  }
  return json as T;
}

// ---------- core: GET / POST ----------

export interface ClientCallOpts {
  /** 不参与重试时设置 */
  noRetry?: boolean;
  /** 透传给 fetch 的 AbortSignal */
  signal?: AbortSignal;
  /** 跳过 token,通常用于鉴权前的 ping */
  skipAuth?: boolean;
}

/**
 * GET 一个 xpan 端点。`endpoint` 应使用 ENDPOINTS 里的常量(已含 ?method=...)。
 * 额外 query 参数通过 `params` 提供,access_token 自动附加。
 */
export async function xpanGet<T extends XpanResponse>(
  cfg: ConfigFile,
  endpoint: string,
  params: Record<string, string | number | undefined> = {},
  opts: ClientCallOpts = {},
  creds?: CredentialsOpts,
): Promise<T> {
  const exec = async (): Promise<T> => {
    const url = await buildUrl(cfg, endpoint, params, opts.skipAuth ?? false, creds);
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json', 'User-Agent': DEFAULT_UA },
        signal: opts.signal,
      });
    } catch (e) {
      throw new HttpError(0, endpoint, `网络错误: ${(e as Error).message}`);
    }
    const body = await readJson<T>(res, endpoint);
    const err = buildXpanError(body, endpoint);
    if (err) throw err;
    return body;
  };
  return opts.noRetry ? exec() : withBackoff(exec);
}

/**
 * POST application/json。`endpoint` 同样使用 ENDPOINTS 常量。
 * `body` 作为 JSON 序列化后发送;`queryParams` 拼到 URL 上。
 * 语义搜索(/xpan/unisearch)等接口需要此格式。
 */
export async function xpanPostJson<T extends XpanResponse>(
  cfg: ConfigFile,
  endpoint: string,
  body: Record<string, unknown>,
  queryParams: Record<string, string | number | undefined> = {},
  opts: ClientCallOpts = {},
  creds?: CredentialsOpts,
): Promise<T> {
  const exec = async (): Promise<T> => {
    const url = await buildUrl(cfg, endpoint, queryParams, opts.skipAuth ?? false, creds);
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': DEFAULT_UA,
        },
        body: JSON.stringify(body),
        signal: opts.signal,
      });
    } catch (e) {
      throw new HttpError(0, endpoint, `网络错误: ${(e as Error).message}`);
    }
    const bodyJson = await readJson<T>(res, endpoint);
    const err = buildXpanError(bodyJson, endpoint);
    if (err) throw err;
    return bodyJson;
  };
  return opts.noRetry ? exec() : withBackoff(exec);
}

/**
 * POST application/x-www-form-urlencoded。`endpoint` 同样使用 ENDPOINTS 常量。
 * `bodyParams` 编码进 form body;`queryParams` 拼到 URL 上(method/access_token 等)。
 */
export async function xpanPostForm<T extends XpanResponse>(
  cfg: ConfigFile,
  endpoint: string,
  bodyParams: Record<string, string | number | undefined>,
  queryParams: Record<string, string | number | undefined> = {},
  opts: ClientCallOpts = {},
  creds?: CredentialsOpts,
): Promise<T> {
  const exec = async (): Promise<T> => {
    const url = await buildUrl(cfg, endpoint, queryParams, opts.skipAuth ?? false, creds);
    const form = encodeForm(bodyParams);
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
          'User-Agent': DEFAULT_UA,
        },
        body: form,
        signal: opts.signal,
      });
    } catch (e) {
      throw new HttpError(0, endpoint, `网络错误: ${(e as Error).message}`);
    }
    const body = await readJson<T>(res, endpoint);
    const err = buildXpanError(body, endpoint);
    if (err) throw err;
    return body;
  };
  return opts.noRetry ? exec() : withBackoff(exec);
}

// ---------- pcs upload(superfile2)----------

export interface PcsUploadParams {
  path: string; // 远端绝对路径
  uploadid: string; // precreate 返回
  partseq: number; // 分片序号(从 0 开始)
}

export interface PcsUploadResult extends XpanResponse {
  md5?: string;
  request_id?: string | number;
}

/**
 * 上传一个分片(或整文件)到 d.pcs.baidu.com。`data` 可以是 Buffer / Uint8Array / Blob。
 *
 * 注意:type 字段必须是 "tmpfile";multipart/form-data 字段名必须是 "file";
 * partseq 是 query 参数(不是 body)。
 */
export async function pcsUpload(
  cfg: ConfigFile,
  pp: PcsUploadParams,
  data: Uint8Array | Buffer,
  filename: string,
  opts: ClientCallOpts = {},
  creds?: CredentialsOpts,
): Promise<PcsUploadResult> {
  const exec = async (): Promise<PcsUploadResult> => {
    const token = await getAccessToken(cfg, creds ?? {});
    const usp = new URLSearchParams({
      method: 'upload',
      access_token: token,
      type: 'tmpfile',
      path: pp.path,
      uploadid: pp.uploadid,
      partseq: String(pp.partseq),
    });
    const url = `${HOST_PCS_UPLOAD}${ENDPOINTS.pcsSuperfile}?${usp.toString()}`;
    const fd = new FormData();
    const blob = new Blob([data]);
    fd.append('file', blob, filename);
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        body: fd,
        headers: { 'User-Agent': DEFAULT_UA },
        signal: opts.signal,
      });
    } catch (e) {
      throw new HttpError(0, ENDPOINTS.pcsSuperfile, `网络错误: ${(e as Error).message}`);
    }
    const body = await readJson<PcsUploadResult>(res, ENDPOINTS.pcsSuperfile);
    const err = buildXpanError(body, ENDPOINTS.pcsSuperfile);
    if (err) throw err;
    return body;
  };
  return opts.noRetry ? exec() : withBackoff(exec);
}

// ---------- dlink download ----------

/**
 * 拉取 filemetas 返回的 dlink。**必须**带 `User-Agent: pan.baidu.com`,否则 403。
 * `access_token` 也必须拼到 dlink 上(不是 header)。
 */
export async function dlinkFetch(
  cfg: ConfigFile,
  dlink: string,
  range?: { start: number; end?: number },
  opts: ClientCallOpts = {},
  creds?: CredentialsOpts,
): Promise<Response> {
  const token = await getAccessToken(cfg, creds ?? {});
  const url = `${dlink}${dlink.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(token)}`;
  const headers: Record<string, string> = { 'User-Agent': DLINK_UA };
  if (range) {
    headers['Range'] = `bytes=${range.start}-${range.end ?? ''}`;
  }
  let res: Response;
  try {
    res = await fetch(url, { method: 'GET', headers, signal: opts.signal, redirect: 'follow' });
  } catch (e) {
    throw new HttpError(0, 'dlink', `下载失败: ${(e as Error).message}`);
  }
  if (!res.ok) {
    let body = '';
    try {
      body = await res.text();
    } catch {
      /* ignore */
    }
    throw new HttpError(res.status, 'dlink', `dlink HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  return res;
}

// ---------- helpers ----------

async function buildUrl(
  cfg: ConfigFile,
  endpoint: string,
  params: Record<string, string | number | undefined>,
  skipAuth: boolean,
  creds?: CredentialsOpts,
): Promise<string> {
  // endpoint 已经包含 `?method=...`,我们只在后面追加 `&access_token=...&<params>`
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    qs.set(k, String(v));
  }
  if (!skipAuth) {
    const token = await getAccessToken(cfg, creds ?? {});
    qs.set('access_token', token);
  }
  const url = `${HOST_XPAN}${endpoint}${qs.toString().length > 0 ? '&' + qs.toString() : ''}`;
  return url;
}

function encodeForm(params: Record<string, string | number | undefined>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    usp.set(k, String(v));
  }
  return usp.toString();
}
