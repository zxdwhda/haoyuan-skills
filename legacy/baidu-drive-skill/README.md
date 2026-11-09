# baidu-drive-skill

> 百度网盘开源 Claude Code Skill。直连官方 OpenAPI,纯 TypeScript 实现,**无外部 binary、无独立 server**。
>
> **状态:** v0.1.0 — 核心功能已齐全:登录、目录管理、上传 / 下载(含分片)、软删除 / 硬删除(四级保护)、搜索(关键词 + 语义)、分享、移动 / 复制 / 重命名。

## 为什么再做一个

百度官方在 GitHub 上有两个相关项目,但都不太合适:

- **`baidu-netdisk/mcp`** — MCP 实现,2025-09 后基本停更;绝大多数 API 走远端 SSE,access_token 直接出现在 URL 里;字段照搬 OpenAPI(`rtype/ondup/async/urlencode 中文路径`)未为 LLM 优化。
- **`baidu-netdisk/bdpan-storage`** — Skill 实现,但内部包了一个 **闭源 CLI 二进制 `bdpan`**,从百度 CDN 拉,SHA256 校验是脚本自背书无法独立审计;**强制锁死 `/apps/bdpan/`**(只能动 2GB 应用空间);**完全禁止删除**(连软删除都没有);**Windows 原生不支持**;SKILL.md 一次预加载 240+ 行。

本项目的差异化:

| 维度 | 本项目 | 官方 bdpan-storage | 官方 mcp |
|---|---|---|---|
| 实现形式 | **纯 TypeScript,esbuild bundle 成单文件 `pan.cjs`** | 闭源 CLI binary | MCP server |
| 运行依赖 | Node ≥ 18 | 自家 binary + tail/nohup | MCP runtime + 远端 SSE |
| 默认沙盒 | `/apps/<your-app>/`(可配置全盘) | 锁死 `/apps/bdpan/`,不可改 | 全盘 |
| 删除 | **支持**(默认软删到 .trash,`--hard` 走四级保护) | 完全不支持 | 支持但无防护 |
| 跨平台 | macOS / Linux / Windows 原生 | 仅 Linux + macOS | — |
| SKILL.md 体积 | < 120 行 | 240+ 行 | — |
| License | MIT | Apache 2.0 + CLI 闭源 | — |

## 快速接入

整个流程分四步:**安装 Skill → 注册百度自有应用 → 配置凭据 → 验证**。

### 第一步 — 安装 Skill 到 Claude Code

