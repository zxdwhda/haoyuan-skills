import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createShare, transferShare } from '../../src/share.js';
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

function makeFetch(responses: Array<{ match: (url: string) => boolean; body: unknown }>) {
  return vi.fn(async (url: string) => {
    for (const r of responses) {
      if (r.match(url)) {
        return {
          ok: true,
          status: 200,
          json: async () => r.body,
          text: async () => JSON.stringify(r.body),
        } as Response;
      }
    }
    throw new Error(`Unhandled fetch: ${url}`);
  });
}

describe('share contract (mock fetch)', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('createShare 成功', async () => {
    vi.stubGlobal(
      'fetch',
      makeFetch([
        {
          match: (u) => u.includes('/rest/2.0/xpan/share') && u.includes('method=set'),
          body: {
            errno: 0,
            link: 'https://pan.baidu.com/s/1AbCdEfG',
            shortlink: 'https://pan.baidu.com/s/1short',
            pwd: '1234',
            shareid: 555,
          },
        },
      ]),
    );

    const res = await createShare(mockCfg, [12345], { pwd: '1234', period: 7 }, mockToken());
    expect(res.errno).toBe(0);
    expect(res.link).toBe('https://pan.baidu.com/s/1AbCdEfG');
    expect(res.pwd).toBe('1234');
  });

  it('transferShare 成功', async () => {
    vi.stubGlobal(
      'fetch',
      makeFetch([
        {
          match: (u) => u.includes('/rest/2.0/xpan/share') && u.includes('method=transfer'),
          body: {
            errno: 0,
            extra: {
              list: [
                { from: '/share/file.zip', to: '/apps/myapp/file.zip' },
              ],
            },
          },
        },
      ]),
    );

    const res = await transferShare(
      mockCfg,
      { shareid: 555, uk: 123, pwd: '1234', destPath: '/apps/myapp/' },
      mockToken(),
    );
    expect(res.errno).toBe(0);
    expect(res.extra?.list?.[0]?.to).toBe('/apps/myapp/file.zip');
  });

  it('createShare 非会员设置密码报错 errno=-30', async () => {
    vi.stubGlobal(
      'fetch',
      makeFetch([
        {
          match: (u) => u.includes('method=set'),
          body: { errno: -30 },
        },
      ]),
    );

    await expect(
      createShare(mockCfg, [12345], { pwd: '1234' }, mockToken()),
    ).rejects.toThrow();
  });
});
