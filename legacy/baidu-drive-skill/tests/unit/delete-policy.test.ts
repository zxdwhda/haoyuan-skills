import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  guardHardDelete,
  EXACT_CONFIRM_PHRASE,
  type HardDeleteGuardOptions,
} from '../../src/delete-policy.js';
import { PolicyError } from '../../src/errors.js';

// mocks
vi.mock('../../src/config.js', () => ({
  loadToken: vi.fn(),
}));

vi.mock('../../src/ui.js', async () => {
  const actual = await vi.importActual('../../src/ui.js');
  return {
    ...(actual as object),
    isAgentEnv: vi.fn(() => false),
    confirmExactString: vi.fn(),
    confirmYesNo: vi.fn(),
    info: vi.fn(),
  };
});

vi.mock('../../src/scope.js', () => ({
  getSandboxRoot: vi.fn(() => '/apps/myapp'),
}));

import { loadToken } from '../../src/config.js';
import { isAgentEnv, confirmExactString, confirmYesNo } from '../../src/ui.js';

const mockCfg = {
  scope: 'sandbox' as const,
  appName: 'myapp',
  allowedPaths: [],
  trash: { retainDays: 7 },
  concurrency: { uploadParts: 4, downloadChunks: 4 },
  version: 1,
};

function opts(targets: HardDeleteGuardOptions['targets'], extra?: Partial<HardDeleteGuardOptions>): HardDeleteGuardOptions {
  return { cfg: mockCfg, targets, ...extra };
}

/** 断言 PolicyError 的 reason 字段 */
async function expectPolicyReason(
  fn: () => Promise<unknown>,
  expectedReason: string,
): Promise<void> {
  try {
    await fn();
    expect.fail('期望抛出 PolicyError,但未抛出');
  } catch (e) {
    expect(e).toBeInstanceOf(PolicyError);
    expect((e as PolicyError).reason).toBe(expectedReason);
  }
}

describe('guardHardDelete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isAgentEnv).mockReturnValue(false);
    vi.mocked(loadToken).mockReturnValue(null);
  });

  it('空 targets 直接抛 PolicyError(targets-empty)', async () => {
    await expectPolicyReason(() => guardHardDelete(opts([])), 'targets-empty');
  });

  it('超过 100 项直接抛 PolicyError(too-many)', async () => {
    const targets = Array.from({ length: 101 }, (_, i) => ({
      path: `/apps/myapp/f${i}`,
      size: 1,
      mtime: 1,
      isdir: false,
    }));
    await expectPolicyReason(() => guardHardDelete(opts(targets)), 'too-many');
  });

  it('路径含通配符直接抛 PolicyError(wildcard-unexpanded)', async () => {
    await expectPolicyReason(
      () => guardHardDelete(opts([{ path: '/apps/myapp/*.txt', size: 1, mtime: 1, isdir: false }])),
      'wildcard-unexpanded',
    );
  });

  it('禁止删除根目录 /(root-path)', async () => {
    await expectPolicyReason(
      () => guardHardDelete(opts([{ path: '/', size: 0, mtime: 1, isdir: true }])),
      'root-path',
    );
  });

  it('禁止删除 /apps(root-path)', async () => {
    await expectPolicyReason(
      () => guardHardDelete(opts([{ path: '/apps', size: 0, mtime: 1, isdir: true }])),
      'root-path',
    );
  });

  it('禁止删除沙盒根 /apps/myapp(root-path)', async () => {
    await expectPolicyReason(
      () => guardHardDelete(opts([{ path: '/apps/myapp', size: 0, mtime: 1, isdir: true }])),
      'root-path',
    );
  });

  it('token 剩余 <60 秒抛 PolicyError(token-expiring)', async () => {
    vi.mocked(loadToken).mockReturnValue({
      access_token: 'tok',
      expires_at: Math.floor(Date.now() / 1000) + 30,
      obtained_at: 1,
      kind: 'device',
      scope: 'basic,netdisk',
    });
    await expectPolicyReason(
      () => guardHardDelete(opts([{ path: '/apps/myapp/a.txt', size: 1, mtime: 1, isdir: false }])),
      'token-expiring',
    );
  });

  it('--yes 非 Agent 环境跳过 L3+L4', async () => {
    const target = { path: '/apps/myapp/a.txt', size: 1024, mtime: 1714800000, isdir: false };
    await guardHardDelete(opts([target], { yes: true }));
    expect(confirmExactString).not.toHaveBeenCalled();
    expect(confirmYesNo).not.toHaveBeenCalled();
  });

  it('Agent 环境强制忽略 --yes', async () => {
    vi.mocked(isAgentEnv).mockReturnValue(true);
    vi.mocked(confirmExactString).mockResolvedValue({ ok: true, given: EXACT_CONFIRM_PHRASE });
    vi.mocked(confirmYesNo).mockResolvedValue(false);

    const target = { path: '/apps/myapp/a.txt', size: 1024, mtime: 1714800000, isdir: false };
    await guardHardDelete(opts([target], { yes: true }));
    expect(confirmExactString).toHaveBeenCalled();
  });

  it('L3 逐字确认失败抛 PolicyError(phrase-mismatch)', async () => {
    vi.mocked(confirmExactString).mockResolvedValue({ ok: false, given: 'wrong' });

    const target = { path: '/apps/myapp/a.txt', size: 1024, mtime: 1714800000, isdir: false };
    await expectPolicyReason(() => guardHardDelete(opts([target])), 'phrase-mismatch');
  });

  it('L3 通过但 L4 用户选择软删除抛 PolicyError(user-chose-soft)', async () => {
    vi.mocked(confirmExactString).mockResolvedValue({ ok: true, given: EXACT_CONFIRM_PHRASE });
    vi.mocked(confirmYesNo).mockResolvedValue(true);

    const target = { path: '/apps/myapp/a.txt', size: 1024, mtime: 1714800000, isdir: false };
    await expectPolicyReason(() => guardHardDelete(opts([target])), 'user-chose-soft');
  });

  it('四级全过 resolve', async () => {
    vi.mocked(confirmExactString).mockResolvedValue({ ok: true, given: EXACT_CONFIRM_PHRASE });
    vi.mocked(confirmYesNo).mockResolvedValue(false);

    const target = { path: '/apps/myapp/a.txt', size: 1024, mtime: 1714800000, isdir: false };
    await expect(guardHardDelete(opts([target]))).resolves.toBeUndefined();
  });
});
