#!/usr/bin/env node

/**
 * 调用即梦/豆包 Seedream 4.0 API 生成图片
 *
 * 用法:
 *   node generate-image.js --prompt "图片描述" --output "./output/part-1.png"
 *
 * 环境变量（从 .env 读取）:
 *   ARK_API_KEY - 火山引擎 ARK API Key
 */

const fs = require("fs");
const path = require("path");

// ========== 参数解析 ==========

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { prompt: "", output: "" };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--prompt" && args[i + 1]) {
      opts.prompt = args[i + 1];
      i++;
    } else if (args[i] === "--output" && args[i + 1]) {
      opts.output = args[i + 1];
      i++;
    }
  }
  return opts;
}

// ========== 加载 .env ==========

function loadEnv() {
  const skillDir = path.resolve(__dirname, "..");
  const envPath = path.join(skillDir, ".env");
  if (fs.existsSync(envPath)) {
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
}

// ========== 主逻辑 ==========

async function main() {
  loadEnv();
  const opts = parseArgs();

  if (!opts.prompt) {
    console.error(JSON.stringify({ error: "缺少 --prompt 参数" }));
    process.exit(1);
  }
  if (!opts.output) {
    console.error(JSON.stringify({ error: "缺少 --output 参数" }));
    process.exit(1);
  }

  const apiKey = process.env.ARK_API_KEY;
  if (!apiKey) {
    console.error(JSON.stringify({ error: "未设置 ARK_API_KEY，请在 .env 中配置" }));
    process.exit(1);
  }

  const apiUrl = "https://ark.cn-beijing.volces.com/api/v3/images/generations";

  const requestBody = {
    model: "doubao-seedream-4-0-250828",
    prompt: opts.prompt,
    sequential_image_generation: "disabled",
    response_format: "url",
    size: "2K",
    stream: false,
    watermark: true,
  };

  console.error(`[即梦] 正在生成图片...`);
  console.error(`[即梦] Prompt: ${opts.prompt.slice(0, 80)}...`);

  let response;
  try {
    response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });
  } catch (err) {
    console.error(JSON.stringify({ error: `API 请求失败: ${err.message}` }));
    process.exit(1);
  }

  if (!response.ok) {
    const errText = await response.text();
    console.error(JSON.stringify({ error: `API 返回错误 ${response.status}: ${errText}` }));
    process.exit(1);
  }

  const result = await response.json();

  // 兼容多种响应格式
  let imageUrl = null;
  if (result.data && Array.isArray(result.data) && result.data[0]) {
    imageUrl = result.data[0].url;
  } else if (result.url) {
    imageUrl = result.url;
  } else if (result.output && result.output.url) {
    imageUrl = result.output.url;
  }

  if (!imageUrl) {
    console.error(
      JSON.stringify({
        error: "无法从 API 响应中解析图片 URL",
        raw: JSON.stringify(result).slice(0, 500),
      })
    );
    process.exit(1);
  }

  console.error(`[即梦] 图片URL: ${imageUrl}`);

  // 下载图片到本地
  console.error(`[即梦] 下载图片到 ${opts.output}...`);

  const outputDir = path.dirname(opts.output);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let imageResponse;
  try {
    imageResponse = await fetch(imageUrl);
  } catch (err) {
    console.error(JSON.stringify({ error: `下载图片失败: ${err.message}` }));
    process.exit(1);
  }

  if (!imageResponse.ok) {
    console.error(JSON.stringify({ error: `下载图片失败: HTTP ${imageResponse.status}` }));
    process.exit(1);
  }

  const buffer = Buffer.from(await imageResponse.arrayBuffer());
  fs.writeFileSync(opts.output, buffer);

  const stats = fs.statSync(opts.output);
  console.error(`[即梦] 图片已保存: ${opts.output} (${(stats.size / 1024).toFixed(1)} KB)`);

  // 输出 JSON 结果到 stdout
  console.log(
    JSON.stringify({
      success: true,
      output: path.resolve(opts.output),
      size: stats.size,
    })
  );
}

main().catch((err) => {
  console.error(JSON.stringify({ error: err.message }));
  process.exit(1);
});
