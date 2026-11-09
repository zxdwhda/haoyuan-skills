/**
 * 硬删除四级保护守卫。
 *
 * 调用约定:
 * - `fileops.softRm` / `fileops.hardRm` **本身不带任何 UI 交互**,只是裸调 OpenAPI。
 * - CLI 在调 `hardRm` 前 **必须** 先走 `guardHardDelete()` —— 这条流水线就是
 *   delete-policy.md 里写明的「四级保护」。
 *
 * 四级保护(摘自 skill/reference/delete-policy.md):
 *   L1 明确意图:由调用方保证(走到这里说明 CLI 已经看到 `--hard` flag)。
 *   L2 范围列清:本函数 **必定** 打印每项的路径 / 大小 / mtime / isdir+子项数。
 *   L3 逐字确认:`confirmExactString('我确认永久删除')`,任何变体一律拒绝。
 *   L4 软删除最后一问:即使 L3 通过,仍要再问一次「要不要改用软删除」。
 *
 * 立即中止条件(任一命中就抛 PolicyError,不进 L2/L3/L4):
 *   - targets 为空 / 项数 > 100
 *   - 任一路径含通配符 `*` `?`(没展开就来,直接拒)
 *   - 任一路径等于 `/`、`/apps`、当前 scope 的沙盒根 `/apps/<appName>`
 *   - token 剩余 < 60 秒(避免删一半 token 失效)
 *
 * Agent 环境(`CLAUDE_CODE` / `MCP_SERVER` 等)下:
 *   - `--yes` flag **强制忽略**,仍走 L3+L4。这是写死的硬规矩,
 *     不允许 LLM 替用户跳过逐字确认。
 */

import { loadToken } from './config.js';
import {
  color,
  confirmExactString,
  confirmYesNo,
  formatBytes,
  formatTime,
  info,
  isAgentEnv,
} from './ui.js';
import { PolicyError } from './errors.js';
import { getSandboxRoot } from './scope.js';
import type { ConfigFile } from './config.js';

// ---------- 公共类型 ----------

export interface HardDeleteTarget {
  /** 标准化后的网盘路径,如 `/apps/myapp/foo`。调用方需保证已 assertInScope。 */
  path: string;
  size: number;
  /** unix seconds。 */
  mtime: number;
  isdir: boolean;
  /** 仅 isdir=true 时有意义,目录的子项数。 */
  children?: number;
}

export interface HardDeleteGuardOptions {
  cfg: ConfigFile;
  targets: HardDeleteTarget[];
  /** CLI `--yes` flag。Agent 环境下 **强制忽略**。 */
  yes?: boolean;
  /**
   * 跳过 L4 的「最后软删除提议」。仅供测试 / 自动化白名单使用,
   * 默认 false(即必须问)。Agent 环境下即使设了也按 false 处理。
   */
  skipSoftReoffer?: boolean;
}

// ---------- 常量 ----------

/** 用户必须逐字符匹配输入的中文串。 */
export const EXACT_CONFIRM_PHRASE = '我确认永久删除';
/** token 剩余有效期低于此值时直接拒绝,避免删到一半 token 失效。 */
const TOKEN_MIN_REMAINING_SEC = 60;
/** 单批硬删除项数上限。超过强制分批。 */
const MAX_BATCH = 100;

// ---------- 主入口 ----------

/**
 * 硬删除前的四级保护检查。
 *
 * 通过 → resolve(void),调用方继续走 `fileops.hardRm`。
 * 任一级失败 → throw `PolicyError`,CLI 兜底翻译成「策略拒绝: ...」。
 */
