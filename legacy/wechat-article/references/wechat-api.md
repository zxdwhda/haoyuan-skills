# 微信公众平台 API 参考

## 获取 Access Token

```
GET https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=APPID&secret=APPSECRET
```

有效期 7200 秒，需缓存复用。

## 上传图片到微信 CDN（文章正文用）

```
POST https://api.weixin.qq.com/cgi-bin/media/uploadimg?access_token=ACCESS_TOKEN
```

Content-Type: `multipart/form-data`
字段: `media` (文件)

返回: `{ "url": "https://mmbiz.qpic.cn/..." }`

## 上传永久素材（封面图）

```
POST https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=ACCESS_TOKEN&type=image
```

Content-Type: `multipart/form-data`
字段: `media` (文件)

返回: `{ "media_id": "..." }`

## 新增草稿

```
POST https://api.weixin.qq.com/cgi-bin/draft/add?access_token=ACCESS_TOKEN
```

请求体:
```json
{
  "articles": [
    {
      "article_type": "news",
      "title": "标题（≤32字）",
      "author": "作者（≤16字）",
      "digest": "摘要（≤128字）",
      "content": "HTML内容（<2万字符，<1M）",
      "content_source_url": "原文链接（可选）",
      "thumb_media_id": "封面永久素材media_id",
      "need_open_comment": 0,
      "only_fans_can_comment": 0
    }
  ]
}
```

返回: `{ "media_id": "..." }`

## 注意事项

- `thumb_media_id` 必须传入（尽管文档标非必填）
- 草稿发布后自动从草稿箱移除
- content 中的图片需先上传到微信 CDN
