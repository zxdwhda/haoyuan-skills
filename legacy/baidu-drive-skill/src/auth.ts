/**
 * OAuth 2.0 流程:device code(默认)/ OOB authorization code(降级)/ manual paste(限时体验)。
 *
 * 端点:
 * - device code:    GET https://openapi.baidu.com/oauth/2.0/device/code
 * - token exchange: GET https://openapi.baidu.com/oauth/2.0/token
 * - authorize:      https://openapi.baidu.com/oauth/2.0/authorize
 *
 * 客户端凭据来源(优先级 高 → 低):
 * 1. CLI flag(--client-id / --client-secret),由 login.ts 注入 opts
 * 2. env var:BAIDU_DRIVE_APP_ID / BAIDU_DRIVE_APP_SECRET
 * 3. config.json 的 `app.clientId` / `app.clientSecret`
 * 4. 都没有 → 抛 AuthError,提示用户先配置自有应用,或用 `--manual` 粘贴体验 token
 *
 * v0.0.1-alpha 不内置百度公开 client_id —— 在限时 token 这条路径正式可用前,
 * 强制用户走自有应用,降低用户因公共凭据被回收而踩坑的概率。
 */

import { stderr } from 'node:process';
import { saveToken, loadToken, deleteToken, type TokenFile, type ConfigFile } from './config.js';
import { AuthError } from './errors.js';
import { color, info, osc8 } from './ui.js';

// ---------- endpoints ----------

const OAUTH_BASE = 'https://openapi.baidu.com/oauth/2.0';
const DEVICE_ENDPOINT = `${OAUTH_BASE}/device/code`;
const TOKEN_ENDPOINT = `${OAUTH_BASE}/token`;
const AUTHORIZE_ENDPOINT = `${OAUTH_BASE}/authorize`;
const DEFAULT_SCOPE = 'basic,netdisk';
const REFRESH_THRESHOLD_SECONDS = 600;

// ---------- credentials ----------

export interface AppCredentials {
  clientId: string;
  clientSecret: string;
}

export interface CredentialsOpts {
  clientId?: string;
  clientSecret?: string;
}

export function resolveCredentials(cfg: ConfigFile, opts: CredentialsOpts = {}): AppCredentials {
  const clientId = opts.clientId ?? process.env.BAIDU_DRIVE_APP_ID ?? cfg.app?.clientId;
  const clientSecret =
    opts.clientSecret ?? process.env.BAIDU_DRIVE_APP_SECRET ?? cfg.app?.clientSecret;

  if (!clientId || !clientSecret) {
    throw new AuthError(
      [
        '未找到 OAuth 客户端凭据。请按以下任一方式配置:',
        '  1) 在百度网盘开放平台注册自有应用,把 AppKey / SecretKey 写入',
        '     config.json 的 `app.clientId` 与 `app.clientSecret`',
        '  2) 设置环境变量 BAIDU_DRIVE_APP_ID / BAIDU_DRIVE_APP_SECRET',
        '  3) 或直接 `pan.cjs login --manual`(限时体验,不能自动续期)',
        '',
        '注册地址: https://pan.baidu.com/union/console/applist',
      ].join('\n'),
    );
  }
  return { clientId, clientSecret };
}

// ---------- HTTP helper(本地小工具,避免 client.ts 循环依赖) ----------

interface OAuthRawResponse {
  access_token?: string;
  refresh_token?: string;
  scope?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
  // device code 响应
  device_code?: string;
  user_code?: string;
  verification_url?: string;
  qrcode_url?: string;
  interval?: number;
  // 极偶尔的非标准 errno
  errno?: number;
  errmsg?: string;
}

async function oauthGet(
  url: string,
  params: Record<string, string>,
  signal?: AbortSignal,
): Promise<OAuthRawResponse> {
  const usp = new URLSearchParams(params);
  const full = `${url}?${usp.toString()}`;
  let res: Response;
  try {
    res = await fetch(full, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    });
  } catch (e) {
    throw new AuthError(`请求 OAuth 端点失败: ${(e as Error).message}`, e);
  }
  // 百度 OAuth 对业务错误一律返回合法 JSON(可能附带 4xx,例如
  // authorization_pending / slow_down / expired_token / authorization_declined)。
  // 因此先尝试解析 body —— 只要是合法 JSON,就交给上层判断 error 字段。
  let bodyTxt = '';
  try {
    bodyTxt = await res.text();
  } catch (e) {
    throw new AuthError(`读取 OAuth 响应失败: ${(e as Error).message}`);
  }
  let json: OAuthRawResponse | undefined;
  try {
    json = JSON.parse(bodyTxt) as OAuthRawResponse;
  } catch {
    json = undefined;
  }
  if (json && typeof json === 'object') {
    return json;
  }
  if (!res.ok) {
    throw new AuthError(`OAuth 端点返回 HTTP ${res.status}: ${bodyTxt.slice(0, 200)}`);
  }
  throw new AuthError(`OAuth 响应不是合法 JSON: ${bodyTxt.slice(0, 200)}`);
}

