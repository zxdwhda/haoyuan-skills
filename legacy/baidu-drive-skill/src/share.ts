/**
 * 分享/转存 —— 百度 OpenAPI 未在官方 SDK 中暴露,直拼 endpoint。
 *
 * share/set: 创建分享链接
 * share/transfer: 转存他人分享到自己网盘
 */

import { ENDPOINTS, xpanPostForm } from './client.js';
import type { ConfigFile } from './config.js';
import type { CredentialsOpts } from './auth.js';
import type { XpanResponse } from './client.js';

// ---------- types ----------

export interface ShareSetResponse extends XpanResponse {
  link?: string;
  shortlink?: string;
  ctime?: number;
  pwd?: string;
  uk?: number;
  shareid?: number;
  /** errno=-30 表示"不是会员,无法设置分享密码";errno=-31 表示"密码位数不对(应为4位)" */
  errno?: number;
}

export interface ShareTransferResponse extends XpanResponse {
  extra?: {
    list?: Array<{
      from?: string;
      to?: string;
    }>;
  };
  errno?: number;
}

// ---------- createShare ----------

export interface CreateShareOptions {
  /** 分享密码,4 位字符串。不传则使用百度默认密码。 */
  pwd?: string;
  /** 有效期天数:0=永久(默认),1=1天,7=7天 */
  period?: number;
}

/**
 * 为指定 fs_id 列表创建分享链接。
 * - 默认有效期永久(period=0),密码 4 位(不传则由百度自动分配)。
 * - 返回 link(长链接)、shortlink(短链接)、pwd(密码)。
 */
export async function createShare(
  cfg: ConfigFile,
  fsids: number[],
  opts: CreateShareOptions = {},
  creds?: CredentialsOpts,
): Promise<ShareSetResponse> {
  const body: Record<string, string | number | undefined> = {
    fid_list: JSON.stringify(fsids),
    period: opts.period ?? 0,
  };
  if (opts.pwd !== undefined && opts.pwd.length > 0) {
    body.pwd = opts.pwd;
  }
  return xpanPostForm<ShareSetResponse>(
    cfg,
    ENDPOINTS.shareSet,
    body,
    {},
    {},
    creds,
  );
}

// ---------- transfer ----------

export interface TransferOptions {
  /** 分享者的 uk */
  uk: number;
  /** 分享 ID */
  shareid: number;
  /** 分享密码(私密分享必填) */
  pwd?: string;
  /** 要转存的文件 fs_id 列表。不传则全部转存。 */
  fsids?: number[];
  /** 目标路径 */
  destPath: string;
}

/**
 * 将他人分享转存到自己网盘。
 * 注意:errno=13045 表示"不允许转存自己的分享"。
 */
export async function transferShare(
  cfg: ConfigFile,
  opts: TransferOptions,
  creds?: CredentialsOpts,
): Promise<ShareTransferResponse> {
  const body: Record<string, string | number | undefined> = {
    shareid: opts.shareid,
    uk: opts.uk,
    path: opts.destPath,
  };
  if (opts.pwd) body.pwd = opts.pwd;
  if (opts.fsids && opts.fsids.length > 0) {
    body.fsids = JSON.stringify(opts.fsids);
  }
  return xpanPostForm<ShareTransferResponse>(
    cfg,
    ENDPOINTS.shareTransfer,
    body,
    {},
    {},
    creds,
  );
}
