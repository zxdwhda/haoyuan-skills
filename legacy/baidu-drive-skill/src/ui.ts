/**
 * 终端 UI 工具:OSC8 超链接、彩色输出、进度条、stdin 提示、逐字串确认。
 *
 * 不依赖任何重型库。`picocolors` 是 deps,但我们用一个薄层包一下,
 * 让它在 NO_COLOR / 非 TTY 时自动降级为纯文本。
 */

import { createInterface } from 'node:readline';
import { stdin, stdout, stderr } from 'node:process';
import pc from 'picocolors';

// ---------- agent / TTY 检测 ----------

/**
 * 是否运行在 AI Agent 上下文里(Claude Code / Anthropic SDK / MCP server)。
 * delete-policy 在这里强制忽略 `--yes`,绝不允许 LLM 替用户跳过逐字确认。
 */
export function isAgentEnv(): boolean {
  return Boolean(
    process.env.CLAUDE_CODE ||
      process.env.CLAUDECODE ||
      process.env.ANTHROPIC_API_KEY ||
      process.env.MCP_SERVER ||
      process.env.MCP_SERVER_NAME ||
      process.env.AGENT_MODE,
  );
}

export function isInteractiveTTY(): boolean {
  return Boolean(stdin.isTTY) && Boolean(stdout.isTTY);
}

function colorEnabled(): boolean {
  if (process.env.NO_COLOR) return false;
  if (process.env.FORCE_COLOR) return true;
  return Boolean(stdout.isTTY);
}

// ---------- 彩色输出 ----------

export const color = {
  red: (s: string) => (colorEnabled() ? pc.red(s) : s),
  green: (s: string) => (colorEnabled() ? pc.green(s) : s),
  yellow: (s: string) => (colorEnabled() ? pc.yellow(s) : s),
  blue: (s: string) => (colorEnabled() ? pc.blue(s) : s),
  cyan: (s: string) => (colorEnabled() ? pc.cyan(s) : s),
  gray: (s: string) => (colorEnabled() ? pc.gray(s) : s),
  bold: (s: string) => (colorEnabled() ? pc.bold(s) : s),
  dim: (s: string) => (colorEnabled() ? pc.dim(s) : s),
  underline: (s: string) => (colorEnabled() ? pc.underline(s) : s),
};

// ---------- 日志 ----------

export function info(msg: string): void {
  stdout.write(msg + '\n');
}

export function warn(msg: string): void {
  stderr.write(color.yellow('⚠ ') + msg + '\n');
}

export function error(msg: string): void {
  stderr.write(color.red('✖ ') + msg + '\n');
}

export function success(msg: string): void {
  stdout.write(color.green('✓ ') + msg + '\n');
}

// ---------- OSC8 超链接 ----------

const SUPPORTS_OSC8 = (() => {
  if (!stdout.isTTY) return false;
  // 多数现代终端(iTerm2/WezTerm/kitty/VS Code/macOS Terminal 最新)都支持
  // 不支持的会显示原始转义码,所以 fallback 给纯文本
  if (process.env.TERM_PROGRAM === 'Apple_Terminal') {
    // macOS Terminal 实际不支持,降级
    return false;
  }
  if (process.env.TERM === 'dumb') return false;
  return true;
})();

/**
 * 在终端里产出可点击的超链接。不支持 OSC8 时退化为 `text (url)`。
 */
export function osc8(text: string, url: string): string {
  if (SUPPORTS_OSC8) {
    return `\x1b]8;;${url}\x1b\\${text}\x1b]8;;\x1b\\`;
  }
  if (text === url) return text;
  return `${text} (${url})`;
}

// ---------- stdin 提示 ----------

/**
 * 从 stdin 读一行(带回车)。pipe 输入也能读。
 * 注意:这个函数会持有 stdin,调用方需 await 完。
 */
