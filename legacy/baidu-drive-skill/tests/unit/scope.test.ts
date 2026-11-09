import { describe, it, expect } from 'vitest';
import { normalizePath, assertInScope, getScopeRoot, isAllowed } from '../../src/scope.js';
import { ScopeError } from '../../src/errors.js';

const sandboxCfg = {
  scope: 'sandbox' as const,
  appName: 'myapp',
  allowedPaths: [],
  trash: { retainDays: 7 },
  concurrency: { uploadParts: 4, downloadChunks: 4 },
  version: 1,
};

const fullCfg = {
  scope: 'full' as const,
  appName: 'myapp',
  allowedPaths: ['/photos', '/backup'],
  trash: { retainDays: 7 },
  concurrency: { uploadParts: 4, downloadChunks: 4 },
  version: 1,
};

describe('normalizePath', () => {
  it('折叠多余斜杠', () => {
    expect(normalizePath('//apps//myapp//foo')).toBe('/apps/myapp/foo');
  });

  it('自动补首 /', () => {
    expect(normalizePath('apps/myapp/foo')).toBe('/apps/myapp/foo');
  });

  it('禁止 ..', () => {
    expect(() => normalizePath('/apps/myapp/../secret')).toThrow(ScopeError);
  });

  it('禁止 ~', () => {
    expect(() => normalizePath('~/documents')).toThrow(ScopeError);
  });

  it('禁止中文路径', () => {
    expect(() => normalizePath('我的应用数据/myapp/foo')).toThrow(ScopeError);
  });

  it('去除尾部 /', () => {
    expect(normalizePath('/apps/myapp/foo/')).toBe('/apps/myapp/foo');
  });

  it('保留根 /', () => {
    expect(normalizePath('/')).toBe('/');
  });
});

describe('assertInScope sandbox', () => {
  it('允许沙盒根', () => {
    expect(assertInScope('/apps/myapp', sandboxCfg)).toBe('/apps/myapp');
  });

  it('允许沙盒子路径', () => {
    expect(assertInScope('/apps/myapp/foo/bar', sandboxCfg)).toBe('/apps/myapp/foo/bar');
  });

  it('拒绝沙盒外路径', () => {
    expect(() => assertInScope('/photos', sandboxCfg)).toThrow(ScopeError);
  });

  it('拒绝 /apps 其他应用', () => {
    expect(() => assertInScope('/apps/otherapp/file', sandboxCfg)).toThrow(ScopeError);
  });
});

describe('assertInScope full', () => {
  it('白名单内路径允许', () => {
    expect(assertInScope('/photos/2024', fullCfg)).toBe('/photos/2024');
    expect(assertInScope('/backup', fullCfg)).toBe('/backup');
  });

  it('白名单外路径拒绝', () => {
    expect(() => assertInScope('/videos', fullCfg)).toThrow(ScopeError);
  });

  it('空白名单 = 全盘放行', () => {
    const cfg = { ...fullCfg, allowedPaths: [] };
    expect(assertInScope('/anything', cfg)).toBe('/anything');
  });
});

describe('getScopeRoot', () => {
  it('sandbox 返回沙盒根', () => {
    expect(getScopeRoot(sandboxCfg)).toBe('/apps/myapp');
  });

  it('full 返回第一个白名单', () => {
    expect(getScopeRoot(fullCfg)).toBe('/photos');
  });

  it('full 空白名单返回 /', () => {
    expect(getScopeRoot({ ...fullCfg, allowedPaths: [] })).toBe('/');
  });
});

describe('isAllowed', () => {
  it('不抛错返回 boolean', () => {
    expect(isAllowed('/apps/myapp/file', sandboxCfg)).toBe(true);
    expect(isAllowed('/outside', sandboxCfg)).toBe(false);
  });
});
