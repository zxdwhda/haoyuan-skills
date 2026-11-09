# OAuth 登录流程

> 你正在读这份文档,意味着用户的登录流程出了问题,或正在第一次配置自有应用。
> 本文档解释三种登录方式、它们各自适用的场景,以及失败时如何排查。

## TL;DR(最常用判断)

| 用户场景 | 推荐方式 | 命令 |
|---|---|---|
| 桌面 / 笔记本,有浏览器 | **device code** | `pan.cjs login` |
| SSH / WSL / 容器 | **OOB authorization code** | `pan.cjs login --oob` |
| 想"先试一下"或自有应用配置麻烦 | **manual paste**(限时,无续期) | `pan.cjs login --manual` |
| `pan.cjs login` 报「未找到 OAuth 客户端凭据」 | 必须先注册自有应用,见 §自有应用注册 | — |

## 三种流程对比

| 维度 | device code | OOB code | manual paste |
|---|---|---|---|
| 是否需要浏览器 | 是(任意一台,不必本机) | 是(任意一台) | 是(打开百度限时体验页) |
| 是否需要 client_id/secret | **是** | **是** | 否(用百度限时体验内置 client) |
| 是否带 refresh_token | 是 | 是 | **否** |
| 默认有效期 | 30 天(refresh) | 30 天(refresh) | ~24h,过期重粘 |
| 凭据落盘 | `token.json` 含 refresh_token | 同 | `token.json` 仅 access_token |
| 自动续期 | 是,过期前 10 分钟自动 refresh | 是 | **否**,过期 CLI 报错要求重登 |

## 1. device code(默认推荐)

### 流程
```
pan.cjs login
   ↓
GET https://openapi.baidu.com/oauth/2.0/device/code
   ?response_type=device_code&client_id=...&scope=basic,netdisk
   ↓
返回 user_code(8 位)+ verification_url + qrcode_url + interval(秒)
   ↓
CLI 把 user_code 大字打印 + verification_url 做 OSC8 超链接(终端可点击)
   ↓
用户在浏览器登录百度账号,输入 user_code 同意授权
   ↓
CLI 按 interval 轮询:
GET https://openapi.baidu.com/oauth/2.0/token
  ?grant_type=device_token&code=<device_code>&client_id=...&client_secret=...
   ↓
拿到 access_token + refresh_token + expires_in,写入 ~/.config/baidu-drive-skill/token.json (chmod 0600)
```

### 失败模式

| 服务端返回 | CLI 行为 | 用户该做的事 |
|---|---|---|
| `error=authorization_pending` | 继续按 `interval` 轮询 | 等用户在浏览器扫码完成 |
| `error=slow_down` | 间隔加倍(最多 30s) | 等待,不要疯狂 retry |
| `error=expired_token` | 抛错退出,提示重新 `pan.cjs login` | 重新登录(原 user_code 已失效) |
| `error=authorization_declined` / `access_denied` | 抛错退出 | 用户拒绝了授权;再次 `login` 时点同意 |
| 网络瞬断 | 警告并继续轮询 | 等待恢复 |

### 用户友好处理

CLI 已经把 OSC8 超链接和大字 user_code 都打印出来。如果用户的终端不支持 OSC8(老版 macOS Terminal、SSH 到旧服务器),会自动降级为 `text (url)` 文本格式;直接复制 URL 到浏览器即可。

## 2. OOB authorization code(SSH / 无浏览器降级)

### 流程
```
pan.cjs login --oob
   ↓
CLI 打印授权 URL:
  https://openapi.baidu.com/oauth/2.0/authorize
    ?response_type=code&client_id=...&redirect_uri=oob
    &scope=basic,netdisk&display=page
   ↓
用户在任意有浏览器的设备打开 URL,登录百度,允许授权
   ↓
百度页面显示 32 位十六进制授权码(不要复制错——必须 32 位)
   ↓
CLI 提示「授权码:」,用户**隐藏式输入**(终端不回显,只显示 *)
   ↓
GET https://openapi.baidu.com/oauth/2.0/token
  ?grant_type=authorization_code&code=<32hex>&client_id=...&client_secret=...&redirect_uri=oob
   ↓
拿到 access_token + refresh_token,落盘
```

### 适用场景

- 远程 SSH 到 Linux 服务器、WSL、Codespaces 等终端弹不出浏览器的环境。
- 公司内网环境本机浏览器有但回调地址 `localhost` 无法访问到。

