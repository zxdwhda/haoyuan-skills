# 即梦/豆包 Seedream 4.0 API 参考

## 接口地址

```
POST https://ark.cn-beijing.volces.com/api/v3/images/generations
```

## 认证方式

```
Authorization: Bearer $ARK_API_KEY
```

在火山引擎控制台获取 API Key：https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey

## 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| model | string | 是 | `doubao-seedream-4-0-250828` |
| prompt | string | 是 | 图片描述，支持中文，建议 50-200 字 |
| sequential_image_generation | string | 否 | `disabled`（单张）或 `enabled`（多张） |
| response_format | string | 否 | `url` 返回图片链接 |
| size | string | 否 | `2K` 或 `1K` |
| stream | boolean | 否 | 固定 `false` |
| watermark | boolean | 否 | 是否带水印 |

## 响应格式

```json
{
  "data": [
    {
      "url": "https://...",
      "width": 2048,
      "height": 2048
    }
  ]
}
```

## Prompt 编写建议

- 中文描述为主，可夹杂英文专业术语
- 结构：主体 + 风格 + 色彩 + 质感
- 避免敏感词、暴力、色情内容
- 参考长度：50-150 字
