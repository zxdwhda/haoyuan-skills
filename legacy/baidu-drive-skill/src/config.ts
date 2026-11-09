/**
 * 配置 / token 落盘读写。
 *
 * 路径优先级:
 * 1. `BAIDU_DRIVE_CONFIG_DIR` env var
 * 2. `XDG_CONFIG_HOME/baidu-drive-skill/`
 * 3. `~/.config/baidu-drive-skill/`(POSIX)/ `%APPDATA%\baidu-drive-skill\`(Windows)
 *
 * 安全:
 * - token.json 写入时 chmod 0600;读取时如果权限更宽,POSIX 平台会警告。
 * - access_token / refresh_token / client_secret 严禁出现在日志或错误消息里。
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync, statSync, unlinkSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { join, resolve } from 'node:path';
import { ConfigError } from './errors.js';

// ---------- types ----------

export type Scope = 'sandbox' | 'full';

export interface ConfigFile {
  /** 当前作用域:sandbox(默认沙盒)/ full(全盘)。 */
  scope: Scope;
  /** 沙盒模式下的应用名,沙盒根 = `/apps/<appName>/`。 */
  appName: string;
  /** full 模式下的白名单前缀。空数组 = 无限制。 */
  allowedPaths: string[];
  /** 自有 OAuth 应用配置(可选)。缺省走限时体验内置 client。 */
  app?: {
    clientId: string;
    clientSecret: string;
  };
  trash: {
    /** 软删除保留天数,超过则可被 `trash --gc` 清理。 */
    retainDays: number;
  };
  concurrency: {
    /** 上传分片并发。 */
    uploadParts: number;
    /** 下载分片并发。 */
    downloadChunks: number;
  };
  /** 配置文件 schema 版本,用于未来 migration。 */
  version: number;
  /** 当前激活的 profile,默认 default。 */
  activeProfile?: string;
}

export interface TokenFile {
  access_token: string;
  /** 限时体验或 manual 模式下不存在。 */
  refresh_token?: string;
  /** unix seconds —— 不是 expires_in,而是绝对到期时间戳。 */
  expires_at: number;
  /** 拿到 token 的时间戳,unix seconds。 */
  obtained_at: number;
  /** 登录方式,影响错误处理(manual 不可 refresh)。 */
  kind: 'device' | 'oob' | 'manual';
  /** OAuth scope 字符串,如 "basic,netdisk"。 */
  scope: string;
  /** 用户 baidu_id(可选,用于 status 显示)。 */
  user_id?: string;
}

// ---------- defaults ----------

export const DEFAULT_CONFIG: ConfigFile = {
  scope: 'sandbox',
  appName: 'myapp',
  allowedPaths: [],
  trash: { retainDays: 7 },
  concurrency: { uploadParts: 4, downloadChunks: 4 },
  version: 1,
  activeProfile: 'default',
};

// ---------- paths ----------

/**
 * 解析配置目录绝对路径(可能不存在,调用方需自己判断)。
 */
export function getConfigDir(): string {
  const env = process.env.BAIDU_DRIVE_CONFIG_DIR;
  if (env && env.trim().length > 0) return resolve(env);

  if (platform() === 'win32') {
    const appData = process.env.APPDATA;
    if (appData) return join(appData, 'baidu-drive-skill');
    return join(homedir(), 'AppData', 'Roaming', 'baidu-drive-skill');
  }

  const xdg = process.env.XDG_CONFIG_HOME;
  if (xdg && xdg.trim().length > 0) return join(xdg, 'baidu-drive-skill');
  return join(homedir(), '.config', 'baidu-drive-skill');
}

export function getConfigPath(): string {
  return join(getConfigDir(), 'config.json');
}

export function getTokenPath(profile?: string): string {
  const base = join(getConfigDir(), profile ? `token.${profile}.json` : 'token.json');
  return base;
}