// ---------- token 落盘 ----------

function buildTokenFile(
  raw: OAuthRawResponse,
  kind: TokenFile['kind'],
): TokenFile {
  if (!raw.access_token) {
    throw new AuthError(
      raw.error
        ? `OAuth 失败: ${raw.error}${raw.error_description ? ' — ' + raw.error_description : ''}`
        : 'OAuth 响应缺少 access_token',
    );
  }
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = typeof raw.expires_in === 'number' ? raw.expires_in : 0;
  return {
    access_token: raw.access_token,
    refresh_token: raw.refresh_token,
    expires_at: expiresIn > 0 ? now + expiresIn : now + 3600 * 24 * 30,
    obtained_at: now,
    kind,
    scope: raw.scope ?? DEFAULT_SCOPE,
  };
}

// ---------- device code flow ----------

export interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_url: string;
  qrcode_url?: string;
  expires_in: number;
  interval: number;
}

export async function startDeviceCodeFlow(creds: AppCredentials): Promise<DeviceCodeResponse> {
  const raw = await oauthGet(DEVICE_ENDPOINT, {
    response_type: 'device_code',
    client_id: creds.clientId,
    scope: DEFAULT_SCOPE,
  });
  if (raw.error || !raw.device_code || !raw.user_code || !raw.verification_url) {
    throw new AuthError(
      raw.error
        ? `device code 申请失败: ${raw.error}${raw.error_description ? ' — ' + raw.error_description : ''}`
        : 'device code 响应不完整',
    );
  }
  return {
    device_code: raw.device_code,
    user_code: raw.user_code,
    verification_url: raw.verification_url,
    qrcode_url: raw.qrcode_url,
    expires_in: raw.expires_in ?? 1800,
    interval: raw.interval ?? 5,
  };
}

/**
 * 轮询 device token,直到拿到 access_token 或超时/被拒。
 * 调用方需要先把 user_code / verification_url 显示给用户。
 */
export async function pollDeviceToken(
  creds: AppCredentials,
  device: DeviceCodeResponse,
  abortSignal?: AbortSignal,
): Promise<TokenFile> {
  const start = Date.now();
  let interval = device.interval * 1000;
  const expiresAt = start + device.expires_in * 1000;

  for (;;) {
    if (Date.now() >= expiresAt) {
      throw new AuthError('授权码超时,请重新执行 `pan.cjs login`。');
    }
    if (abortSignal?.aborted) {
      throw new AuthError('用户取消登录');
    }
    await sleep(interval);
    let raw: OAuthRawResponse;
    try {
      raw = await oauthGet(TOKEN_ENDPOINT, {
        grant_type: 'device_token',
        code: device.device_code,
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
      });
    } catch (e) {
      // 网络瞬断,按 interval 继续
      stderr.write(color.dim(`(轮询失败,继续等待: ${(e as Error).message})\n`));
      continue;
    }

    if (raw.access_token) {
      const t = buildTokenFile(raw, 'device');
      saveToken(t);
      return t;
    }

    const err = raw.error ?? '';
    switch (err) {
      case 'authorization_pending':
        // 用户还没扫码,继续等
        break;
      case 'slow_down':
        interval = Math.min(interval * 2, 30 * 1000);
        break;
      case 'expired_token':
        throw new AuthError('device_code 已过期,请重新执行 `pan.cjs login`。');
      case 'authorization_declined':
      case 'access_denied':
        throw new AuthError('用户拒绝了授权请求。');
      default:
        if (err) {
          throw new AuthError(`OAuth 错误: ${err}${raw.error_description ? ' — ' + raw.error_description : ''}`);
        }
        // 未知响应,继续轮询
        break;
    }
  }
}

