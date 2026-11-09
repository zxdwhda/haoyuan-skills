# 搜索配方

## category 含义

百度网盘 `search` 接口的 `category` 参数对应以下分类：

| category | 含义 | 示例 |
|---|---|---|
| 1 | 视频 | `.mp4` `.mkv` `.avi` |
| 2 | 音频 | `.mp3` `.flac` `.wav` |
| 3 | 图片 | `.jpg` `.png` `.gif` |
| 4 | 文档 | `.pdf` `.docx` `.txt` |
| 5 | 应用 | `.apk` `.exe` `.dmg` |
| 6 | 其他 | 不属以上分类的文件 |
| 7 | 种子 | `.torrent` |

## 常用搜索配方

### 按文件名搜索

```bash
pan.cjs search "2024年度总结"
```

### 按分类搜索

```bash
# 搜索所有 PDF 文档
pan.cjs search "合同" --category 4

# 搜索所有视频
pan.cjs search "会议" --category 1
```

### 限定目录搜索

```bash
# 只在 /apps/myapp/documents/ 下搜索
pan.cjs search "发票" --dir /apps/myapp/documents/
```

### 配合 jq 消费 JSON

```bash
# 只输出文件名列表
pan.cjs search "备份" --json | jq -r '.[].server_filename'

# 计算搜索结果总大小
pan.cjs search "照片" --category 3 --json | jq '[.[].size] | add'

# 过滤出大于 100MB 的文件
pan.cjs search "电影" --category 1 --json | jq '.[] | select(.size > 104857600) | .server_filename'
```

## 语义搜索

语义搜索(`--semantic` / `--auto`)通过 `/xpan/unisearch` 端点实现，支持自然语言查询和内容级搜索：

| 能力 | 说明 |
|---|---|
| 文件名语义搜索 | 自然语言描述文件特征 |
| 图片 OCR 搜索 | 搜图片内的文字 |
| 文档内容搜索 | 搜 PDF/Word/PPT/Excel/txt 内的文本 |
| 视频/音频 ASR 搜索 | 搜视频/音频的语音转文字内容 |
| 图片语义搜索 | 搜图片的时间/地点/分类等 |

### 语义搜索示例

```bash
# 自然语言搜索
pan.cjs search "帮我找科技专栏文件夹下的AIGC相关文档" --semantic

# 按内容搜图片(如"北京故宫的照片")
pan.cjs search "北京故宫的照片" --semantic --category 3

# 自动判断(5字以上语义,5字及以下关键词)
pan.cjs search "帮我找合同文件" --auto
pan.cjs search "合同" --auto          # 短query自动走关键词搜索
```

### 语义搜索返回字段

| 字段 | 说明 |
|---|---|
| `filename` | 文件名 |
| `path` | 完整路径 |
| `parent_path` | 父目录 |
| `content` | 语义向量召回的文本段落(文档/视频/音频) |
| `ocr` | 图片 OCR 原始文本 |
| `category` | 文件类型(字符串:"1"-"7") |

### 语义搜索配合 jq

```bash
# 只看内容匹配的文件
pan.cjs search "AIGC" --semantic --json | jq '.[] | select(.content) | .filename'

# 只看有 OCR 匹配的图片
pan.cjs search "发票" --semantic --category 3 --json | jq '.[] | select(.ocr) | .filename'
```

## 注意事项

- 关键词搜索支持模糊匹配，默认递归子目录，结果上限 1000 条
- 语义搜索结果上限 500 条
- `--json` 输出可用 `jq` 进一步处理
- 沙盒模式下只能搜到沙盒内的文件
- 语义搜索的 `category` 支持多选(逗号分隔): `--category 3,4`