export function listProfiles(): string[] {
  const dir = getConfigDir();
  if (!existsSync(dir)) return ['default'];
  const files = require('node:fs').readdirSync(dir) as string[];
  const profiles = new Set<string>(['default']);
  for (const f of files) {
    const m = f.match(/^token\.(.+)\.json$/);
    if (m) profiles.add(m[1]!);
  }
  return Array.from(profiles).sort();
}

function ensureConfigDir(): void {
  const dir = getConfigDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
}

// ---------- secure perms ----------

const TOKEN_PERMS_MASK = 0o077; // 任何 group/other 权限位都视为不安全

/**
 * 在 POSIX 平台检查 token 文件权限。Windows 跳过(ACL 模型不同)。
 * 返回 true = 安全;false = 权限过宽,已尝试自动收紧。
 */
export function assertSecurePerms(filePath: string): boolean {
  if (platform() === 'win32') return true;
  if (!existsSync(filePath)) return true;
  try {
    const st = statSync(filePath);
    if ((st.mode & TOKEN_PERMS_MASK) !== 0) {
      try {
        chmodSync(filePath, 0o600);
        return false;
      } catch {
        return false;
      }
    }
    return true;
  } catch {
    return true;
  }
}

// ---------- config IO ----------

function isValidScope(v: unknown): v is Scope {
  return v === 'sandbox' || v === 'full';
}

function validateConfig(raw: unknown): ConfigFile {
  if (typeof raw !== 'object' || raw === null) {
    throw new ConfigError('config.json 不是合法对象');
  }
  const r = raw as Record<string, unknown>;
  const scope = r.scope ?? DEFAULT_CONFIG.scope;
  if (!isValidScope(scope)) {
    throw new ConfigError(`config.json scope 字段必须是 "sandbox" 或 "full",实际为 ${String(scope)}`);
  }
  const appName = typeof r.appName === 'string' && r.appName.length > 0 ? r.appName : DEFAULT_CONFIG.appName;
  const allowedPaths = Array.isArray(r.allowedPaths)
    ? r.allowedPaths.filter((x): x is string => typeof x === 'string')
    : DEFAULT_CONFIG.allowedPaths;

  let app: ConfigFile['app'];
  if (r.app && typeof r.app === 'object') {
    const a = r.app as Record<string, unknown>;
    if (typeof a.clientId === 'string' && typeof a.clientSecret === 'string') {
      app = { clientId: a.clientId, clientSecret: a.clientSecret };
    }
  }

  const trash = (r.trash && typeof r.trash === 'object'
    ? r.trash
    : DEFAULT_CONFIG.trash) as ConfigFile['trash'];
  const concurrency = (r.concurrency && typeof r.concurrency === 'object'
    ? r.concurrency
    : DEFAULT_CONFIG.concurrency) as ConfigFile['concurrency'];

  return {
    scope,
    appName,
    allowedPaths,
    app,
    trash: {
      retainDays:
        typeof trash.retainDays === 'number' && trash.retainDays > 0
          ? trash.retainDays
          : DEFAULT_CONFIG.trash.retainDays,
    },
    concurrency: {
      uploadParts:
        typeof concurrency.uploadParts === 'number' && concurrency.uploadParts > 0
          ? concurrency.uploadParts
          : DEFAULT_CONFIG.concurrency.uploadParts,
      downloadChunks:
        typeof concurrency.downloadChunks === 'number' && concurrency.downloadChunks > 0
          ? concurrency.downloadChunks
          : DEFAULT_CONFIG.concurrency.downloadChunks,
    },
    version: typeof r.version === 'number' ? r.version : DEFAULT_CONFIG.version,
    activeProfile:
      typeof r.activeProfile === 'string' && r.activeProfile.length > 0
        ? r.activeProfile
        : DEFAULT_CONFIG.activeProfile,
  };
}

