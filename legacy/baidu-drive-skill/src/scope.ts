/**
 * 作用域守卫 —— 在每条 API 调用前验证路径是否在 scope 范围内。
 *
 * sandbox(默认):路径必须 == `/apps/<appName>` 或 startsWith `/apps/<appName>/`
 * full(用户显式开启):若 `allowedPaths` 非空,必须以其中之一为前缀;为空则不限。
 *
 * 任何越界 / 路径穿越 / `~` / 中文路径都直接抛 ScopeError。
 */

import { posix } from 'node:path';
import type { ConfigFile } from './config.js';
import { ScopeError } from './errors.js';

/**
 * 标准化输入路径:
 * - 强制使用 POSIX 分隔符(网盘 API 不支持 \)
 * - 折叠 `//` 与 `.` 段
 * - **不允许** `..`、`~`、中文 "我的应用数据" 段(后者只在展示层使用)
 */
export function normalizePath(input: string): string {
  if (!input || typeof input !== 'string') {
    throw new ScopeError(String(input), 'unknown', '路径为空或类型错误');
  }

  let p = input.trim();

  if (p.includes('\\')) {
    p = p.replace(/\\/g, '/');
  }

  if (p.startsWith('~')) {
    throw new ScopeError(input, 'unknown', '禁止使用 ~ 路径(本地家目录别名,网盘路径无意义)');
  }

  if (/(^|\/)\.\.($|\/)/.test(p)) {
    throw new ScopeError(input, 'unknown', '禁止路径穿越(.. 段不允许出现在网盘路径中)');
  }

  if (p.includes('我的应用数据')) {
    throw new ScopeError(
      input,
      'unknown',
      '展示用的中文路径(我的应用数据/...)不能作为命令参数,请改为 /apps/<appName>/...',
    );
  }

  if (!p.startsWith('/')) {
    p = '/' + p;
  }

  // 用 posix.normalize 折叠 // 等
  let normalized = posix.normalize(p);
  // 去除尾部多余 / (但保留根 '/')
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.replace(/\/+$/, '');
  }
  return normalized;
}

/**
 * 沙盒根 = `/apps/<appName>`(无尾斜杠,内部规范)。
 */
export function getSandboxRoot(cfg: ConfigFile): string {
  if (!cfg.appName || cfg.appName.length === 0) {
    throw new ScopeError('', 'sandbox', 'config.appName 为空,请运行 `pan.cjs scope` 设置');
  }
  return `/apps/${cfg.appName}`;
}

/**
 * 当前 scope 下的"根"。沙盒下是 /apps/<appName>;full 下是 /(或第一个白名单)。
 */
export function getScopeRoot(cfg: ConfigFile): string {
  if (cfg.scope === 'sandbox') return getSandboxRoot(cfg);
  if (cfg.allowedPaths && cfg.allowedPaths.length > 0) return cfg.allowedPaths[0]!;
  return '/';
}

/**
 * 不抛错版本,返回 boolean。
 */
export function isAllowed(input: string, cfg: ConfigFile): boolean {
  try {
    assertInScope(input, cfg);
    return true;
  } catch {
    return false;
  }
}

/**
 * 校验路径在当前 scope 内,返回标准化后的绝对路径(不带尾 /)。
 * 越界抛 ScopeError。
 */
export function assertInScope(input: string, cfg: ConfigFile): string {
  const p = normalizePath(input);

  if (cfg.scope === 'sandbox') {
    const root = getSandboxRoot(cfg);
    if (p === root || p.startsWith(root + '/')) return p;
    throw new ScopeError(
      input,
      'sandbox',
      `路径 ${input} 超出沙盒(${root}/)。如需访问全盘,请运行 \`pan.cjs scope full\`。`,
    );
  }

  // full 模式
  if (!cfg.allowedPaths || cfg.allowedPaths.length === 0) {
    return p; // 全盘无白名单 → 任意路径放行
  }

  for (const prefix of cfg.allowedPaths) {
    if (typeof prefix !== 'string') continue;
    const norm = normalizePath(prefix);
    if (p === norm || p.startsWith(norm + '/')) return p;
  }
  throw new ScopeError(
    input,
    'full',
    `路径 ${input} 不在白名单内(allowedPaths=${cfg.allowedPaths.join(', ')})。`,
  );
}

/**
 * 把 API 路径转换为给用户看的中文路径:`/apps/myapp/foo` → `我的应用数据/myapp/foo`。
 */
export function toDisplayPath(apiPath: string): string {
  const p = normalizePath(apiPath);
  if (p === '/apps' || p.startsWith('/apps/')) {
    return '我的应用数据' + p.slice('/apps'.length);
  }
  return p;
}