### 错误自检

- 授权码不是 32 位十六进制 → CLI 直接抛 `AuthError`,提示用户检查是否复制了多余空格。
- `error=invalid_grant` → 授权码已用过或已过期(10 分钟有效期),重新登录。

## 3. manual paste(限时体验,不推荐长期使用)

### 流程

```
pan.cjs login --manual
   ↓
打开百度限时体验页:https://pan.baidu.com/union/console/applist
  → 选择"开发者中心" → "OpenAPI 体验" → 复制 access_token
   ↓
CLI 提示「access_token:」,用户隐藏式粘贴
   ↓
保存到 token.json,kind=manual,expires_at=now+24h(粗略)
```

### 重要限制

- **没有 refresh_token**。`refreshIfNeeded()` 检测到 `kind=manual` 直接抛错。
- 实际百度限时体验 token 有效期由百度后端决定,可能短于 24h。`pan.cjs status` 会标注「无自动续期」。
- **不推荐用于 Claude Code 长会话**:Agent 跑到一半 token 过期,所有命令会失败。

### 何时考虑

- 用户在百度开放平台注册应用流程卡住(资质审核、身份证拍照等)。
- 临时演示 / 调试本 skill,不想配 client_id。

## 自有应用 vs 限时体验

### 为什么 v0.0.1-alpha 不内置百度公开 client_id

