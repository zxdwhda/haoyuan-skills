# 贡献指南

感谢你的兴趣！在提交 PR 之前，请先阅读以下指南。

## 开发环境

- Node.js ≥ 18.0.0
- pnpm（推荐）或 npm

```bash
pnpm install
pnpm typecheck   # TypeScript 检查
pnpm test        # 运行全部测试
pnpm build       # 构建产物 skill/assets/dist/pan.cjs
```

## 项目结构

```
src/
  pan.ts           # CLI 入口
  auth.ts          # OAuth + token 管理
  client.ts        # OpenAPI fetch 封装
  config.ts        # 配置读写
  scope.ts         # 沙盒/全盘路径校验
  delete-policy.ts # 硬删除四级保护
  fileops.ts       # ls/mkdir/mv/cp/rename/rm
  upload.ts        # 分片上传 + 秒传
  download.ts      # 分片下载
  search.ts        # 搜索（在 fileops.ts 中）
  share.ts         # 分享/转存
  ui.ts            # 终端 UI 工具
  errors.ts        # 错误类 + errno 映射
```

## 提交规范

- 使用 [Conventional Commits](https://www.conventionalcommits.org/)
- 每个 PR 聚焦一个功能或修复
- 新增功能必须附带测试
- 修改 CLI 行为需同步更新 SKILL.md / reference 文档

## 测试

```bash
pnpm test              # 单元 + 契约测试
pnpm test:coverage     # 带覆盖率报告
```

- **单元测试**（`tests/unit/`）：纯函数，不依赖网络
- **契约测试**（`tests/contract/`）：使用 [nock](https://github.com/nock/nock) mock OpenAPI 响应

## 发布流程

由维护者操作：

1. 更新 `package.json` 版本号
2. 更新 `CHANGELOG.md`
3. 打 tag：`git tag -s v0.x.x`
4. push tag，GitHub Actions 自动：
   - 跑 CI（lint + test + build）
   - `npm publish --provenance`
   - 创建 GitHub Release
