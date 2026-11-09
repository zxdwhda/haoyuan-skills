import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { writeFileSync, unlinkSync } from 'node:fs';
import { upload } from '../../src/upload.js';
import type { ConfigFile } from '../../src/config.js';

const XPAN_HOST = 'https://pan.baidu.com';
const PCS_HOST = 'https://d.pcs.baidu.com';

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

describe('upload contract (mock fetch)', () => {
  let tempFile: string;

  beforeEach(() => {
    tempFile = `/tmp/bd-test-upload-${Date.now()}.txt`;
    writeFileSync(tempFile, 'hello world test content for upload');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    try { unlinkSync(tempFile); } catch { /* ignore */ }
  });

  it('秒传命中直接返回', async () => {
    vi.stubGlobal(
      'fetch',
      makeFetch([
        {
          match: (u) => u.includes('/rest/2.0/xpan/file') && u.includes('method=precreate'),
          body: {
            errno: 0,
            return_type: 2,
            path: '/apps/myapp/test.txt',
            info: { fs_id: 999, md5: 'abc123', size: 35 },
          },
        },
      ]),
    );

    const res = await upload(mockCfg, tempFile, '/apps/myapp/test.txt', {}, mockToken());
    expect(res.rapid).toBe(true);
    expect(res.fs_id).toBe(999);
  });

  it('分片上传完整流程 precreate -> superfile2 -> create', async () => {
    vi.stubGlobal(
      'fetch',
      makeFetch([
        {
          match: (u) => u.includes('/rest/2.0/xpan/file') && u.includes('method=precreate'),
          body: {
            errno: 0,
            return_type: 1,
            path: '/apps/myapp/test.txt',
            uploadid: 'UPLOAD-12345',
            block_list: [0],
          },
        },
        {
          match: (u) => u.includes('/rest/2.0/pcs/superfile2'),
          body: { errno: 0, md5: 'piece-md5-0' },
        },
        {
          match: (u) => u.includes('/rest/2.0/xpan/file') && u.includes('method=create'),
          body: {
            errno: 0,
            path: '/apps/myapp/test.txt',
            fs_id: 888,
            md5: 'final-md5',
          },
        },
      ]),
    );

    const res = await upload(mockCfg, tempFile, '/apps/myapp/test.txt', {}, mockToken());
    expect(res.rapid).toBe(false);
    expect(res.fs_id).toBe(888);
    expect(res.parts).toBeGreaterThanOrEqual(1);
  });
});
