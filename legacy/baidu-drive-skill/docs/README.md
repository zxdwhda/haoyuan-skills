# baidu-drive-pro

百度网盘开源 Skill —— 直连官方 OpenAPI，纯 TypeScript 实现，无外部 binary 依赖。

这是 [bdpan-storage](https://github.com/baidu-netdisk/bdpan-storage) 的开源替代品，解决了以下痛点：

| 特性 | bdpan-storage (官方) | baidu-drive-pro (本项目) |
|---|---|---|
| 运行时依赖 | 闭源二进制 `bdpan` (从 CDN 下载) | 纯 Node.js ≥ 18，源码可审计 |
| 沙盒限制 | 强制锁死在 `/apps/bdpan/` | 默认可配置，支持全盘访问 |
| 删除支持 | 完全禁止删除 | 支持软删除(回收站) + 四级保护硬删除 |
| 跨平台 | Windows 原生不支持 | macOS / Linux / Windows 一等公民 |
| 大文件下载 | `nohup + tail` 拼凑 | 原生 Range 分片并发下载 |
| 登录方式 | 仅 device code | device code / OOB / manual 三种 |

## 安装

### 方式 A：npm (推荐)

```bash
npm install -g baidu-drive-pro
baidu-drive-pro install-skill   # 安装到 ~/.claude/skills/
```

### 方式 B：手动下载 Release

从 [GitHub Releases](https://github.com/baidu-drive-skill/baidu-drive-skill/releases) 下载 `baidu-drive-pro.zip`，解压到 `~/.claude/skills/baidu-drive-pro/`。

### 方式 C：源码构建 (贡献者)

```bash
git clone https://github.com/baidu-drive-skill/baidu-drive-skill.git
cd baidu-drive-pro
pnpm install
pnpm build    # 产出 skill/assets/dist/pan.cjs
pnpm link-skill
```

## 快速开始

```bash
# 1. 登录（默认 device code，浏览器扫码授权）
pan.cjs login

# 2. 查看状态
pan.cjs status

# 3. 列目录（默认沙盒模式，路径以 /apps/<your-app>/ 开头）
pan.cjs ls /apps/myapp/

# 4. 上传
pan.cjs upload ./file.zip /apps/myapp/

# 5. 下载
pan.cjs download /apps/myapp/file.zip ./out.zip

# 6. 软删除（默认，移到 .trash/）
pan.cjs rm /apps/myapp/file.zip

# 7. 搜索
pan.cjs search "关键词" --category 4
```

## 命令一览

| 命令 | 说明 |
|---|---|
| `login [--device\|--oob\|--manual]` | 登录百度账号 |
| `logout` | 退出登录，清除本地 token |
| `status` | 显示账号、配额、token 过期时间、作用域 |
| `scope <sandbox\|full> [--print]` | 切换/查看作用域模式 |
| `ls <path> [--all] [--json]` | 列目录 |
| `mkdir <path>` | 新建目录 |
| `upload <local> <remote>` | 上传（自动分片、断点续传、秒传） |
| `download <remote> <local>` | 下载（>50MB 自动分片并发） |
| `rm <path...> [--hard]` | 软删除（默认）/ 硬删除（永久） |
| `search <keyword>` | 搜索文件 |
| `mv <src> <dst>` | 移动 |
| `cp <src> <dst>` | 复制 |
| `rename <path> <newname>` | 重命名 |
| `share <path> [--pwd] [--days]` | 创建分享链接 |
| `transfer <dest> --shareid <id> --uk <uk>` | 转存他人分享 |
| `trash [--list\|--gc\|--restore]` | 管理回收站 |

## 配置

配置文件位于 `~/.config/baidu-drive-skill/config.json`（macOS/Linux）或 `%APPDATA%\baidu-drive-skill\config.json`（Windows）。

```jsonc
{
  "scope": "sandbox",          // "sandbox" | "full"
  "appName": "myapp",          // 沙盒根 = /apps/<appName>/
  "allowedPaths": ["/photos"], // full 模式白名单
  "app": {                     // 自有 OAuth 应用（可选）
    "clientId": "xxx",
    "clientSecret": "yyy"
  },
  "trash": { "retainDays": 7 },
  "concurrency": {
    "uploadParts": 4,
    "downloadChunks": 4
  }
}
```

**环境变量优先级高于 config.json：**

- `BAIDU_DRIVE_SCOPE=sandbox|full`
- `BAIDU_DRIVE_APP_NAME=myapp`
- `BAIDU_DRIVE_ALLOWED_PATHS=/photos,/backup`
- `BAIDU_DRIVE_CONFIG_DIR=/path/to/config`

## 安全

- **token 存储**：`token.json` 写入时 `chmod 0600`，读取时检测权限是否过宽。
- **删除保护**：硬删除走「四级保护」—— 明确意图 → 范围列清 → 逐字确认「我确认永久删除」→ 最后软删除提议。
- **Agent 环境**：在 Claude Code / MCP 环境下，`--yes` 被强制忽略，绝不跳过逐字确认。
- **作用域**：默认沙盒 `/apps/<your-app>/`，防止误操作整个网盘。

详见 [SECURITY.md](SECURITY.md)。

## 许可证

MIT
