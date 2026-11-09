# 作用域配置(scope-config)

## 概述

本 Skill 提供两种作用域模式,防止误操作整个网盘:

| 模式 | 说明 | 适用场景 |
|---|---|---|
| **sandbox(默认)** | 所有操作限定在 `/apps/<your-app>/` 下 | 推荐,与官方 bdpan-storage 行为一致 |
| **full** | 可操作整个网盘,可选白名单限制 | 需要管理网盘根目录或其他目录时手动开启 |

> **安全提示:** 首次开启 full 模式时,`pan.cjs status` 和 `pan.cjs scope full` 都会显式红字警告。

## 配置来源优先级(高 → 低)

1. **环境变量** (临时覆盖,不写入文件)
2. **CLI flag** (如 `--client-id`,仅限 OAuth 凭据)
3. **`config.json`** (持久化配置)
4. **默认值** (sandbox / appName=myapp)

### 环境变量

| 变量 | 说明 | 示例 |
|---|---|---|
| `BAIDU_DRIVE_SCOPE` | 覆盖 `scope` 字段 | `sandbox` 或 `full` |
| `BAIDU_DRIVE_APP_NAME` | 覆盖沙盒应用名 | `myapp` |
| `BAIDU_DRIVE_ALLOWED_PATHS` | 覆盖 full 模式白名单 | `/photos,/backup` (逗号分隔) |
| `BAIDU_DRIVE_CONFIG_DIR` | 配置目录位置 | `/path/to/config` |

> 环境变量优先级最高,即使 `config.json` 中 scope=sandbox,只要设置了 `BAIDU_DRIVE_SCOPE=full`,实际运行就是 full 模式。`pan.cjs status` 会显示 "(由 BAIDU_DRIVE_SCOPE 覆盖)"。

### config.json 字段

```jsonc
{
  "scope": "sandbox",          // "sandbox" | "full"
  "appName": "myapp",          // 沙盒根 = /apps/<appName>/
  "allowedPaths": ["/photos"], // full 模式白名单(空数组 = 无限制)
  "trash": { "retainDays": 7 },
  "concurrency": {
    "uploadParts": 4,          // 上传分片并发
    "downloadChunks": 4        // 下载分片并发
  }
}
```

## sandbox 模式

### 规则
- 所有路径必须以 `/apps/<appName>` 或 `/apps/<appName>/` 开头
- 试图访问 `/photos`、`/backup` 或 `/apps/otherapp/` 都会抛 `ScopeError`
- 沙盒根目录 `/apps/<appName>` 本身**不允许删除**(硬删除 guard 会拦截)

### 典型路径
```
/apps/myapp/uploads/          ✅ 允许
/apps/myapp/.trash/2026-05-04/ ✅ 允许(软删除目的地)
/photos/2024/                 ❌ 超出沙盒
/apps/otherapp/file.txt       ❌ 其他应用空间
```

### 新应用懒创建
百度不会在注册应用时自动创建 `/apps/<appName>/` 目录。首次执行 `mkdir`、`upload` 等写入操作才会触发后端创建。如果 `ls /apps/<appName/` 返回 "文件不存在",这是正常现象,执行一次 `mkdir /apps/myapp/test/` 即可。

## full 模式

### 开启方式
```bash
pan.cjs scope full
```

### 白名单(可选)
若 `allowedPaths` 非空,路径必须以其中之一为前缀:
```json
{ "scope": "full", "allowedPaths": ["/photos", "/backup"] }
```

此时:
- `/photos/2024/` ✅ 允许
- `/backup/db.sql` ✅ 允许
- `/videos/movie.mp4` ❌ 不在白名单内

若 `allowedPaths` 为空数组,则**无限制**,可操作整个网盘。

### 切换回 sandbox
```bash
pan.cjs scope sandbox
```

## 路径校验规则

所有传入的路径会经过 `normalizePath` 标准化:

| 输入 | 结果 | 说明 |
|---|---|---|
| `apps/myapp/foo` | `/apps/myapp/foo` | 自动补 `/` |
| `//apps//myapp//foo` | `/apps/myapp/foo` | 折叠多余 `/` |
| `/apps/myapp/foo/` | `/apps/myapp/foo` | 去尾部 `/` |
| `~/documents` | ❌ 抛 ScopeError | 禁止 `~` |
| `/apps/myapp/../secret` | ❌ 抛 ScopeError | 禁止 `..` |
| `我的应用数据/myapp/foo` | ❌ 抛 ScopeError | 禁止中文展示路径 |

## 常见问题

**Q: 为什么 `ls /` 在 sandbox 模式下报错?**
A: sandbox 模式下根目录 `/` 不在 `/apps/<appName>/` 下。请用 `ls /apps/myapp/`。

**Q: full 模式下如何限制只能操作某个目录?**
A: 设置 `allowedPaths`:
```bash
# 直接编辑 config.json,或:
export BAIDU_DRIVE_ALLOWED_PATHS=/photos,/backup
```

**Q: 环境变量和 config.json 冲突时以谁为准?**
A: 环境变量始终优先。`pan.cjs scope --print` 和 `pan.cjs status` 都会提示当前生效值是否被环境变量覆盖。
