<div align="center">

**中文** · [English](./README.en.md)

# 🧰 Zion's Skills

#### 我自己每天在用的一些 AI Skill，都开源在这里

[![License](https://img.shields.io/badge/License-MIT-3B82F6?style=for-the-badge)](./LICENSE)
[![AgentSkills](https://img.shields.io/badge/AgentSkills-Standard-8B5CF6?style=for-the-badge)](https://agentskills.io)

![Claude Code](https://img.shields.io/badge/Claude_Code-Skill-D97706?style=flat-square&logo=anthropic&logoColor=white)
![Codex](https://img.shields.io/badge/Codex-Skill-10B981?style=flat-square&logo=openai&logoColor=white)
![OpenCode](https://img.shields.io/badge/OpenCode-Skill-3B82F6?style=flat-square)
![OpenClaw](https://img.shields.io/badge/OpenClaw-Skill-8B5CF6?style=flat-square)

</div>

都是在自己项目里跑通了一段时间，确实省事，才搬出来开源的。没什么花活，就是几个挺实用的东西。

这里的每个 Skill 都是 Agent 能直接加载的结构化指令集，遵循 [Agent Skills](https://agentskills.io) 开放标准。Claude Code、Codex、OpenCode、OpenClaw 都能装。

---

## 📋 目录

| 名字 | 一句话 |
|---|---|
| 📝 [**wechat-article（公众号文章生成）**](#-wechat-article公众号文章生成) | 输入一个选题，自动生成短文风格公众号文章 + 即梦 AI 配图，直接上传到微信公众平台草稿箱 |

---

## 📦 安装方式

在 Claude Code、Codex、OpenClaw 等支持 Skill 的 Agent 里，直接说：

```
帮我安装这个 skill：https://github.com/zionxaviardamienang/skills/tree/main/<skill-name>
```

把 `<skill-name>` 换成你想装的那个。Agent 会自己 clone 到对应目录，不用你操心路径。

---

## ✨ Skills

<a id="-skills"></a>

<table>
<tr><td>

### 📝 wechat-article（公众号文章生成）

> *"输入一个选题，AI 自动写文章、用即梦生图、一键上传到微信公众平台草稿箱。"*

一个端到端的微信公众号内容生产管道：

- **阶段一：内容创作** — 根据选题生成短文风格文章（前言 + 3~5 段正文 + 后记），写作风格温暖治愈
- **阶段二：生成配图** — 调用即梦 API（豆包 Seedream 4.0）为每个主体段落生成配图
- **阶段三：组装 HTML** — 将文字 + 图片组装成微信公众平台兼容的 HTML
- **阶段四：上传草稿** — 通过微信公众平台 API 直接上传到草稿箱

**环境要求：** 火山引擎 ARK API Key + 微信公众平台 AppID / AppSecret

</td></tr>
</table>

---

## 🤝 贡献

欢迎提 Issue 和 PR。如果你也有好用的 Skill 想分享，可以直接 PR 加进来。

## 📄 许可

[MIT](./LICENSE) © 2025 Zion
