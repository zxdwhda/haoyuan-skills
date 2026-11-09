/**
 * `pan.cjs login` 子命令实现。
 *
 * 默认走 device code;`--oob` 强制 OOB(SSH/WSL 无浏览器);`--manual` 粘贴限时体验 token。
 */

import {
  buildOobAuthorizeUrl,
  exchangeOobCode,
  loginDevice,
  loginManual,
  resolveCredentials,
  type CredentialsOpts,
} from './auth.js';
import { loadConfig } from './config.js';
import { color, info, isAgentEnv, osc8, prompt, promptHidden, success, warn } from './ui.js';
import { AuthError } from './errors.js';

export interface LoginOpts {
  mode?: 'device' | 'oob' | 'manual' | 'auto';
  clientId?: string;
  clientSecret?: string;
  /** manual 模式专用,允许 CLI 直接传 token(危险,仅自动化场景);更建议 stdin 隐藏输入。 */
  token?: string;
  /** 跳过免责声明(只允许在显式开发调试时;CLI 默认不暴露) */
  skipDisclaimer?: boolean;
}

const DISCLAIMER = `
${color.bold(color.yellow('⚠ 登录前请阅读'))}
本 skill 通过百度网盘 OpenAPI 操作你的网盘。在执行登录前请确认:

  1. 你已 ${color.bold('备份重要数据')}。本 skill 处于 BETA 阶段,人为操作或 AI 误判都可能导致数据丢失。
  2. 你会 ${color.bold('人工审核每条 AI 执行的命令')},尤其是 upload / mv / rename / rm。
  3. 公共环境(共享机器、Codespace、容器)使用完后请运行 ${color.cyan('pan.cjs logout')}。
  4. ${color.bold('严禁')} 把 ~/.config/baidu-drive-skill/token.json 的内容粘贴到任何对话或日志里。
`;

export async function runLogin(opts: LoginOpts): Promise<void> {
  const cfg = loadConfig();
  const credsOpts: CredentialsOpts = {
    clientId: opts.clientId,
    clientSecret: opts.clientSecret,
  };
  const mode = opts.mode ?? 'auto';

  if (!opts.skipDisclaimer || isAgentEnv()) {
    if (opts.skipDisclaimer && isAgentEnv()) {
      warn('检测到 Agent 环境,--yes 被忽略,仍要求人工确认登录免责声明。');
    }
    info(DISCLAIMER);
    const ok = (await prompt('是否继续登录? [y/N] ')).trim().toLowerCase();
    if (ok !== 'y' && ok !== 'yes') {
      info('已取消登录。');
      return;
    }
  }

  const resolvedMode = mode === 'auto' ? pickAuto() : mode;

  switch (resolvedMode) {
    case 'device':
      await runDeviceLogin(cfg, credsOpts);
      return;
    case 'oob':
      await runOobLogin(cfg, credsOpts);
      return;
    case 'manual':
      await runManualLogin(opts.token);
      return;
    default:
      throw new AuthError(`未知登录模式: ${String(resolvedMode)}`);
  }
}

function pickAuto(): 'device' | 'oob' {
  // SSH / WSL / 容器场景不一定能弹浏览器,但用户在另一个浏览器窗口扫码也行。
  // 默认 device(用户友好),失败再让用户加 --oob。
  return 'device';
}

async function runDeviceLogin(
  cfg: ReturnType<typeof loadConfig>,
  creds: CredentialsOpts,
): Promise<void> {
  // 调一下 resolveCredentials,让缺凭据的错误尽早抛
  resolveCredentials(cfg, creds);
  info('');
  info(color.bold('=== 登录方式: device code (扫码 / 在线授权) ==='));
  const tok = await loginDevice(cfg, creds);
  success(`登录成功。token 有效期至: ${formatExpiry(tok.expires_at)}`);
}

async function runOobLogin(
  cfg: ReturnType<typeof loadConfig>,
  creds: CredentialsOpts,
): Promise<void> {
  const resolved = resolveCredentials(cfg, creds);
  info('');
  info(color.bold('=== 登录方式: OOB authorization code (无浏览器/SSH 用) ==='));
  const url = buildOobAuthorizeUrl(resolved);
  info('1) 在浏览器打开下面的链接,登录百度账号并允许授权:');
  info('   ' + osc8(url, url));
  info('2) 授权后页面会显示一串 32 位的授权码。');
  info('3) 把授权码粘贴到下面(隐藏输入,Enter 提交):');
  const code = await promptHidden('授权码: ');
  if (!code || code.trim().length === 0) {
    warn('授权码为空,已取消登录。');
    return;
  }
  const tok = await exchangeOobCode(resolved, code);
  success(`登录成功。token 有效期至: ${formatExpiry(tok.expires_at)}`);
}

async function runManualLogin(presetToken?: string): Promise<void> {
  info('');
  info(color.bold('=== 登录方式: manual paste (限时体验) ==='));
  warn('manual 模式下没有 refresh_token,过期后必须重新粘贴。仅推荐用于短期试用。');
  const token = presetToken ?? (await promptHidden('access_token: '));
  if (!token || token.trim().length === 0) {
    warn('access_token 为空,已取消登录。');
    return;
  }
  const tok = await loginManual(token);
  success(`已保存 manual token,过期时间 ≈ ${formatExpiry(tok.expires_at)}(无自动续期)。`);
}

function formatExpiry(unix: number): string {
  const d = new Date(unix * 1000);
  return d.toISOString().replace('T', ' ').slice(0, 19) + ' (UTC)';
}
