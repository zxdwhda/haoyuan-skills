import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig, DEFAULT_CONFIG, getConfigDir } from '../../src/config.js';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('loadConfig with env vars', () => {
  const originalEnv = { ...process.env };
  let tmpDir: string;

  beforeEach(() => {
    // 清理环境变量避免交叉污染
    delete process.env.BAIDU_DRIVE_SCOPE;
    delete process.env.BAIDU_DRIVE_APP_NAME;
    delete process.env.BAIDU_DRIVE_ALLOWED_PATHS;
    tmpDir = mkdtempSync(join(tmpdir(), 'bd-test-'));
    process.env.BAIDU_DRIVE_CONFIG_DIR = tmpDir;
  });

  afterEach(() => {
    process.env = originalEnv;
    try { rmSync(tmpDir, { recursive: true }); } catch { /* ignore */ }
  });

  it('默认返回 DEFAULT_CONFIG', () => {
    const cfg = loadConfig();
    expect(cfg.scope).toBe('sandbox');
    expect(cfg.appName).toBe('myapp');
  });

  it('BAIDU_DRIVE_SCOPE 覆盖 config', () => {
    process.env.BAIDU_DRIVE_SCOPE = 'full';
    const cfg = loadConfig();
    expect(cfg.scope).toBe('full');
  });

  it('BAIDU_DRIVE_SCOPE 非法值不覆盖', () => {
    process.env.BAIDU_DRIVE_SCOPE = 'invalid';
    const cfg = loadConfig();
    expect(cfg.scope).toBe('sandbox');
  });

  it('BAIDU_DRIVE_APP_NAME 覆盖 appName', () => {
    process.env.BAIDU_DRIVE_APP_NAME = 'myrealapp';
    const cfg = loadConfig();
    expect(cfg.appName).toBe('myrealapp');
  });

  it('BAIDU_DRIVE_ALLOWED_PATHS 解析为数组', () => {
    process.env.BAIDU_DRIVE_ALLOWED_PATHS = '/photos, /backup , /docs';
    const cfg = loadConfig();
    expect(cfg.allowedPaths).toEqual(['/photos', '/backup', '/docs']);
  });
});

describe('getConfigDir', () => {
  it('返回绝对路径', () => {
    delete process.env.BAIDU_DRIVE_CONFIG_DIR;
    const dir = getConfigDir();
    expect(dir.startsWith('/')).toBe(true);
    expect(dir.includes('baidu-drive-skill')).toBe(true);
  });
});