export async function prompt(question: string): Promise<string> {
  if (!stdin.readable || stdin.destroyed) {
    throw new Error('stdin 不可读,无法读取用户输入');
  }
  return new Promise((resolve) => {
    const rl = createInterface({ input: stdin, output: stderr, terminal: stdout.isTTY });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

/**
 * 隐藏式输入(用于授权码、token 等敏感串)。打印 `*` 替代字符。
 * 简化版:只在 TTY 下隐藏,管道输入直接当 prompt 用。
 */
export async function promptHidden(question: string): Promise<string> {
  if (!stdin.isTTY) {
    return prompt(question);
  }
  return new Promise((resolve, reject) => {
    stderr.write(question);
    const oldRaw = stdin.isRaw ?? false;
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    let buf = '';
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        const code = ch.charCodeAt(0);
        if (code === 13 || code === 10) {
          // Enter
          stdin.removeListener('data', onData);
          stdin.setRawMode?.(oldRaw);
          stdin.pause();
          stderr.write('\n');
          resolve(buf);
          return;
        } else if (code === 3) {
          // Ctrl-C
          stdin.removeListener('data', onData);
          stdin.setRawMode?.(oldRaw);
          stdin.pause();
          stderr.write('\n');
          reject(new Error('用户取消(Ctrl-C)'));
          return;
        } else if (code === 127 || code === 8) {
          // Backspace
          if (buf.length > 0) {
            buf = buf.slice(0, -1);
            stderr.write('\b \b');
          }
        } else {
          buf += ch;
          stderr.write('*');
        }
      }
    };
    stdin.on('data', onData);
  });
}

// ---------- 逐字串确认(硬删除核心) ----------

export interface ExactStringConfirmResult {
  ok: boolean;
  /** 原始输入(失败时调用方可决定是否在错误消息里露出来,但我们不会自动 log)。 */
  given: string;
}

/**
 * 要求用户**逐字符匹配**输入指定字符串(不允许多/少空格、大小写不同、变体)。
 * 返回 ok=true 才允许调用方继续。
 */
export async function confirmExactString(
  expected: string,
  question = '请逐字输入以确认:',
): Promise<ExactStringConfirmResult> {
  const ans = (await prompt(`${question} `)).trimEnd();
  // 严格逐字符匹配。允许尾部回车被 trimEnd 吃掉,但不容忍其他空格或字符。
  return { ok: ans === expected, given: ans };
}

/**
 * 简单的 yes/no 确认,缺省 no。
 * 接受 y/yes/Y/确认/是;其他全部视为 no。
 */
export async function confirmYesNo(question: string, defaultNo = true): Promise<boolean> {
  const hint = defaultNo ? '[y/N]' : '[Y/n]';
  const ans = (await prompt(`${question} ${hint} `)).trim().toLowerCase();
  if (ans === '') return !defaultNo;
  return ans === 'y' || ans === 'yes' || ans === '是' || ans === '确认';
}

// ---------- 进度条 ----------

export interface ProgressOptions {
  total: number; // 总字节数(或总单位数)
  label?: string; // 前缀(如 "上传 file.zip")
  width?: number; // 条宽,默认 30
}

export class ProgressBar {
  private current = 0;
  private readonly total: number;
  private readonly label: string;
  private readonly width: number;
  private readonly start = Date.now();
  private lastRender = 0;
  private rendered = false;

  constructor(opts: ProgressOptions) {
    this.total = Math.max(1, opts.total);
    this.label = opts.label ?? '';
    this.width = opts.width ?? 30;
  }

  update(current: number): void {
    this.current = Math.min(this.total, current);
    const now = Date.now();
    if (now - this.lastRender < 80 && this.current < this.total) return;
    this.lastRender = now;
    this.render();
  }

  add(delta: number): void {
    this.update(this.current + delta);
  }

  done(): void {
    this.current = this.total;
    this.render();
    if (stdout.isTTY) stdout.write('\n');
  }

  private render(): void {
    const pct = this.current / this.total;
    const filled = Math.round(this.width * pct);
    const bar = '█'.repeat(filled) + '░'.repeat(this.width - filled);
    const speedHuman = this.formatSpeed();
    const out = `${this.label} [${bar}] ${(pct * 100).toFixed(1)}%  ${formatBytes(this.current)} / ${formatBytes(this.total)}  ${speedHuman}`;
    if (stdout.isTTY) {
      stdout.write('\r' + out);
      this.rendered = true;
    } else if (!this.rendered) {
      // 非 TTY:只在开始和结束打两次,避免 log 爆炸
      stdout.write(out + '\n');
      this.rendered = true;
    }
  }

  private formatSpeed(): string {
    const elapsed = (Date.now() - this.start) / 1000;
    if (elapsed <= 0) return '';
    const bps = this.current / elapsed;
    return `${formatBytes(bps)}/s`;
  }
}

// ---------- 格式化 ----------

export function formatBytes(bytes: number): string {
  if (bytes < 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatTime(unix: number): string {
  if (!unix || unix <= 0) return '-';
  const d = new Date(unix * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function formatDuration(seconds: number): string {
  if (seconds < 0) seconds = 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h${m}m${s}s`;
  if (m > 0) return `${m}m${s}s`;
  return `${s}s`;
}
