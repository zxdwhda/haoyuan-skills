# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added — 安装体验改进(2026-05-05)

- **Plugin Marketplace 支持** — 新增 `.claude-plugin/marketplace.json`,用户可在 Claude Code 中执行 `/plugin marketplace add zxdwhda/baidu-drive-skill && /plugin install baidu-drive-pro@baidu-drive-skill` 一键安装,无需 `git clone` / `npm install` / `npm run build` / 软链。
- **`pan.cjs` 移出 `.gitignore`** — 编译产物 `skill/assets/dist/pan.cjs` 现在直接 commit 进 git,Plugin Marketplace 安装无需本地构建链。修改 `src/` 后需 `npm run build` 重新生成产物并一并 commit。
- **`resource/` 目录 + 占位说明** — 存放 README 引用的截图,文件名与图说见 [resource/README.md](resource/README.md)。当前 5 张图(`install-success.png` / `claude-skills-list.png` / `baidu-console.png` / `login-flow.png` / `demo-chat.png`)为待补充占位,实际 PNG 由维护者手工补充。

### Changed — README 重写

- 仿 `AMap-Web/amap-skills` 的 4 步走结构(安装 → 注册百度应用 → 配凭据 → 验证),首推 Plugin Marketplace,本地手动安装作为备选。
- 新增 **目录结构 ASCII 图** / **FAQ 五连**(skill 没识别 / 找不到 pan.cjs / errno=-9 懒创建 / Windows 中文路径 / 授权码泄露应急) / **更新和卸载章节**。
- macOS / Linux / Windows(PowerShell + CMD)三套复制命令并列,弃用软链(避免源目录被删后 skill 静默失效)。
- 修正仓库 URL:`baidu-drive-skill/baidu-drive-skill` → `zxdwhda/baidu-drive-skill`(实际 GitHub owner)。
- 删除原"方式 B: npm 全局安装(v0.1.0+ 支持)"空头支票 —— Plugin Marketplace 已替代该方案。

### Planned (Week 2 — v0.1.0)

- 新功能:`upload`(precreate + superfile2 + 秒传 + 断点) / `download`(filemetas + dlink + Range 分片) / `rm`(软删除到 `.trash/<日期>/`) / `delete-policy.ts`(四级保护守卫) / `BAIDU_DRIVE_SCOPE` 环境变量。
- 测试:vitest 单测 + nock 契约测试,P0 模块覆盖率 > 90%。
- 新 reference docs:`scope-config.md` / `error-codes.md` / `upload-protocol.md`。

### Carry-over from v0.0.1-alpha.0 dogfood(2026-05-04 真账号验证发现)

