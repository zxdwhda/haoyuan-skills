/**
 * Baidu OpenAPI errno -> 友好提示映射 + 自定义错误类。
 *
 * 设计:
 * - HTTP 200 但 errno != 0 是百度 OpenAPI 的常见模式。client.ts 会做双判断,
 *   从这里取人类可读消息。
 * - 错误分两类:
 *   * BaiduError —— 百度服务器返回的业务错误
 *   * 本地策略错误(AuthError / ScopeError / PolicyError / ConfigError)—— 客户端拦截
 */

export type Errno = number;

const ERRNO_MESSAGES = new Map<Errno, string>([
  [0, 'OK'],
  [-6, '身份验证失败'],
  [-7, '远端文件名错误'],
  [-8, '文件名已存在'],
  [-9, '文件不存在'],
  [-10, '云端容量已满'],
  [2, '参数错误'],
  [6, '不允许接入用户数据'],
  [10, '创建文件失败,本目录已存在同名文件'],
  [12, '部分文件已存在'],
  [105, '链接错误,请检查分享链接是否正确'],
  [110, 'access_token 已失效,请重新登录'],
  [111, 'access_token 已过期,请重新登录'],
  [2131, '该分享不存在'],
  [13045, '不允许转存自己的分享(文件已经在你的网盘中)'],
  [31021, '网络错误,请稍后重试'],
  [31023, '参数错误'],
  [31024, '没有申请上传权限'],
  [31034, '请求频率过高,请降低速率后重试'],
  [31062, '文件名无效'],
  [31064, '不允许访问该目录'],
  [31066, '文件不存在或已删除'],
  [31075, '同名文件已存在'],
  [31202, '文件不存在'],
  [31299, '第一个分片大小不正确'],
  [31363, '分片缺失'],
  [31364, '分片大小超出限制'],
  [31390, 'access_token 失效或权限不足,请重新登录'],
  [31399, '调用太频繁,请稍后再试'],
  [42000, '服务异常,请稍后再试'],
  [42213, '没有该接口权限,请确认应用已勾选 netdisk 权限'],
  [42214, '调用频率超限,请降低请求速率'],
]);

/**
 * 把 errno 映射成友好中文提示。未识别的 errno 返回带原值的兜底消息。
 */
export function mapErrno(errno: Errno, fallback?: string): string {
  const known = ERRNO_MESSAGES.get(errno);
  if (known) return known;
  if (fallback) return `${fallback}(errno=${errno})`;
  return `百度网盘返回错误(errno=${errno})`;
}

/** 业务错误:百度 OpenAPI 返回 errno != 0。 */
export class BaiduError extends Error {
  readonly errno: Errno;
  readonly endpoint?: string;
  readonly raw?: unknown;

  constructor(errno: Errno, message: string, opts?: { endpoint?: string; raw?: unknown }) {
    super(message);
    this.name = 'BaiduError';
    this.errno = errno;
    this.endpoint = opts?.endpoint;
    this.raw = opts?.raw;
  }
}

/** 认证错误:token 缺失 / 过期 / refresh 失败 / 用户输入授权码格式错误。 */
export class AuthError extends Error {
  readonly cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'AuthError';
    this.cause = cause;
  }
}

/** 作用域错误:沙盒越界 / 全盘白名单越界。 */
export class ScopeError extends Error {
  readonly path: string;
  readonly scope: string;
  constructor(path: string, scope: string, message?: string) {
    super(
      message ??
        `路径 ${path} 超出当前作用域(${scope})。请用 \`pan.cjs scope\` 切换或调整 \`allowedPaths\`。`,
    );
    this.name = 'ScopeError';
    this.path = path;
    this.scope = scope;
  }
}

/** 删除策略错误:四级保护未通过。 */
export class PolicyError extends Error {
  readonly reason: string;
  constructor(reason: string, message?: string) {
    super(message ?? reason);
    this.name = 'PolicyError';
    this.reason = reason;
  }
}

/** 配置错误:config.json / token.json 损坏 / 权限不正确。 */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

/** HTTP 层错误:网络断开、5xx、超时。与 BaiduError 不同(后者 HTTP 200 但 errno != 0)。 */
export class HttpError extends Error {
  readonly status: number;
  readonly endpoint: string;
  constructor(status: number, endpoint: string, message?: string) {
    super(message ?? `HTTP ${status} from ${endpoint}`);
    this.name = 'HttpError';
    this.status = status;
    this.endpoint = endpoint;
  }
}

/**
 * 把任意错误统一格式化为可展示的字符串(给 CLI 兜底输出用)。
 * 不会泄露 token / refresh_token / client_secret 等敏感字段。
 */
export function formatError(err: unknown): string {
  if (err instanceof BaiduError) {
    const ep = err.endpoint ? ` [${err.endpoint}]` : '';
    return `${err.message}${ep}`;
  }
  if (err instanceof ScopeError) return err.message;
  if (err instanceof PolicyError) return `策略拒绝: ${err.message}`;
  if (err instanceof AuthError) return `认证失败: ${err.message}`;
  if (err instanceof ConfigError) return `配置错误: ${err.message}`;
  if (err instanceof HttpError) return err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}