export async function guardHardDelete(opts: HardDeleteGuardOptions): Promise<void> {
  const { cfg, targets } = opts;

  // ---- 0. 输入合法性 + 立即中止条件 ----
  if (!targets || targets.length === 0) {
    throw new PolicyError('targets-empty', '硬删除调用未传入任何目标。');
  }
  if (targets.length > MAX_BATCH) {
    throw new PolicyError(
      'too-many',
      `单次硬删除项数 ${targets.length} 超过上限 ${MAX_BATCH},请分批执行。`,
    );
  }

  for (const t of targets) {
    if (typeof t.path !== 'string' || !t.path.startsWith('/')) {
      throw new PolicyError('bad-path', `非法目标路径:${String(t.path)}`);
    }
    if (t.path.includes('*') || t.path.includes('?')) {
      throw new PolicyError(
        'wildcard-unexpanded',
        `路径含通配符未展开:${t.path}。请先 \`pan.cjs ls\` / \`pan.cjs search\` 列出再删。`,
      );
    }
  }

  const forbiddenRoots = new Set<string>(['/', '/apps']);
  if (cfg.scope === 'sandbox') {
    try {
      forbiddenRoots.add(getSandboxRoot(cfg));
    } catch {
      /* appName 缺失时 getSandboxRoot 抛 ScopeError;上层调 assertInScope 时已拦,
         这里仅是冗余防御,忽略即可。 */
    }
  }
  for (const t of targets) {
    if (forbiddenRoots.has(t.path)) {
      throw new PolicyError(
        'root-path',
        `禁止硬删除根目录:${t.path}。如要清空,请逐项指定子项。`,
      );
    }
  }

  // ---- 1. token 剩余检查 ----
  try {
    const tok = loadToken();
    if (tok) {
      const remaining = tok.expires_at - Math.floor(Date.now() / 1000);
      if (remaining < TOKEN_MIN_REMAINING_SEC) {
        throw new PolicyError(
          'token-expiring',
          `access_token 剩余 ${Math.max(0, remaining)} 秒,过短,可能导致删除中途失效。请先 \`pan.cjs status\` 检查并续期 / 重新登录,再尝试硬删除。`,
        );
      }
    }
  } catch (e) {
    if (e instanceof PolicyError) throw e;
    /* loadToken 抛 ConfigError 由上层兜底,这里不阻塞。 */
  }

  // ---- 2. Agent 环境下强制忽略 --yes ----
  const agent = isAgentEnv();
  const effectiveYes = opts.yes === true && !agent;
  const skipSoftReoffer = opts.skipSoftReoffer === true && !agent;

  if (agent && opts.yes === true) {
    info(
      color.yellow(
        '检测到 Agent 环境(CLAUDE_CODE / MCP_SERVER / ANTHROPIC_API_KEY 等),--yes 已被强制忽略,仍要求逐字确认。',
      ),
    );
  }

  // ---- L2:范围列清 ----
  printDeleteList(targets);

  if (effectiveYes) {
    info(
      color.yellow(
        '--yes 已显式提供且非 Agent 环境,跳过 L3 逐字确认与 L4 软删除提议。',
      ),
    );
    return;
  }

  // ---- L3:逐字确认 ----
  info('');
  info(color.red(color.bold('⚠ 即将硬删除以上目标,操作 不 可 逆。')));
  info(
    `如需取消,请直接回车或输入其他任意内容。\n确认请 ${color.bold('逐字')} 输入:${color.bold(EXACT_CONFIRM_PHRASE)}`,
  );
  const r1 = await confirmExactString(EXACT_CONFIRM_PHRASE, '逐字确认 >');
  if (!r1.ok) {
    throw new PolicyError(
      'phrase-mismatch',
      `逐字确认失败(必须严格输入「${EXACT_CONFIRM_PHRASE}」,大小写、空格、变体均不接受),已取消硬删除。`,
    );
  }

  // ---- L4:最后一次软删除提议 ----
  if (!skipSoftReoffer) {
    info('');
    info(
      color.dim(
        '最后一次提醒:你也可以改用软删除(移动到 .trash/<日期>/),7 天内仍可恢复。',
      ),
    );
    info(color.dim('回车 / y 改走软删除;输入 n 才会真正调用 OpenAPI 永久删除。'));
    // defaultNo=false → 默认倾向「软删除」(更安全)
    const wantsSoft = await confirmYesNo('改用软删除?', false);
    if (wantsSoft) {
      throw new PolicyError(
        'user-chose-soft',
        '用户在最后一关选择改走软删除。请改用 `pan.cjs rm <path>`(不带 --hard)。',
      );
    }
  }

  // 四级全过,允许调用方继续 hardRm。
}

// ---------- 内部:范围打印 ----------

function printDeleteList(targets: HardDeleteTarget[]): void {
  const totalBytes = targets.reduce((s, t) => s + (t.isdir ? 0 : t.size), 0);
  info(color.bold(`即将永久删除 ${targets.length} 项,合计 ${formatBytes(totalBytes)}:`));
  const head = targets.slice(0, 5);
  for (const t of head) {
    info('  ' + formatTargetLine(t));
  }
  if (targets.length > 5) {
    const remainingBytes = targets
      .slice(5)
      .reduce((s, t) => s + (t.isdir ? 0 : t.size), 0);
    info(
      color.dim(
        `  ... 还有 ${targets.length - 5} 项未在此列出(其中文件部分合计 ${formatBytes(remainingBytes)})`,
      ),
    );
  }
}

function formatTargetLine(t: HardDeleteTarget): string {
  const mtime = color.dim(formatTime(t.mtime));
  if (t.isdir) {
    const childInfo =
      typeof t.children === 'number' ? `(子项 ${t.children})` : '(子项数未知)';
    return `- ${t.path}/  ${color.cyan('目录' + childInfo)}  ${mtime}`;
  }
  return `- ${t.path}  ${formatBytes(t.size).padStart(8)}  ${mtime}`;
}
