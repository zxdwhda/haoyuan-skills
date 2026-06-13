<div align="center">

[中文](./README.md) · **English**

# 🧰 Zion's Skills

#### AI Skills I use every day, all open-sourced here

[![License](https://img.shields.io/badge/License-MIT-3B82F6?style=for-the-badge)](./LICENSE)
[![AgentSkills](https://img.shields.io/badge/AgentSkills-Standard-8B5CF6?style=for-the-badge)](https://agentskills.io)

![Claude Code](https://img.shields.io/badge/Claude_Code-Skill-D97706?style=flat-square&logo=anthropic&logoColor=white)
![Codex](https://img.shields.io/badge/Codex-Skill-10B981?style=flat-square&logo=openai&logoColor=white)
![OpenCode](https://img.shields.io/badge/OpenCode-Skill-3B82F6?style=flat-square)
![OpenClaw](https://img.shields.io/badge/OpenClaw-Skill-8B5CF6?style=flat-square)

</div>

Each skill here has been battle-tested in my own projects before being open-sourced. No gimmicks, just practical tools.

Every Skill follows the [Agent Skills](https://agentskills.io) open standard. Works with Claude Code, Codex, OpenCode, and OpenClaw.

---

## 📋 Directory

| Name | Description |
|---|---|
| 📝 [**wechat-article**](#-wechat-article) | Input a topic, auto-generate a WeChat article + AI illustrations via Jimeng, upload directly to WeChat Official Account drafts |

---

## 📦 Installation

In any Agent that supports Skills (Claude Code, Codex, OpenClaw), just say:

```
Install this skill: https://github.com/zionxaviardamienang/skills/tree/main/<skill-name>
```

Replace `<skill-name>` with the one you want. The Agent will clone it to the right directory.

---

## ✨ Skills

<a id="-skills"></a>

<table>
<tr><td>

### 📝 wechat-article

> *"Input a topic, AI writes the article, generates images via Jimeng, and uploads to WeChat drafts — all in one go."*

An end-to-end WeChat content production pipeline:

- **Phase 1: Content Creation** — Generate a short-form article (intro + 3~5 body sections + outro) in a warm, healing style
- **Phase 2: Image Generation** — Call Jimeng API (Doubao Seedream 4.0) to generate illustrations for each section
- **Phase 3: HTML Assembly** — Combine text + images into WeChat-compatible HTML
- **Phase 4: Upload Draft** — Upload directly to WeChat Official Account draft box via API

**Requirements:** Volcengine ARK API Key + WeChat Official Account AppID / AppSecret

</td></tr>
</table>

---

## 🤝 Contributing

Issues and PRs welcome. If you have a useful Skill to share, feel free to PR it in.

## 📄 License

[MIT](./LICENSE) © 2025 Zion