export async function loginDevice(
  cfg: ConfigFile,
  opts: CredentialsOpts = {},
): Promise<TokenFile> {
  const creds = resolveCredentials(cfg, opts);
  const dev = await startDeviceCodeFlow(creds);
  info('');
  info(color.bold('请在浏览器打开下面的链接,登录百度账号并输入授权码:'));
  info('  ' + osc8(dev.verification_url, dev.verification_url));
  info('');
  info(color.bold('授权码: ') + color.cyan(dev.user_code));
  if (dev.qrcode_url) {
    info(color.dim('或扫描二维码: ' + dev.qrcode_url));
  }
  info(color.dim(`授权窗口 ${Math.round(dev.expires_in / 60)} 分钟内有效。等待用户授权...`));
  return pollDeviceToken(creds, dev);
}

// ---------- OOB authorization code ----------

export function buildOobAuthorizeUrl(creds: AppCredentials): string {
  const usp = new URLSearchParams({
    response_type: 'code',
    client_id: creds.clientId,
    redirect_uri: 'oob',
    scope: DEFAULT_SCOPE,
    display: 'page',
  });
  return `${AUTHORIZE_ENDPOINT}?${usp.toString()}`;
}

export async function exchangeOobCode(
  creds: AppCredentials,
  code: string,
): Promise<TokenFile> {
  const trimmed = code.trim();
  if (!/^[0-9a-fA-F]{32,}$/.test(trimmed)) {
    throw new AuthError('授权码格式错误,应为 32 位十六进制字符。');
  }
  const raw = await oauthGet(TOKEN_ENDPOINT, {
    grant_type: 'authorization_code',
    code: trimmed,
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    redirect_uri: 'oob',
  });
  const t = buildTokenFile(raw, 'oob');
  saveToken(t);
  return t;
}

// ---------- manual paste ----------

export async function loginManual(
  rawAccessToken: string,
  expiresInSec = 86400,
  scope = DEFAULT_SCOPE,
): Promise<TokenFile> {
  const tok = rawAccessToken.trim();
  if (tok.length < 10) {
    throw new AuthError('粘贴的 access_token 看起来不合法(过短)。');
  }
  const now = Math.floor(Date.now() / 1000);
  const t: TokenFile = {
    access_token: tok,
    expires_at: now + expiresInSec,
    obtained_at: now,
    kind: 'manual',
    scope,
  };
  saveToken(t);
  return t;
}

// ---------- refresh ----------

export async function refreshToken(
  cfg: ConfigFile,
  current: TokenFile,
  opts: CredentialsOpts = {},
): Promise<TokenFile> {
  if (current.kind === 'manual') {
    throw new AuthError(
      'manual 模式下的 access_token 无法自动续期。请重新执行 `pan.cjs login --manual` 粘贴新 token。',
    );
  }
  if (!current.refresh_token) {
    throw new AuthError('当前 token 没有 refresh_token,请重新执行 `pan.cjs login`。');
  }
  const creds = resolveCredentials(cfg, opts);
  const raw = await oauthGet(TOKEN_ENDPOINT, {
    grant_type: 'refresh_token',
    refresh_token: current.refresh_token,
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
  });
  if (raw.error || !raw.access_token) {
    throw new AuthError(
      raw.error
        ? `刷新 token 失败: ${raw.error}${raw.error_description ? ' — ' + raw.error_description : ''}`
        : '刷新 token 失败:响应缺少 access_token',
    );
  }
  const t = buildTokenFile(raw, current.kind);
  saveToken(t);
  return t;
}

/**
 * 在每次 API 调用前调用 —— 距过期 < 10 分钟时尝试 refresh。
 * 返回最新 token,无需用户感知。
 */
export async function refreshIfNeeded(
  cfg: ConfigFile,
  opts: CredentialsOpts = {},
): Promise<TokenFile> {
  const cur = loadToken();
  if (!cur) {
    throw new AuthError('尚未登录。请运行 `pan.cjs login`。');
  }
  const now = Math.floor(Date.now() / 1000);
  if (cur.expires_at - now > REFRESH_THRESHOLD_SECONDS) {
    return cur;
  }
  // manual 模式没有 refresh_token,过期直接抛
  if (cur.kind === 'manual') {
    if (cur.expires_at <= now) {
      throw new AuthError(
        'manual access_token 已过期,请运行 `pan.cjs login --manual` 重新粘贴。',
      );
    }
    return cur;
  }
  return refreshToken(cfg, cur, opts);
}

/**
 * 拿当前 access_token,自动续期。所有业务调用都走这里。
 */
export async function getAccessToken(
  cfg: ConfigFile,
  opts: CredentialsOpts = {},
): Promise<string> {
  const t = await refreshIfNeeded(cfg, opts);
  return t.access_token;
}

// ---------- logout ----------

export function logout(profile?: string): void {
  deleteToken(profile);
}

// ---------- helpers ----------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