export function loadConfig(): ConfigFile {
  const path = getConfigPath();
  const cfg: ConfigFile = existsSync(path)
    ? (() => {
        let txt: string;
        try {
          txt = readFileSync(path, 'utf-8');
        } catch (e) {
          throw new ConfigError(`无法读取 ${path}: ${(e as Error).message}`);
        }
        let raw: unknown;
        try {
          raw = JSON.parse(txt);
        } catch (e) {
          throw new ConfigError(`${path} 不是合法 JSON: ${(e as Error).message}`);
        }
        return validateConfig(raw);
      })()
    : { ...DEFAULT_CONFIG };

  // env var 优先级高于 config.json
  const envScope = process.env.BAIDU_DRIVE_SCOPE;
  if (envScope === 'sandbox' || envScope === 'full') {
    cfg.scope = envScope;
  }
  const envAppName = process.env.BAIDU_DRIVE_APP_NAME;
  if (envAppName && envAppName.trim().length > 0) {
    cfg.appName = envAppName.trim();
  }
  const envAllowed = process.env.BAIDU_DRIVE_ALLOWED_PATHS;
  if (envAllowed) {
    cfg.allowedPaths = envAllowed.split(',').map((s) => s.trim()).filter(Boolean);
  }

  return cfg;
}

export function saveConfig(cfg: ConfigFile): void {
  ensureConfigDir();
  const path = getConfigPath();
  writeFileSync(path, JSON.stringify(cfg, null, 2) + '\n', 'utf-8');
  // config.json 含 client_secret(若用户配了自有应用),也走 0600
  if (platform() !== 'win32') {
    try {
      chmodSync(path, 0o600);
    } catch {
      /* best-effort */
    }
  }
}

// ---------- token IO ----------

function validateToken(raw: unknown): TokenFile {
  if (typeof raw !== 'object' || raw === null) {
    throw new ConfigError('token.json 不是合法对象,请重新登录。');
  }
  const r = raw as Record<string, unknown>;
  const access_token = r.access_token;
  if (typeof access_token !== 'string' || access_token.length === 0) {
    throw new ConfigError('token.json 缺少 access_token,请重新登录。');
  }
  const expires_at = typeof r.expires_at === 'number' ? r.expires_at : 0;
  const obtained_at =
    typeof r.obtained_at === 'number' ? r.obtained_at : Math.floor(Date.now() / 1000);
  const kind = r.kind === 'oob' || r.kind === 'manual' ? r.kind : 'device';
  const scope = typeof r.scope === 'string' ? r.scope : 'basic,netdisk';
  const refresh_token = typeof r.refresh_token === 'string' ? r.refresh_token : undefined;
  const user_id = typeof r.user_id === 'string' ? r.user_id : undefined;
  return { access_token, refresh_token, expires_at, obtained_at, kind, scope, user_id };
}

export function loadToken(profile?: string): TokenFile | null {
  const path = getTokenPath(profile);
  if (!existsSync(path)) return null;
  assertSecurePerms(path);
  let txt: string;
  try {
    txt = readFileSync(path, 'utf-8');
  } catch (e) {
    throw new ConfigError(`无法读取 ${path}: ${(e as Error).message}`);
  }
  let raw: unknown;
  try {
    raw = JSON.parse(txt);
  } catch (e) {
    throw new ConfigError(`${path} 不是合法 JSON: ${(e as Error).message}`);
  }
  return validateToken(raw);
}

export function saveToken(t: TokenFile, profile?: string): void {
  ensureConfigDir();
  const path = getTokenPath(profile);
  writeFileSync(path, JSON.stringify(t, null, 2) + '\n', { encoding: 'utf-8', mode: 0o600 });
  if (platform() !== 'win32') {
    try {
      chmodSync(path, 0o600);
    } catch {
      /* best-effort */
    }
  }
}

export function deleteToken(profile?: string): void {
  const path = getTokenPath(profile);
  if (!existsSync(path)) return;
  try {
    const overlay = '\0'.repeat(64);
    writeFileSync(path, overlay, 'utf-8');
  } catch {
    /* best-effort */
  }
  try {
    unlinkSync(path);
  } catch {
    /* best-effort */
  }
}