> 前置:已安装 [Claude Code](https://claude.com/claude-code) 客户端,Node ≥ 18。

#### 方式一:Plugin Marketplace(推荐)

在 Claude Code 中执行:

```
/plugin marketplace add zxdwhda/baidu-drive-skill
/plugin install baidu-drive-pro@baidu-drive-skill
```

完成后,在 Claude Code 里说一句"列一下我的百度网盘"就能触发本 skill。

> 仓库内已 commit 编译产物 `skill/assets/dist/pan.cjs`,Plugin Marketplace 安装无需本地 `npm install / npm run build`。

![安装成功](./resource/install-success.png)
<!-- ⚠️ 此处需补截图:Claude Code 中 /plugin install 完成后的成功提示 -->

#### 方式二:本地手动安装(无 Claude Code Plugin 时备用)

```bash
# 1. 拉源码 + 构建产物
git clone https://github.com/zxdwhda/baidu-drive-skill.git
cd baidu-drive-skill
npm install && npm run build      # 产出 skill/assets/dist/pan.cjs
```

然后**复制**(不推荐软链,源目录被删/移就失效)`skill/` 到 Claude Code 的 skill 目录:

| 平台 | 命令 |
|---|---|
| **macOS / Linux** | `cp -r skill ~/.claude/skills/baidu-drive-pro` |
| **Windows (PowerShell)** | `Copy-Item -Recurse skill "$env:USERPROFILE\.claude\skills\baidu-drive-pro"` |
| **Windows (CMD)** | `xcopy /E /I skill "%USERPROFILE%\.claude\skills\baidu-drive-pro"` |

> 路径含**空格或中文**(如 `D:\我的项目\baidu-drive-skill`)时,所有命令必须给路径加双引号。
>
> 如果目标已存在,先备份:`mv ~/.claude/skills/baidu-drive-pro ~/.claude/skills/baidu-drive-pro.bak.$(date +%s)`(macOS/Linux);Windows 同理用 `Move-Item`。

### 第二步 — 注册百度网盘自有应用

打开 [百度网盘开放平台](https://pan.baidu.com/union/console/applist) → 创建"软件"应用 → 接入方式选 `xpansdk` → 拿到 `AppKey` / `SecretKey` → 应用权限里勾选 `netdisk`。

![百度开放平台](./resource/baidu-console.png)
<!-- ⚠️ 此处需补截图:百度网盘开放平台创建应用的关键页面(选 xpansdk + netdisk 权限) -->

详细步骤见 [skill/reference/oauth-flows.md](skill/reference/oauth-flows.md)。

### 第三步 — 配置凭据

写到 `~/.config/baidu-drive-skill/config.json`(Windows: `%APPDATA%\baidu-drive-skill\config.json`):

```json
{
  "scope": "sandbox",
  "appName": "你应用的名字(决定沙盒根 /apps/<name>/)",
  "app": {
    "clientId": "你的 AppKey",
    "clientSecret": "你的 SecretKey"
  }
}
```

或环境变量(写 shell rc):

```bash
export BAIDU_DRIVE_APP_ID="..."
export BAIDU_DRIVE_APP_SECRET="..."
```

### 第四步 — 验证

直接在 Claude Code 对话里说:

```
帮我登录百度网盘,然后列一下沙盒目录
```

Claude Code 会自动调用 skill 的 `login` 命令进入 device code 流程:

![login 流程](./resource/login-flow.png)
<!-- ⚠️ 此处需补截图:终端里 pan.cjs login 显示 user_code + 浏览器链接的瞬间 -->

授权完成后:

![demo 对话](./resource/demo-chat.png)
<!-- ⚠️ 此处需补截图:Claude Code 对话窗口里 skill 触发 + 返回结果的完整对话 -->

如果你想直接在终端验证(绕过 Claude Code):

```bash
# Plugin Marketplace 安装的路径(因 Claude Code 版本而异,可用 find 定位)
PAN=$(find ~/.claude -name 'pan.cjs' -path '*baidu-drive*' | head -1)
node "$PAN" login
node "$PAN" status
node "$PAN" ls /apps/your-app-name/
```

## 目录结构

```text
baidu-drive-skill/
├── .claude-plugin/
│   └── marketplace.json       # Plugin Marketplace 元数据
├── skill/                     # ← Plugin Marketplace 安装的内容
│   ├── SKILL.md               # 技能主文件(AI 入口)
│   ├── VERSION
│   ├── assets/
│   │   └── dist/
│   │       └── pan.cjs        # esbuild 编译产物(已 commit)
│   └── reference/             # 按需加载的参考文档
│       ├── delete-policy.md
│       ├── oauth-flows.md
│       ├── scope-config.md
│       ├── error-codes.md
│       ├── upload-protocol.md
│       ├── search-recipes.md
│       └── platform-notes.md
├── src/                       # TypeScript 源码(开发者用)
├── tests/                     # vitest + nock 契约测试
├── esbuild.config.mjs         # bundle 配置
├── package.json
└── resource/                  # README 用到的截图
```

## 命令一览

| 命令 | 说明 |
|---|---|
| `pan.cjs login [--device\|--oob\|--manual]` | 登录(device/OOB/manual 三选一,默认 device) |
| `pan.cjs logout` | 删除本地 token.json |
| `pan.cjs status` | 显示账号、配额、scope、token 过期时间 |
| `pan.cjs scope [sandbox\|full] [--app-name <name>] [--print]` | 切换/查看作用域 |
| `pan.cjs ls <path> [--recursive] [--all] [--json]` | 列目录(支持递归、自动翻页) |
| `pan.cjs mkdir <path>` | 新建目录(幂等) |
| `pan.cjs upload <local> <remote> [--rapid]` | 上传(>4MB 自动分片 + 秒传) |
| `pan.cjs download <remote> <local>` | 下载(>50MB 自动分片) |
| `pan.cjs rm <path...>` | **软删除**(移到 `.trash/<日期>/`) |
| `pan.cjs rm --hard <path...>` | **永久删除**(四级保护,逐字确认) |
| `pan.cjs search <keyword> [--category N] [--dir]` | 关键词搜索 |
| `pan.cjs search <query> --semantic [--category ...]` | 语义搜索(自然语言 / OCR / 文档内容 / 音视频 ASR) |
| `pan.cjs search <query> --auto` | 自动判断搜索方式(长句语义,短词关键词) |
| `pan.cjs mv <src> <dst>` / `cp` / `rename` | 移动 / 复制 / 重命名 |
| `pan.cjs share <path> [--pwd] [--days N]` | 创建分享链接 |
| `pan.cjs transfer <destPath>` | 转存分享链接到指定目录 |
| `pan.cjs trash [--gc] [--restore <name>]` | 清理 / 恢复 `.trash` |
| `pan.cjs task <taskid>` | 查询异步任务状态 |

## 安全原则(必读)

1. **登录**:必须用 `pan.cjs login`,**不要**让别人(包括 AI)在对话里粘贴授权码;授权码只能直接粘给 CLI 的隐藏式输入。
2. **Token**:`~/.config/baidu-drive-skill/token.json` 写入时强制 `chmod 0600`。**严禁**把它的内容粘到任何地方(含改写、Base64 等变体)。
3. **删除**:网盘删除从本 skill 视角是**永久不可逆**(OpenAPI 不提供回收站恢复)。本 skill 默认**软删除**(移到 `/apps/.trash/<日期>/`),`--hard` 才走永久删除,且必须通过四级保护(中文逐字「我确认永久删除」)。详见 [skill/reference/delete-policy.md](skill/reference/delete-policy.md)。
4. **作用域**:默认沙盒 `/apps/<your-app>/`,只有用户**显式**`pan.cjs scope full` 才会开放全盘,且第一次切换会红字提示。
5. **Agent 环境**(Claude Code / MCP / Anthropic SDK):`--yes` 跳过确认在 Agent 环境下被**强制忽略**。

## 常见问题(FAQ)

### Q1:Claude Code 里没识别到 skill?

确认以下任一路径存在 `SKILL.md`:
- Plugin Marketplace 安装:`~/.claude/plugins/baidu-drive-skill/skill/SKILL.md`(具体路径因 Claude Code 版本而异,可 `find ~/.claude -name SKILL.md` 定位)
- 手动复制:`~/.claude/skills/baidu-drive-pro/SKILL.md`

如果存在但仍未识别,在 Claude Code 里执行 `/plugin list` 或 `/skills` 检查注册状态;有时需要重启 Claude Code。

### Q2:`pan.cjs` 找不到 / 报错 `Cannot find module`?

Plugin Marketplace 安装方式仓库里已 commit 了 `pan.cjs`,正常应该有。手动安装方式如忘记 `npm run build`,产物会缺。重新跑:

```bash
cd baidu-drive-skill
npm install && npm run build
```

### Q3:登录时报 `errno=-9 文件不存在`?

自有应用刚注册,百度后端尚未懒创建 `/apps/<appName>/`。先跑一次写入即可:

```bash
node skill/assets/dist/pan.cjs mkdir /apps/your-app-name/uploads/
```

### Q4:Windows 命令行输入中文路径报错?

PowerShell 默认 UTF-8 没问题;旧版 CMD 可能需要先 `chcp 65001`。或直接用 Claude Code 对话来操作,避免命令行编码坑。

### Q5:授权码被人看到了 / 误粘到聊天里怎么办?

立即跑 `pan.cjs logout` 删除本地 token,然后到[百度网盘开放平台](https://pan.baidu.com/union/console/applist) **重置 SecretKey**。OAuth 授权码仅 10 分钟有效,但 token 一签出就有效期 30 天,必须手动失效。

更多错误 → [skill/reference/error-codes.md](skill/reference/error-codes.md);更多平台坑 → [skill/reference/platform-notes.md](skill/reference/platform-notes.md)。

## 更新 / 卸载

**更新(Plugin Marketplace 方式):**

```
/plugin update baidu-drive-pro@baidu-drive-skill
```

**更新(手动安装方式):**

```bash
cd baidu-drive-skill
git pull
npm install && npm run build
cp -rf skill/* ~/.claude/skills/baidu-drive-pro/   # 强制覆盖
```

**卸载:**

```
# Plugin Marketplace
/plugin uninstall baidu-drive-pro@baidu-drive-skill

# 手动安装
rm -rf ~/.claude/skills/baidu-drive-pro            # macOS / Linux
Remove-Item -Recurse "$env:USERPROFILE\.claude\skills\baidu-drive-pro"   # Windows
```

> 卸载 skill **不会**删除你的本地凭据(`~/.config/baidu-drive-skill/`)。如要彻底清理,手动 `rm -rf` 该目录;或在卸载前先 `pan.cjs logout` 清掉 token。

## 文档

- **Skill 主入口:** [skill/SKILL.md](skill/SKILL.md)
- **删除策略(四级保护):** [skill/reference/delete-policy.md](skill/reference/delete-policy.md)
- **OAuth 登录流程:** [skill/reference/oauth-flows.md](skill/reference/oauth-flows.md)
- **作用域与沙盒配置:** [skill/reference/scope-config.md](skill/reference/scope-config.md)
- **错误码速查:** [skill/reference/error-codes.md](skill/reference/error-codes.md)
- **上传协议与断点续传:** [skill/reference/upload-protocol.md](skill/reference/upload-protocol.md)
- **搜索配方(category / jq):** [skill/reference/search-recipes.md](skill/reference/search-recipes.md)
- **平台注意事项(macOS / WSL / Windows):** [skill/reference/platform-notes.md](skill/reference/platform-notes.md)

## 开发者构建

```bash
npm install
npm run typecheck    # tsc --noEmit
npm run build        # esbuild → skill/assets/dist/pan.cjs
npm run test         # vitest
npm run lint         # eslint
```

修改 src/ 后必须 `npm run build` 让 `skill/assets/dist/pan.cjs` 同步,且**必须 commit 编译产物** —— Plugin Marketplace 用户安装时不会本地构建。

依赖图(单向):`pan → {fileops, login} → client → auth → config`;`scope` / `errors` / `ui` 是横切叶子。

## 致谢

感谢 [`baidu-netdisk/bdpan-storage`](https://github.com/baidu-netdisk/bdpan-storage) 与 [`baidu-netdisk/mcp`](https://github.com/baidu-netdisk/mcp) 提供 OpenAPI 实战参考。本项目是非官方替代品,与百度公司无任何隶属关系。

## License

MIT — 详见 [LICENSE](LICENSE)。

## Roadmap

- **v0.2.0 (计划中)** — keychain 后端(macOS Keychain / libsecret / Windows Credential Manager)、异步任务轮询(批量 mv/cp)、更完善的 CONTRIBUTING / SECURITY 文档
- **未来** — Web 端 OAuth 回调 server、多 profile 切换、GUI 配置向导、CI 自动 build + commit `pan.cjs`