- **Bug — `pollDeviceToken` 误判 `authorization_pending` 为网络瞬断**
  百度对 OAuth device flow 的等待状态返回 HTTP 400 + `error=authorization_pending`,但 `oauthGet()` 在 `if (!res.ok)` 分支直接抛 `AuthError`,被 `pollDeviceToken` 的 `catch` 当成网络瞬断每 5 秒打一行「(轮询失败,继续等待...)」。功能不受影响(继续轮询直到拿到 token),但日志污染严重。修法:`oauthGet()` 在 4xx 时也解析 JSON body 返回,由上层判断 `error` 字段(`authorization_pending` / `slow_down` / `expired_token` / 真错误)。涉及 [src/auth.ts:86-119](src/auth.ts#L86-L119) + [src/auth.ts:200-213](src/auth.ts#L200-L213)。
- **UX — 沙盒目录懒创建提示太干**
  自有应用刚在开放平台注册后,百度后端不会预先创建 `/apps/<appName>/`,首次 `ls /apps/<appName>/` 撞 `errno=-9 文件不存在`,让用户以为 appName 配错。实际跑一次任意写入(`mkdir` / `upload`)即触发懒创建。修法:`fileops.ls` 检测到「路径等于沙盒根 + errno=-9」时换成专用提示「沙盒目录尚未创建,执行 `pan.cjs mkdir /apps/<appName>/uploads/` 即可自动创建」。涉及 [src/fileops.ts](src/fileops.ts)(`ls` 函数)。

## [0.0.1-alpha.0] — 2026-05-04

First internal dogfood release. Login + read-only commands work end-to-end.

### Added

- Project skeleton: `package.json`, `tsconfig.json`, `esbuild.config.mjs`, `.gitignore`, `LICENSE`, `README.md`.
- TypeScript source under `src/`:
  - `errors.ts` — error classes (`BaiduError`, `AuthError`, `ScopeError`, `PolicyError`, `ConfigError`, `HttpError`) and `mapErrno()` table covering 30+ errno codes.
  - `config.ts` — `~/.config/baidu-drive-skill/` IO with platform-aware path resolution (XDG / `%APPDATA%` / `BAIDU_DRIVE_CONFIG_DIR`), `chmod 0600` on `token.json`, and secure-perms self-check on read.
  - `scope.ts` — `assertInScope()` for sandbox vs full-disk path validation, `normalizePath()` rejecting `..` / `~` / Chinese display path, `toDisplayPath()` for `/apps/...` ↔ `我的应用数据/...` mapping.
  - `ui.ts` — OSC8 hyperlink with terminal fallback, masked stdin (`promptHidden`), `confirmExactString()`, `ProgressBar` class, agent-env detection (`isAgentEnv`).
  - `auth.ts` — three OAuth flows (device code / OOB authorization code / manual paste); `refreshIfNeeded()` triggers 10 min before expiry; manual mode is explicitly non-refreshable.
  - `client.ts` — `xpanGet` / `xpanPostForm` / `pcsUpload` / `dlinkFetch`, dual error check (HTTP status + `errno != 0` on HTTP 200), `withBackoff` exponential retry for HTTP 429/5xx and errno 31034/31399/42214, `User-Agent: pan.baidu.com` enforced on dlink fetches.
  - `fileops.ts` — `ls` / `lsAll` (auto-pagination) / `mkdir` (idempotent on errno 10/-8/31075) / `getUserInfo` / `getQuota` / `filemetas` / `statByPath`.
  - `login.ts` — `runLogin()` with the 4-point disclaimer (backup data / human-review AI commands / logout in shared environments / never paste token.json); `--yes` is force-ignored under Agent envs (`CLAUDE_CODE` / `ANTHROPIC_API_KEY` / `MCP_SERVER`).
  - `pan.ts` — Commander CLI registering `login`, `logout`, `status`, `scope`, `ls`, `mkdir`. All handlers route errors through a single `runWithErrorHandling` wrapper that exits 1 on failure with a friendly localized message.
- Skill resources:
  - `skill/SKILL.md` — entry with `name: baidu-drive-pro`, trigger rules, 4-tier confirmation table, command summary, path-mapping rules, and reference index.
  - `skill/reference/delete-policy.md` — four-level protection for hard delete (clarity of intent, scope listing, exact-string confirmation, last-chance soft-delete offer) plus immediate-abort conditions.
  - `skill/reference/oauth-flows.md` — comparison of device / OOB / manual flows, own-app registration steps, token storage details, refresh behavior, common error troubleshooting.
- Build pipeline: `esbuild` bundles `src/pan.ts` → `skill/assets/dist/pan.cjs` (single file, ~159 KB, Node 18 target, `#!/usr/bin/env node` shebang).
- CI: `.github/workflows/ci.yml` — typecheck + build matrix (Node 18/20/22 × Ubuntu/macOS/Windows) on every push and PR.

### CLI surface (this release)

```
pan.cjs login [--device|--oob|--manual] [--client-id ...] [--client-secret ...] [--token ...] [--yes]
pan.cjs logout
pan.cjs status
pan.cjs scope [sandbox|full] [--app-name <name>] [--print]
pan.cjs ls <path> [--limit N] [--all] [--json] [--desc] [--order name|time|size] [--folder]
pan.cjs mkdir <path>
```

### Not yet implemented

- `upload` / `download` (precreate + superfile2 + dlink, chunked) — Week 2.
- `rm` soft-delete via `.trash/<date>/` move — Week 2.
- `rm --hard` with four-level protection — Week 3.
- `search` / `mv` / `cp` / `rename` / `share` / `transfer` / `trash --gc | --restore` — Week 3.
- nock contract tests + vitest unit tests — Week 2.
