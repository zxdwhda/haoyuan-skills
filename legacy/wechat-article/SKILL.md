---
name: wechat-article
description: >-
  输入一个选题，自动改写成短文风格的公众号文章（3~5段），
  每段配有 AI 生成的插图，最终上传到微信公众平台草稿箱。
when_to_use: 当用户说"写一篇公众号文章"、"生成微信推文"、"发布到公众号草稿箱"或类似需求时触发。
argument-hint: <选题或文章主题>
arguments: topic
allowed-tools: Bash Read Write WebFetch
---

# 微信公众号文章生成 & 上传技能

## 概述

输入一个**选题**，按短文风格改写为一篇完整的公众号文章，
为每个主体段落生成配图，最终上传到微信公众平台草稿箱。

## 环境要求

使用前确保 `.env` 文件已配置（位于 `${CLAUDE_SKILL_DIR}/.env`）：

```
ARK_API_KEY=your-ark-api-key
WECHAT_APPID=your-wechat-appid
WECHAT_SECRET=your-wechat-appsecret
```

**首次使用提示**：如果 `.env` 不存在，提示用户复制 `.env.example` 并填入真实凭证，然后终止流程。

---

## 执行流程

按以下 4 个阶段**顺序执行**，不允许跳过。

---

### 阶段一：内容创作

根据用户输入的选题 `$ARGUMENTS`，生成一篇短文风格的公众号文章。

**文章结构：**

```
前言（~2-3句话，引出主题）
第一部分标题图 → 第一段正文
第二部分标题图 → 第二段正文
第三部分标题图 → 第三段正文
...
后记（~2-3句话，总结升华）
```

**分段规则（重要）：**

| 条件 | 处理 |
|------|------|
| 1 个主体部分 | ❌ 拒绝：提示用户选题太窄，需要至少 2 个部分 |
| 2 个主体部分 | ⚠️ 允许但不推荐，提示用户考虑扩展 |
| 3~5 个主体部分 | ✅ 最佳范围 |
| 6 个主体部分 | ⚠️ 允许但不推荐，提示用户考虑合并 |
| >6 个主体部分 | ❌ 拒绝：提示用户选题太宽，请聚焦到 6 个以内 |

**写作风格（严格遵循参考文章风格）：**

参考文章：「悦漫先生」公众号，《多夸，少管，适合所有关系》

- **篇幅**：每段 3~5 句话，整篇控制在 400~800 字
- **句长**：短句为主，每句 10~25 字，节奏明快
- **文风**：温暖、治愈、有洞察力，像朋友聊天
- **结构**：段落之间自然递进，有逻辑有层次
- **语言**：口语化但不随意，有韵律感，偶尔用排比
- **禁止**：不说教、不鸡汤套路化、不用"你应当""你必须"等命令语气

**前言写法：**
- 两三句话点出选题痛点或共鸣点
- 不用"本文"、"小编"等公众号套话
- 像文章第一段一样自然开头

**后记写法：**
- 简短收尾，一两句即可
- 可以是一个金句、一个比喻、或一个温柔的提醒
- 不总结全文，不写"欢迎留言"

**输出格式：**

完成写作后，用以下结构输出给用户确认：

```
## 📝 文章内容确认

**标题：** <文章标题>

**前言：**
<前言内容>

---
🖼️ 第一部分标题图（固定banner）
<第一部分正文>
🎨 配图 prompt: <即梦生图提示词>

---
🖼️ 第二部分标题图（固定banner）
<第二部分正文>
🎨 配图 prompt: <即梦生图提示词>

---
...

**后记：**
<后记内容>

---
**分段数：** X 个主体部分
**预估总字数：** XXX 字
```

呈现给用户确认。用户确认后进入阶段二。

---

### 阶段二：生成配图

为每个主体部分生成配图。前言和后记不生成图片。

**即梦 API 调用：**

```bash
node ${CLAUDE_SKILL_DIR}/scripts/generate-image.js \
  --prompt "<配图提示词>" \
  --output "${CLAUDE_SKILL_DIR}/assets/output/part-<N>.png"
```

**配图 prompt 编写规范：**

每条 prompt 需包含：
1. **主体描述**（~10字）：画面的核心元素
2. **风格定语**（~15字）：温暖插画风 / 简约文艺感 / 治愈手绘风
3. **色彩倾向**（~8字）：暖色调 / 莫兰迪色系 / 柔和对比
4. **技术后缀**：质感真实，柔和光线，细腻笔触，画面简洁有留白，高级感