百度官方提供过"限时体验" client_id 给开发者验证 API,但:
1. 这些 client_id 经常被百度回收或限速。
2. 官方在 [bdpan-storage]([https://github.com/baidu-netdisk/bdpan-storage](https://github.com/baidu-netdisk/bdpan-storage)) 也只提供"自有应用"路径。
3. 我们不希望你的工作流因为公共 client_id 失效而断掉。

所以 `pan.cjs login`(不加 `--manual`)**强制要求自有应用 client_id/secret**,缺失时给出三条引导:
1. 注册自有应用并写入 `config.json`
2. 设置 env var `BAIDU_DRIVE_APP_ID` / `BAIDU_DRIVE_APP_SECRET`
3. 用 `pan.cjs login --manual` 临时体验

### 自有应用注册步骤

1. 打开 [百度网盘开放平台](https://pan.baidu.com/union/console/applist)。
2. 用百度账号登录。
3. **创建应用**:
   - 应用类型选"软件"。
   - 应用名称随意,如 `my-pan-skill`。
   - 接入方式选 `xpansdk`(关键,不是"网页应用"或"移动应用")。
   - 提交基础信息,等待审核(通常分钟级)。
4. 审核通过后,在应用详情页看到 **AppKey** 和 **SecretKey**。
   - AppKey = `client_id`
   - SecretKey = `client_secret`
5. 在应用 **设置 → 权限管理** 里勾选 `netdisk` 权限。**不勾就 errno 42213**。
6. 把凭据写入 `~/.config/baidu-drive-skill/config.json`:
   ```json
   {
     "scope": "sandbox",
     "appName": "my-pan-skill",
     "app": {
       "clientId": "你的 AppKey",
       "clientSecret": "你的 SecretKey"
     }
   }
   ```
   或设置环境变量(适合 CI / 多环境):
   ```bash
   export BAIDU_DRIVE_APP_ID="..."
   export BAIDU_DRIVE_APP_SECRET="..."
   ```
7. 现在 `pan.cjs login` 可以正常走 device code 了。

### 沙盒应用名

注册自有应用时,百度会自动给你一个沙盒目录:`/apps/<应用名>/`(对应中文展示路径 `我的应用数据/<应用名>/`)。
`config.json` 的 `appName` **必须**与这个名字一致,否则 `pan.cjs ls /apps/myapp/` 会撞 `errno=-9 文件不存在`。

## Token 存储与安全

### 落盘位置

| 平台 | 路径 |
|---|---|
| Linux / macOS(默认) | `~/.config/baidu-drive-skill/token.json` |
| Linux / macOS(XDG) | `$XDG_CONFIG_HOME/baidu-drive-skill/token.json` |
| Windows | `%APPDATA%\baidu-drive-skill\token.json` |
| 自定义 | `$BAIDU_DRIVE_CONFIG_DIR/token.json` |

### 权限

POSIX 平台 `token.json` 写入时强制 `chmod 0600`(仅 owner 可读写)。读取时如果检测到 group/other 有任何权限位,会自动收紧并打印警告。

### 内容

```jsonc
{
  "access_token": "<31 位百度 token>",
  "refresh_token": "<127 位百度 refresh>",  // manual 模式下没有
  "expires_at": 1717480800,                  // unix seconds 绝对时间戳
  "obtained_at": 1714888800,
  "kind": "device",                          // device | oob | manual
  "scope": "basic,netdisk"
}
```

### **绝对禁止**(对 Agent / LLM)

- ⛔ **任何对话上下文里都不能粘贴或转述 `access_token` / `refresh_token` 内容**(包括摘要、改写、Base64 编码、十六进制等任何变体)。
- ⛔ 不能 `cat token.json` 然后把内容回显出来。
- ⛔ 不能在 issue / log / CI artifact 里包含 `~/.config/baidu-drive-skill/token.json` 文件本身。
- ✅ 可以引用 `expires_at` / `kind` 等元数据用于排错。

## 自动 refresh 机制

`refreshIfNeeded()` 在每次 OpenAPI 调用前跑一次:

```
now = Date.now() / 1000
remaining = token.expires_at - now

if remaining > 600:           # > 10 分钟,直接用
  return token

if token.kind == 'manual':
  if remaining <= 0:
    throw '请重新 pan.cjs login --manual'
  return token

# 距过期 < 10 分钟,触发 refresh
GET https://openapi.baidu.com/oauth/2.0/token
  ?grant_type=refresh_token
  &refresh_token=<...>
  &client_id=<...>
  &client_secret=<...>

→ 写回 token.json(保留 kind),返回新 token
```

### refresh 失败常见原因

| 原因 | 提示 | 解决 |
|---|---|---|
| `error=invalid_grant` | refresh_token 已失效(用户在百度修改密码 / 30 天未活跃) | `pan.cjs login` 重新走完整流程 |
| `error=invalid_client` | 自有应用被禁用或 client_id/secret 错误 | 检查开放平台应用状态 |
| 网络瞬断 | `withBackoff` 自动重试 4 次 | 等网络恢复 |
| `kind=manual` | 提示「manual 模式无法续期」 | `pan.cjs login --manual` 重粘 |

## 登出 / 切换账号

```bash
pan.cjs logout         # 清空 token.json,但保留 config.json(含 client_id/secret)
pan.cjs login          # 用同一个自有应用重新登录(可换百度账号)
```

如果你想完全清干净:

```bash
rm -rf ~/.config/baidu-drive-skill/   # 慎用,client_secret 也会丢
```

## 排错速查

| 症状 | 可能原因 | 处理 |
|---|---|---|
| 「未找到 OAuth 客户端凭据」 | 没配 client_id | 见 §自有应用注册 或用 `--manual` |
| device 流程卡在「等待用户授权」 | 用户没扫码或拒绝了 | 重新 `login`,在浏览器同意 |
| OOB「授权码格式错误」 | 复制时多了空格 / 漏了字符 | 重新复制,确保是 32 位十六进制 |
| `errno=110` / `errno=111` | access_token 失效 | 通常 refresh 自动救,失败则 `login` |
| `errno=42213` | 应用没勾 netdisk 权限 | 开放平台 → 应用 → 权限 → 勾 netdisk |
| `errno=42214` / `31034` | 调用频率超限 | `withBackoff` 自动退避;持续报错就降低并发 |
| `pan.cjs status` 显示「manual,无自动续期」 | 用了 `--manual` 模式 | 切到自有应用即可有 refresh |

## 安全免责声明(在 `pan.cjs login` 第一次执行时强制显示)

> ⚠ 登录前请阅读
> 本 skill 通过百度网盘 OpenAPI 操作你的网盘。在执行登录前请确认:
>
>   1. 你已 **备份重要数据**。本 skill 处于 BETA 阶段,人为操作或 AI 误判都可能导致数据丢失。
>   2. 你会 **人工审核每条 AI 执行的命令**,尤其是 upload / mv / rename / rm。
>   3. 公共环境(共享机器、Codespace、容器)使用完后请运行 `pan.cjs logout`。
>   4. **严禁** 把 ~/.config/baidu-drive-skill/token.json 的内容粘贴到任何对话或日志里。
>
> 是否继续登录? [y/N]

只有用户输入 `y` / `yes` 才进入登录流程。`--yes` 在 Agent 环境下会被忽略(同 delete-policy 的 `--yes`)。
