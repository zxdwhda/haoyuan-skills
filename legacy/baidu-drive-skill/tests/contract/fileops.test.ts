import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ls, mkdir, move, copy, rename, softRm, hardRm, statByPath, search } from '../../src/fileops.js';
import type { ConfigFile } from '../../src/config.js';

const mockCfg: ConfigFile = {
  scope: 'sandbox',
  appName: 'myapp',
  allowedPaths: [],
  trash: { retainDays: 7 },
  concurrency: { uploadParts: 4, downloadChunks: 4 },
  version: 1,
};

function mockToken(): Record<string, string> {
  return { access_token: 'test_token_123' };
}

function mockFetch(responses: Array<{ urlMatcher: (url: string) => boolean; body: unknown }>) {
  let callIndex = 0;
  return vi.fn(async (url: string) => {
    for (const r of responses) {
      if (r.urlMatcher(url)) {
        return {
          ok: true,
          status: 200,
          json: async () => r.body,
          text: async () => JSON.stringify(r.body),
        } as Response;
      }
    }
    throw new Error(`Unhandled fetch: ${url} (call #${++callIndex})`);
  });
}

describe('fileops contract (mock fetch)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('ls 返回文件列表', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        {
          urlMatcher: (u) => u.includes('/rest/2.0/xpan/file') && u.includes('method=list') && u.includes('dir=%2Fapps%2Fmyapp'),
          body: {
            errno: 0,
            list: [
              { fs_id: 1, path: '/apps/myapp/file.txt', server_filename: 'file.txt', size: 1024, isdir: 0, server_mtime: 1714800000 },
              { fs_id: 2, path: '/apps/myapp/folder', server_filename: 'folder', size: 0, isdir: 1, server_mtime: 1714800001 },
            ],
          },
        },
      ]),
    );

    const entries = await ls(mockCfg, '/apps/myapp/', {}, mockToken());
    expect(entries).toHaveLength(2);
    expect(entries[0].server_filename).toBe('file.txt');
    expect(entries[1].isdir).toBe(1);
  });

  it('ls 空目录返回空数组', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        {
          urlMatcher: (u) => u.includes('method=list'),
          body: { errno: 0, list: [] },
        },
      ]),
    );

    const entries = await ls(mockCfg, '/apps/myapp/empty/', {}, mockToken());
    expect(entries).toHaveLength(0);
  });

  it('mkdir 成功', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        {
          urlMatcher: (u) => u.includes('method=create'),
          body: { errno: 0, path: '/apps/myapp/newdir', isdir: 1 },
        },
      ]),
    );

    const res = await mkdir(mockCfg, '/apps/myapp/newdir', {}, mockToken());
    expect(res.path).toBe('/apps/myapp/newdir');
    expect(res.isdir).toBe(1);
  });

  it('mkdir 幂等处理已存在', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        {
          urlMatcher: (u) => u.includes('method=create'),
          body: { errno: -8, path: '/apps/myapp/exists' },
        },
      ]),
    );

    const res = await mkdir(mockCfg, '/apps/myapp/exists', {}, mockToken());
    expect(res.errno).toBe(0);
    expect(res.path).toBe('/apps/myapp/exists');
  });

  it('move 成功', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        {
          urlMatcher: (u) => u.includes('method=filemanager') && u.includes('opera=move'),
          body: {
            errno: 0,
            info: [{ errno: 0, path: '/apps/myapp/dst/file.txt', src: '/apps/myapp/src/file.txt' }],
          },
        },
      ]),
    );

    const info = await move(mockCfg, '/apps/myapp/src/file.txt', '/apps/myapp/dst/', {}, mockToken());
    expect(info[0].path).toBe('/apps/myapp/dst/file.txt');
  });

  it('copy 成功', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        {
          urlMatcher: (u) => u.includes('method=filemanager') && u.includes('opera=copy'),
          body: {
            errno: 0,
            info: [{ errno: 0, path: '/apps/myapp/dst/file_copy.txt' }],
          },
        },
      ]),
    );

    const info = await copy(mockCfg, '/apps/myapp/src/file.txt', '/apps/myapp/dst/', {}, mockToken());
    expect(info[0].path).toBe('/apps/myapp/dst/file_copy.txt');
  });

  it('rename 成功', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        {
          urlMatcher: (u) => u.includes('method=filemanager') && u.includes('opera=move'),
          body: {
            errno: 0,
            info: [{ errno: 0, path: '/apps/myapp/renamed.txt' }],
          },
        },
      ]),
    );

    const info = await rename(mockCfg, '/apps/myapp/old.txt', 'renamed.txt', mockToken());
    expect(info[0].path).toBe('/apps/myapp/renamed.txt');
  });

  it('softRm 移到 .trash', async () => {
    const today = new Date().toISOString().slice(0, 10);
    vi.stubGlobal(
      'fetch',
      mockFetch([
        {
          urlMatcher: (u) => u.includes('method=create'),
          body: { errno: 0, path: `/apps/myapp/.trash/${today}`, isdir: 1 },
        },
        {
          urlMatcher: (u) => u.includes('method=filemanager') && u.includes('opera=move'),
          body: {
            errno: 0,
            info: [{ errno: 0, path: `/apps/myapp/.trash/${today}/file.txt` }],
          },
        },
      ]),
    );

    const res = await softRm(mockCfg, '/apps/myapp/file.txt', mockToken());
    expect(res.src).toBe('/apps/myapp/file.txt');
    expect(res.movedAs).toBe(`/apps/myapp/.trash/${today}/file.txt`);
  });

  it('hardRm 永久删除', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        {
          urlMatcher: (u) => u.includes('method=filemanager') && u.includes('opera=delete'),
          body: {
            errno: 0,
            info: [{ errno: 0 }],
          },
        },
      ]),
    );

    const res = await hardRm(mockCfg, ['/apps/myapp/file.txt'], mockToken());
    expect(res.errno).toBe(0);
    expect(res.info).toHaveLength(1);
  });

  it('statByPath 通过父目录 ls 找到文件', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        {
          urlMatcher: (u) => u.includes('method=list') && u.includes('dir=%2Fapps%2Fmyapp'),
          body: {
            errno: 0,
            list: [
              { fs_id: 10, path: '/apps/myapp/target.zip', server_filename: 'target.zip', size: 2048, isdir: 0, server_mtime: 1714800000 },
            ],
          },
        },
      ]),
    );

    const entry = await statByPath(mockCfg, '/apps/myapp/target.zip', mockToken());
    expect(entry).not.toBeNull();
    expect(entry!.fs_id).toBe(10);
  });

  it('search 返回匹配项', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        {
          urlMatcher: (u) => u.includes('method=search') && u.includes('key='),
          body: {
            errno: 0,
            list: [
              { fs_id: 20, path: '/apps/myapp/合同A.pdf', server_filename: '合同A.pdf', size: 10240, isdir: 0, server_mtime: 1714800000 },
            ],
            has_more: 0,
          },
        },
      ]),
    );

    const res = await search(mockCfg, { key: '合同', category: 4 }, mockToken());
    expect(res.list).toHaveLength(1);
    expect(res.list[0].server_filename).toBe('合同A.pdf');
    expect(res.hasMore).toBe(false);
  });

  it('errno != 0 时抛出 BaiduError', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        {
          urlMatcher: (u) => u.includes('method=list'),
          body: { errno: -9, errmsg: '文件不存在' },
        },
      ]),
    );

    await expect(ls(mockCfg, '/apps/myapp/notexist/', {}, mockToken())).rejects.toThrow('文件不存在');
  });
});
