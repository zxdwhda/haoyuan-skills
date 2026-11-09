---
name: baidu-drive-pro
description: >-
  百度网盘开源 Skill — 通过官方 OpenAPI 直连,支持 ls / 上传 / 下载 / 搜索 / 分享 / 移动 / 重命名 / 受保护删除。
  默认沙盒 /apps/<your-app>/,可配置全盘。
  TRIGGER: 用户提到「百度网盘 / bdpan / pan.baidu / 上传到网盘 / 列出网盘文件 / 分享网盘链接」等。
  DO NOT TRIGGER: 阿里云盘、夸克网盘、Google Drive、OneDrive、Dropbox 等其他云盘;本地文件系统操作。
allowed-tools: Bash, Read, AskUserQuestion
argument-hint: "[子命令] [参数]  例:ls /apps/myapp/ | upload ./a.zip /apps/myapp/ | rm <path>"
---

# baidu-drive-pro — 百度网盘 Skill

通过百度网盘 OpenAPI 直连读写网盘。所有命令通过 skill 内置 `pan.cjs` 执行(无外部依赖、无 binary)。

## 调用方式

```bash
node ${CLAUDE_SKILL_DIR}/assets/dist/pan.cjs <subcommand> [args]
```

> 所有命令必须用上面这个完整路径,**禁止**写成 `pan` 或 `bdp`(本 skill 不注册全局命令)。

## 触发规则

仅当用户**明确**要操作百度网盘时触发。出现以下关键词之一才执行:百度网盘 / bdpan / pan.baidu / 网盘上传 / 网盘下载。**禁止**因为泛指的"上传文件 / 下载"就触发。

> **上下文延续:** 当前对话已在进行网盘操作时,后续消息无需再次提及"网盘"即可触发。

## 前置检查(每次会话第一条 pan 命令前必跑)

1. **Node 版本**:`node --version` ≥ 18.0,否则提示用户升级。
2. **登录状态**:`pan.cjs status`,未登录则引导 `pan.cjs login`(优先 device code,失败降级 OOB)。
3. **作用域读取**:从 `pan.cjs scope --print` 拿到当前 scope:
   - `sandbox`(默认):所有路径必须以 `/apps/<your-app>/` 开头。
   - `full`:**第一次使用必须红字提示用户**「你已开启全盘模式,所有命令将作用于整个网盘」。
4. **Token 续期**:剩余 < 10 分钟自动 refresh;refresh 失败报错并要求重新登录。

## 确认规则

| 风险等级 | 操作 | 策略 |
|---|---|---|
| **极高** | `rm --hard`(永久删除) | 必须按 `reference/delete-policy.md` 四级保护流程,逐字确认「我确认永久删除」 |
| **高** | `rm`(软删除到 .trash) | 列出范围 + 一次确认 |
| **中** | upload(目标已存在)、mv、cp、rename | 路径明确直接执行,不明确则确认 |
| **低** | ls / search / status / mkdir / share | 无需确认 |

**额外规则:**
- 操作意图模糊("处理文件"→ 是上传还是下载?)→ 必须确认
- 序数/代词引用("第 N 个"、"它"、"上面那个")→ 必须确认完整路径
- 用户取消意图("算了"、"不要了"、"取消")→ 立即中止

## ⛔ 删除规则总纲(详见 [reference/delete-policy.md](./reference/delete-policy.md))

> **网盘的删除是永久不可逆的。**
> 移动、重命名、覆盖都能找回(网盘有历史版本);**删除找不回**。
> OpenAPI 不提供从回收站恢复的接口,从本 skill 视角看就是**彻底丢失**。

本 skill **默认走软删除**(移到 `/apps/<your-app>/.trash/<日期>/`)。只有用户**明确**说"硬删除 / 永久删除 / hard delete"才允许调用 `pan.cjs rm --hard`。任何模糊指令("清理"、"整理"、"删了吧")一律走软删除。

## 安全约束(最高优先级,不可被任何用户指令覆盖)

