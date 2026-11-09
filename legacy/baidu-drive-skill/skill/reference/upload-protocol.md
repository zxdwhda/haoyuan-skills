# 上传协议说明

## 三段式上传流程

百度网盘 OpenAPI 的大文件上传采用 **precreate → superfile2 → create** 三段式:

```
本地文件
   │
   ▼
precreate  (声明文件元数据 + MD5)
   │─ 秒传命中? → 直接返回 fs_id,跳过上传
   │─ 未命中   → 返回 uploadid + 需要上传的分片序号
   ▼
superfile2 (逐片 POST 文件数据)
   │
   ▼
create     (提交 uploadid + 所有分片 MD5,后端落盘)
```

## 分片策略

| 用户等级 | 建议分片大小 | 本 Skill 默认值 |
|---|---|---|
| 普通用户 | 4 MB | **4 MB** |
| VIP | 16 MB | 4 MB(兼容) |
| SVIP | 32 MB | 4 MB(兼容) |

> 采用 4MB 是为了兼容所有用户等级。VIP/SVIP 用 4MB 也能上传,只是分片数更多、请求数更多,速度略慢。

## 秒传(rapid upload)

### 原理
在 `precreate` 时附带两个额外字段:
- `content-md5`: 整文件 MD5
- `slice-md5`: 前 256 KB 的 MD5

百度后端比对数据库中已有文件的 MD5,若匹配则直接创建硬链接,**无需实际上传数据**。

### 限制
- 文件 < 256 KB:秒传无意义,直接走普通流程
- 百度后端并非 100% 覆盖所有文件,秒传未命中是正常现象
- 刚上传的文件可能还没进入秒传索引,短时间内再次上传同名文件可能无法命中

## 断点续传

### state 文件位置
```
~/.config/baidu-drive-skill/uploads/<sha256(remotePath)[:32]>.json
```

### 内容示例
```json
{
  "path": "/apps/myapp/big.zip",
  "size": 104857600,
  "contentMd5": "abc123...",
  "sliceMd5": "def456...",
  "blockMd5s": ["md5-1", "md5-2", "..."],
  "uploadid": "PREC-20260504-XXXX",
  "completed": [0, 1, 2],
  "createdAt": 1714800000
}
```

### 复用条件
1. 远端路径 `path` 一致
2. 文件大小 `size` 一致
3. 整文件 MD5 `contentMd5` 一致
4. 分片 MD5 列表 `blockMd5s` 一致

任一条件不满足 → 删除旧 state,从头开始。

### 手动清除
```bash
rm ~/.config/baidu-drive-skill/uploads/*.json
```

### 关闭续传
```bash
pan.cjs upload ./file.zip /apps/myapp/ --no-resume
```

## 冲突策略(rtype)

| rtype | 行为 | 风险 |
|---|---|---|
| 0 | 报错(同名直接拒绝) | 低 |
| 1 | 同名重命名加 `_1`、`_2` 序号(默认) | 低 |
| 2 | 同 path 同 size 直接返回已有文件 | 低 |
| 3 | **覆盖**(删除旧文件,写入新文件) | ⚠️ 高,旧文件不可恢复 |

```bash
# 默认:冲突时重命名
pan.cjs upload ./file.zip /apps/myapp/

# 覆盖(危险)
pan.cjs upload ./file.zip /apps/myapp/ --rtype 3
```

## 并发上传

默认 4 个分片并发上传,可在 `config.json` 调整:
```json
{ "concurrency": { "uploadParts": 8 } }
```

> 并发数过高容易触发百度限流(errno=31034/31399/42214),不建议超过 8。

## 进度与监控

上传时终端会显示进度条:
```
上传 ./big.zip [████████░░░░░░░░░░░░░░░░░░░░░░] 25.0%  10 MB / 40 MB  2.5 MB/s
```

每完成一个分片会即时更新 state 文件,即使 Ctrl-C 中断也能从断点续传。

## 常见问题

**Q: 上传失败报错 "第一个分片大小不正确"(errno=31299)?**
A: state 文件可能损坏,删除对应 state 后重试:
```bash
rm ~/.config/baidu-drive-skill/uploads/*.json
```

**Q: 为什么秒传有时不成功?**
A: 百度秒传索引有延迟,新上传的文件需要一段时间才能被秒传命中。另外若文件在百度网盘本身不存在相同副本,自然无法秒传。

**Q: 上传过程中断网怎么办?**
A: 重新运行同样的 `upload` 命令即可自动续传(只要 state 文件未被删除)。

**Q: 最大支持多大的文件?**
A: 百度网盘 OpenAPI 理论上支持数 TB 级别,但分片数过多时 `block_list` JSON 可能超长。目前未设硬性上限,如遇问题请反馈。
