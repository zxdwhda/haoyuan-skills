# 平台注意事项

## macOS

### Gatekeeper / Quarantine

从 GitHub Release 下载的 zip 解压后，macOS 可能给文件打上 `com.apple.quarantine` 属性，导致运行时提示「无法验证开发者」。

```bash
# 方案 1：xattr 移除（推荐）
xattr -rd com.apple.quarantine ~/.claude/skills/baidu-drive-pro/

# 方案 2：系统设置 → 隐私与安全性 → 允许
```

### ARM64 (Apple Silicon)

本 Skill 纯 Node.js，原生支持 arm64 和 x64，无需 Rosetta。

## Linux

### XDG 目录

配置默认遵循 XDG Base Directory：

- `$XDG_CONFIG_HOME/baidu-drive-skill/`（若设置了 XDG_CONFIG_HOME）
- `~/.config/baidu-drive-skill/`（默认）

### headless / SSH 环境

无浏览器环境建议用 `--oob` 登录：

```bash
pan.cjs login --oob
```

## Windows

### 路径分隔符

网盘路径始终使用 `/`（POSIX 风格）。Windows 本地路径用 `\`，但 remote 路径必须用 `/`：

```bash
# ✅ 正确
pan.cjs upload "C:\Users\Alice\file.zip" /apps/myapp/

# ❌ 错误（remote 路径不能用反斜杠）
pan.cjs upload C:\file.zip \apps\myapp\
```

### PowerShell 执行策略

如果提示「无法加载脚本，因为在此系统上禁止运行脚本」：

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 配置目录

Windows 配置默认存放在 `%APPDATA%\baidu-drive-skill\`。

## WSL

WSL 环境下与 Linux 行为一致。如需访问 Windows 文件系统：

```bash
# 从 WSL 访问 Windows 桌面
pan.cjs upload /mnt/c/Users/Alice/Desktop/file.zip /apps/myapp/
```

## 通用

### Node 版本要求

- 最低 Node.js 18.0.0
- 推荐 Node.js 20 LTS

### 代理

本 Skill 使用原生 `fetch`，支持 `HTTP_PROXY` / `HTTPS_PROXY` 环境变量（Node.js 21+ 原生支持；Node 18-20 需要确认系统代理配置）。