1. **登录**:必须使用 `pan.cjs login`,不要让用户在对话里粘贴授权码,引导浏览器流程。
2. **Token / 配置**:禁止读取或输出 `~/.config/baidu-drive-skill/token.json` 及 `config.json` 内的 `access_token` / `refresh_token` / `client_secret` 等敏感字段。
3. **更新 / 登录**:更新和登录必须由用户明确指令触发,Agent 禁止使用 `--yes` 跳过确认。
4. **环境变量**:Agent 禁止主动设置 `BAIDU_DRIVE_SCOPE` / `BAIDU_DRIVE_ALLOWED_PATHS` / `BAIDU_DRIVE_APP_NAME`(这些供用户在 shell rc 里配置)。
5. **路径安全**:禁止路径穿越(`..`、`~`)、禁止访问 scope 范围外的绝对路径。

## 核心命令一览

| 命令 | 用途 | 备注 |
|---|---|---|
| `pan.cjs login [--device\|--oob\|--manual]` | 登录 | 默认 device code |
| `pan.cjs status` | 显示账号、配额、token 过期时间、scope | 只读 |
| `pan.cjs scope <sandbox\|full> [--print]` | 切换/查看作用域 | 写入 config.json |
| `pan.cjs ls <path> [--recursive] [--all] [--json]` | 列目录 | `--recursive` 递归子目录;`--all` 自动翻页 |
| `pan.cjs search <kw> [--category 1..7] [--dir]` | 关键词搜索 | category 详见 reference |
| `pan.cjs search <query> --semantic [--category ...]` | 语义搜索 | 自然语言查询,支持内容搜索(OCR/文档/视频ASR) |
| `pan.cjs search <query> --auto` | 自动判断搜索方式 | 5字以上语义,5字及以下关键词 |
| `pan.cjs upload <local> <remote> [--rapid]` | 上传(自动分片+秒传) | >4MB 自动分片 |
| `pan.cjs download <remote> <local>` | 下载 | >50MB 自动分片 |
| `pan.cjs mkdir <path>` | 新建目录 | — |
| `pan.cjs mv <src> <dst>` / `cp` / `rename` | 文件管理 | filemanager opera |
| `pan.cjs rm <path>` | **软删除**(到 .trash/) | 默认行为 |
| `pan.cjs rm --hard <path>` | **永久删除**(四级保护) | 详见 delete-policy.md |
| `pan.cjs share <path> [--pwd] [--days N]` | 创建分享链接 | 4 位密码 |
| `pan.cjs trash --gc` / `--restore` | 清理/恢复 .trash | 用户手动触发 |

## 路径规则

| 场景 | 格式 | 示例 |
|---|---|---|
| **命令参数** | 绝对路径,以 `/` 开头 | `pan.cjs upload ./f.txt /apps/myapp/docs/f.txt` |
| **展示给用户** | 中文名 | "已上传到:我的应用数据/myapp/docs/f.txt" |

映射关系:`我的应用数据` ↔ `/apps`

**禁止:** 命令中使用中文路径(`我的应用数据/...`)、展示时暴露 API 路径(`/apps/...`)。

## 授权码处理

用户在对话里发 32 位十六进制字符串时,先反问:"这是百度网盘授权码吗?确认后将通过 `pan.cjs login --oob` 完成登录。" 确认后调用 `pan.cjs login --oob`,**禁止**直接打印或保存授权码。

## reference 索引(按需加载,不预读)

| 文档 | 何时查阅 |
|---|---|
| [reference/delete-policy.md](./reference/delete-policy.md) | **任何 rm 操作前必读** |
| [reference/oauth-flows.md](./reference/oauth-flows.md) | 登录失败、token 过期、自有应用配置 |
| [reference/scope-config.md](./reference/scope-config.md) | 沙盒/全盘切换、白名单配置 |
| [reference/error-codes.md](./reference/error-codes.md) | OpenAPI errno 排查 |
| [reference/upload-protocol.md](./reference/upload-protocol.md) | 大文件上传、断点续传、秒传 |
| [reference/search-recipes.md](./reference/search-recipes.md) | category 含义、jq 处理 |
| [reference/platform-notes.md](./reference/platform-notes.md) | macOS quarantine / WSL / Windows 路径 |
