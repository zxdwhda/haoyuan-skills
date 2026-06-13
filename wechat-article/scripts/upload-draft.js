#!/usr/bin/env node

/**
 * 微信公众平台：上传文章到草稿箱
 *
 * 用法:
 *   node upload-draft.js \
 *     --title "文章标题" \
 *     --author "作者名" \
 *     --content-file "/tmp/content.html" \
 *     --cover "/path/to/cover.png"
 *
 * 内部流程:
 *   1. 获取 access_token
 *   2. 上传 HTML 中引用的本地图片到微信 CDN，替换为 CDN URL
 *   3. 上传封面图为永久素材
 *   4. 创建草稿
 *
 * 环境变量（从 .env 读取）:
 *   WECHAT_APPID  - 微信公众平台 AppID
 *   WECHAT_SECRET - 微信公众平台 AppSecret
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// ========== 参数解析 ==========

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    title: "",
    author: "",
    contentFile: "",
    cover: "",
  };
  for (let i = 0; i < args.length; i++) {
    const val = args[i + 1];
    if (args[i] === "--title" && val) { opts.title = val; i++; }
    else if (args[i] === "--author" && val) { opts.author = val; i++; }
    else if (args[i] === "--content-file" && val) { opts.contentFile = val; i++; }
    else if (args[i] === "--cover" && val) { opts.cover = val; i++; }
  }
  return opts;
}

// ========== 加载 .env ==========

function loadEnv() {
  const skillDir = path.resolve(__dirname, "..");
  const envPath = path.join(skillDir, ".env");
  if (!fs.existsSync(envPath)) {
    console.error(JSON.stringify({ error: ".env 文件不存在，请先配置凭证: " + envPath }));
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

// ========== Access Token（带缓存） ==========

let cachedToken = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiresAt - 300000) {
    console.error("[微信] 使用缓存的 access_token");
    return cachedToken;
  }

  const appId = process.env.WECHAT_APPID;
  const secret = process.env.WECHAT_SECRET;
  if (!appId || !secret) {
    console.error(JSON.stringify({ error: "未设置 WECHAT_APPID 或 WECHAT_SECRET" }));
    process.exit(1);
  }

  console.error("[微信] 获取 access_token...");
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${secret}`;

  const resp = await fetch(url);
  const data = await resp.json();

  if (data.errcode) {
    console.error(JSON.stringify({ error: `获取 access_token 失败: ${data.errmsg}`, code: data.errcode }));
    process.exit(1);
  }

  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000;
  console.error(`[微信] access_token 已获取，有效期 ${data.expires_in}s`);
  return cachedToken;
}

// ========== 上传图片到微信 CDN（文章正文用） ==========

async function uploadImageToCdn(token, filePath) {
  console.error(`[微信] 上传图片到 CDN: ${path.basename(filePath)}`);

  const boundary = "----FormBoundary" + crypto.randomBytes(8).toString("hex");
  const filename = path.basename(filePath);
  const fileBuffer = fs.readFileSync(filePath);

  const header = Buffer.from(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="media"; filename="${filename}"\r\n` +
      `Content-Type: image/png\r\n\r\n`
  );
  const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
  const body = Buffer.concat([header, fileBuffer, footer]);

  const url = `https://api.weixin.qq.com/cgi-bin/media/uploadimg?access_token=${token}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
      "Content-Length": String(body.length),
    },
    body: body,
  });

  const data = await resp.json();
  if (data.errcode && data.errcode !== 0) {
    console.error(JSON.stringify({ error: `上传图片到 CDN 失败: ${data.errmsg || JSON.stringify(data)}` }));
    return null;
  }

  console.error(`[微信] CDN URL: ${data.url}`);
  return data.url;
}

// ========== 上传永久素材（封面图） ==========

async function uploadPermanentMaterial(token, filePath) {
  console.error(`[微信] 上传封面永久素材: ${path.basename(filePath)}`);

  const boundary = "----FormBoundary" + crypto.randomBytes(8).toString("hex");
  const filename = path.basename(filePath);
  const fileBuffer = fs.readFileSync(filePath);

  const header = Buffer.from(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="media"; filename="${filename}"\r\n` +
      `Content-Type: image/png\r\n\r\n`
  );
  const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
  const body = Buffer.concat([header, fileBuffer, footer]);

  const url = `https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=${token}&type=image`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
      "Content-Length": String(body.length),
    },
    body: body,
  });

  const data = await resp.json();
  if (data.errcode && data.errcode !== 0) {
    console.error(JSON.stringify({ error: `上传永久素材失败: ${data.errmsg || JSON.stringify(data)}` }));
    process.exit(1);
  }

  console.error(`[微信] 封面 media_id: ${data.media_id}`);
  return data.media_id;
}

// ========== 创建草稿 ==========

async function createDraft(token, title, author, content, thumbMediaId) {
  console.error(`[微信] 创建草稿: ${title}`);

  const url = `https://api.weixin.qq.com/cgi-bin/draft/add?access_token=${token}`;
  const body = {
    articles: [
      {
        article_type: "news",
        title: title,
        author: author,
        digest: "",
        content: content,
        thumb_media_id: thumbMediaId,
        need_open_comment: 0,
        only_fans_can_comment: 0,
      },
    ],
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await resp.json();

  if (data.errcode && data.errcode !== 0) {
    console.error(JSON.stringify({
      error: `创建草稿失败: ${data.errmsg || JSON.stringify(data)}`,
      code: data.errcode,
    }));
    process.exit(1);
  }

  console.error(`[微信] 草稿 media_id: ${data.media_id}`);
  return data.media_id;
}

// ========== 提取 HTML 中所有本地图片路径 ==========

function extractLocalImages(html) {
  const paths = [];
  const imgRegex = /<img[^>]+src="([^"]+)"/g;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    const src = match[1];
    if (src.startsWith("http://") || src.startsWith("https://")) continue;
    const absPath = path.isAbsolute(src) ? src : path.resolve(src);
    if (fs.existsSync(absPath)) {
      paths.push(absPath);
    }
  }
  return paths;
}

// ========== 主逻辑 ==========

async function main() {
  loadEnv();
  const opts = parseArgs();

  if (!opts.title) {
    console.error(JSON.stringify({ error: "缺少 --title 参数" }));
    process.exit(1);
  }
  if (!opts.contentFile) {
    console.error(JSON.stringify({ error: "缺少 --content-file 参数" }));
    process.exit(1);
  }
  if (!opts.cover) {
    console.error(JSON.stringify({ error: "缺少 --cover 参数" }));
    process.exit(1);
  }
  if (!fs.existsSync(opts.contentFile)) {
    console.error(JSON.stringify({ error: `content 文件不存在: ${opts.contentFile}` }));
    process.exit(1);
  }
  if (!fs.existsSync(opts.cover)) {
    console.error(JSON.stringify({ error: `封面图不存在: ${opts.cover}` }));
    process.exit(1);
  }

  const author = opts.author || process.env.WECHAT_AUTHOR || "";
  if (!author) {
    console.error(JSON.stringify({ error: "缺少 --author 参数，且 .env 中未设置 WECHAT_AUTHOR" }));
    process.exit(1);
  }

  let html = fs.readFileSync(opts.contentFile, "utf-8");

  // Step 1: 获取 access_token
  const token = await getAccessToken();

  // Step 2: 提取本地图片，上传到微信 CDN
  const localImages = extractLocalImages(html);
  const cdnUrlMap = {};

  if (localImages.length > 0) {
    console.error(`[微信] 发现 ${localImages.length} 张本地图片，上传到 CDN...`);
  }
  for (const imgPath of localImages) {
    const cdnUrl = await uploadImageToCdn(token, imgPath);
    if (cdnUrl) {
      cdnUrlMap[imgPath] = cdnUrl;
    }
  }

  // Step 3: 替换 HTML 中的本地图片为 CDN URL
  for (const [localPath, cdnUrl] of Object.entries(cdnUrlMap)) {
    html = html.replace(new RegExp(localPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), cdnUrl);
  }

  // Step 4: 上传封面图为永久素材
  const thumbMediaId = await uploadPermanentMaterial(token, opts.cover);

  // Step 5: 创建草稿
  const mediaId = await createDraft(token, opts.title, author, html, thumbMediaId);

  // 输出结果
  const uploadedCount = Object.keys(cdnUrlMap).length;
  console.log(JSON.stringify({
    success: true,
    media_id: mediaId,
    title: opts.title,
    author: author,
    images_uploaded: uploadedCount,
    cover_media_id: thumbMediaId,
  }));
}

main().catch((err) => {
  console.error(JSON.stringify({ error: err.message }));
  process.exit(1);
});