prompt 示例：
> 两个人在夕阳下并肩坐着，远处是城市的轮廓，温暖插画风，治愈系手绘，暖橙色调，柔和光晕，画面简洁有留白，高级感

**执行方式：**

遍历每个主体部分，依次调用脚本生成图片。每次调用后确认成功再继续。

**错误处理：**
- 生成失败 → 重试 1 次
- 仍失败 → 提示用户该部分配图生成失败，是否继续（跳过该图片）或中止

全部配图生成完毕后进入阶段三。

---

### 阶段三：组装 HTML

将所有内容组装成微信公众平台兼容的 HTML。

**组装规则：**

1. **前言**：纯文字 `<p>` 标签
2. **每个主体部分**：`<img>` 标题图 → `<p>` 正文 → `<img>` 配图
3. **后记**：纯文字 `<p>` 标签
4. 段落间距用 `<br>` 或 `<section>` 控制

**HTML 模板：**

```html
<section style="margin-bottom: 2em;">
  <p style="color: #333; font-size: 15px; line-height: 1.8; letter-spacing: 1px;">
    前言内容...
  </p>
</section>

<!-- 标题图：width 100% 撑满，max-height 200px 防止过高 -->
<section style="margin-bottom: 1.2em; text-align: center;">
  <img src="微信CDN-URL" alt="第一部分" style="display: block; width: 100%; max-width: 100%; height: auto; max-height: 200px; object-fit: contain; margin: 0 auto;" />
</section>
<section style="margin-bottom: 2em;">
  <p style="color: #333; font-size: 15px; line-height: 1.8; letter-spacing: 1px;">
    第一部分正文...
  </p>
</section>
<!-- 配图：自适应宽度，不定高 -->
<section style="margin-bottom: 2em; text-align: center;">
  <img src="微信CDN-URL" alt="配图" style="display: block; max-width: 100%; height: auto; margin: 1em auto; border-radius: 4px;" />
</section>

<!-- 重复每个部分... -->

<section style="margin-bottom: 2em;">
  <p style="color: #333; font-size: 15px; line-height: 1.8; letter-spacing: 1px;">
    后记...
  </p>
</section>
```

**重要**：
- 标题图使用 `${CLAUDE_SKILL_DIR}/assets/banners/part-<N>.png`（用户自行提供）
- 配图使用阶段二生成并上传到微信 CDN 的 URL
- 所有图片需先上传到微信 CDN（`/cgi-bin/media/uploadimg`）才能在文章中使用

---

### 阶段四：上传草稿

调用脚本上传到微信公众平台草稿箱：

```bash
node ${CLAUDE_SKILL_DIR}/scripts/upload-draft.js \
  --title "文章标题" \
  --author "作者名" \
  --content-filename "/tmp/wechat-content.html" \
  --cover "${CLAUDE_SKILL_DIR}/assets/output/part-1.png" \
  --digest "文章摘要"
```

**参数说明：**
- `title`：文章标题（≤32字）
- `author`：作者名（≤16字），首次使用询问用户，后续记住
- `content-filename`：阶段三生成的 HTML 文件路径（HTML先写入临时文件避免 shell 转义问题）
- `cover`：封面图路径，默认用第一部分的配图
- `digest`：摘要（≤128字），自动从前言提取

**脚本内部流程：**
1. 读取 `.env` 获取 `WECHAT_APPID` / `WECHAT_SECRET`
2. 获取 `access_token`
3. 上传封面图为永久素材 → 获得 `thumb_media_id`
4. 调用 `draft/add` 创建草稿 → 获得 `media_id`
5. 输出草稿信息

**输出给用户：**

```
## ✅ 草稿已上传

- **草稿 media_id：** <media_id>
- **文章标题：** <title>
- **作者：** <author>
- **分段数：** X 个主体部分
- **封面图：** 已上传
- **配图：** X 张

请登录微信公众平台后台查看草稿：
https://mp.weixin.qq.com → 草稿箱
```

---

## 依赖管理

首次运行前安装依赖：

```bash
cd ${CLAUDE_SKILL_DIR}/scripts && npm install
```

---

## 注意事项

1. **用户确认点**：阶段一完成后**必须**让用户确认内容，通过后才能继续
2. **即梦 API 限频**：每次调用间隔 ≥ 2 秒，避免触发限流
3. **微信 token 有效期**：7200 秒，脚本内部自动缓存
4. **图片格式**：即梦生成 PNG，微信支持 PNG/JPG，无需转换
5. **敏感内容**：如果选题涉及政治、色情、暴力等敏感话题，拒绝生成
6. **成本提示**：每次生图消耗即梦积分，大概消耗 N×1 次调用（N=分段数）
