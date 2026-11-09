# 安全策略

## Token 存储

`access_token` 和 `refresh_token` 存储在 `token.json` 中：

- **创建时**：`chmod 0600`（仅所有者可读写）
- **读取时**：POSIX 平台检测权限，若 group/other 有读权限则自动收紧并警告
- **Windows**：依赖 ACL，不做额外检查

**绝对不要**将 `token.json` 提交到 git 或发送给他人。

## 安全声明（登录前必显示）

运行 `pan.cjs login` 时会显示：

1. **备份重要数据** — 任何网盘操作都有风险，重要文件请保留本地副本
2. **AI 行为人工审核** — 本 Skill 由 LLM 驱动时，请仔细审查命令再确认执行
3. **公共环境用完退出** — 在共享机器或 CI 环境中，`pan.cjs logout` 清除 token
4. **严禁泄露 token** — `~/.config/baidu-drive-skill/token.json` 等同于你的百度账号

## 漏洞披露

如果你发现了安全漏洞，请通过以下方式私下报告：

1. 发送邮件至维护者（见 GitHub 仓库主页）
2. **不要**在公开 issue 中披露细节
3. 我们会在确认后 7 个工作日内回复

## 已知限制

| 问题 | 缓解措施 |
|---|---|
| token 仅 chmod 0600 保护，无 OS keychain 加密 | v0.2 计划引入 keychain 作为可选后端 |
| access_token 拼在 URL query 中（百度 OpenAPI 规范） | 使用 HTTPS；token 不出现在日志/错误消息中 |
| 硬删除不可逆 | 四级保护 + 默认软删除；Agent 环境强制忽略 `--yes` |
