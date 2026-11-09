import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { listRecursive, semanticSearch } from '../../src/fileops.js';
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

describe('recursive list contract (mock fetch)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('listRecursive 递归返回所有文件', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        {
          urlMatcher: (u) => u.includes('/rest/2.0/xpan/multimedia') && u.includes('method=listall'),
          body: {
            errno: 0,
            list: [
              { fs_id: 1, path: '/apps/myapp/a.txt', server_filename: 'a.txt', size: 100, isdir: 0, server_mtime: 1714800000 },
              { fs_id: 2, path: '/apps/myapp/sub/b.txt', server_filename: 'b.txt', size: 200, isdir: 0, server_mtime: 1714800001 },
              { fs_id: 3, path: '/apps/myapp/sub/c.txt', server_filename: 'c.txt', size: 300, isdir: 0, server_mtime: 1714800002 },
            ],
            has_more: 0,
          },
        },
      ]),
    );

    const entries = await listRecursive(mockCfg, '/apps/myapp/', {}, mockToken());
    expect(entries).toHaveLength(3);
    expect(entries[0].server_filename).toBe('a.txt');
    expect(entries[1].path).toBe('/apps/myapp/sub/b.txt');
  });

  it('listRecursive 多页翻页', async () => {
    let page = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('method=listall')) {
          page++;
          if (page === 1) {
            return {
              ok: true,
              status: 200,
              json: async () => ({
                errno: 0,
                list: [{ fs_id: 1, path: '/apps/myapp/p1.txt', server_filename: 'p1.txt', size: 100, isdir: 0, server_mtime: 1714800000 }],
                has_more: 1,
                cursor: 1,
              }),
              text: async () => '',
            } as Response;
          }
          return {
            ok: true,
            status: 200,
            json: async () => ({
              errno: 0,
              list: [{ fs_id: 2, path: '/apps/myapp/p2.txt', server_filename: 'p2.txt', size: 200, isdir: 0, server_mtime: 1714800001 }],
              has_more: 0,
            }),
            text: async () => '',
          } as Response;
        }
        throw new Error(`Unhandled: ${url}`);
      }),
    );

    const entries = await listRecursive(mockCfg, '/apps/myapp/', { limit: 1 }, mockToken());
    expect(entries).toHaveLength(2);
    expect(entries[0].server_filename).toBe('p1.txt');
    expect(entries[1].server_filename).toBe('p2.txt');
    expect(page).toBe(2);
  });

  it('listRecursive 传参包含 recursion=1', async () => {
    const fetchSpy = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ errno: 0, list: [], has_more: 0 }),
      text: async () => '',
    } as Response));
    vi.stubGlobal('fetch', fetchSpy);

    await listRecursive(mockCfg, '/apps/myapp/', {}, mockToken());
    expect(fetchSpy).toHaveBeenCalled();
    const url = fetchSpy.mock.calls[0]![0] as string;
    expect(url).toContain('recursion=1');
    expect(url).toContain('method=listall');
  });
});

describe('semantic search contract (mock fetch)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('semanticSearch POST JSON 并返回结果', async () => {
    const fetchSpy = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        errno: 0,
        list: [
          {
            category: '4',
            filename: '合同A.pdf',
            fsid: 100,
            isdir: 0,
            parent_path: '/apps/myapp',
            path: '/apps/myapp/合同A.pdf',
            content: '合同金额100万元',
            server_ctime: 1714800000,
            server_mtime: 1714800000,
            size: 10240,
          },
        ],
      }),
      text: async () => '',
    } as Response));
    vi.stubGlobal('fetch', fetchSpy);

    const list = await semanticSearch(mockCfg, { query: '帮我找合同文件', searchType: 1 }, mockToken());
    expect(list).toHaveLength(1);
    expect(list[0].filename).toBe('合同A.pdf');
    expect(list[0].content).toBe('合同金额100万元');

    // 验证 POST JSON
    const [, init] = fetchSpy.mock.calls[0]!;
    expect((init as RequestInit).method).toBe('POST');
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');

    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.scene).toBe('mcpserver');
    expect(body.query).toBe('帮我找合同文件');
    expect(body.search_type).toBe(1);
  });

  it('semanticSearch 支持多 category 和 dir', async () => {
    const fetchSpy = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ errno: 0, list: [] }),
      text: async () => '',
    } as Response));
    vi.stubGlobal('fetch', fetchSpy);

    await semanticSearch(mockCfg, {
      query: '测试',
      dir: '/apps/myapp/docs',
      category: [4, 5],
      num: 200,
      searchType: 2,
    }, mockToken());

    const [, init] = fetchSpy.mock.calls[0]!;
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.dir).toEqual(['/apps/myapp/docs']);
    expect(body.category).toEqual([4, 5]);
    expect(body.num).toBe(200);
    expect(body.search_type).toBe(2);
  });

  it('semanticSearch 空结果返回空数组', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        {
          urlMatcher: (u) => u.includes('/xpan/unisearch'),
          body: { errno: 0, list: [] },
        },
      ]),
    );

    const list = await semanticSearch(mockCfg, { query: '不存在的东西' }, mockToken());
    expect(list).toHaveLength(0);
  });
});
