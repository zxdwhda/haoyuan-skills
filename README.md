# Haoyuan Skills

我使用和整理的 AI 技能集合。一个仓库收录多个技能，当前维护内容与历史快照分开管理。

## 当前维护

| 技能 | 用途 | 验证范围 |
|---|---|---|
| [haoyuan-title-strategist](haoyuan-title-strategist/README.md) | 从文章事实出发，生成、比较和修改公众号标题 | 纯指令，入口及引用检查；不承诺流量效果 |

“当前维护”说明维护意向，不等于所有工具、平台或业务效果均已验证。[验证记录](docs/validation.md)逐项说明边界。

## 历史版本

[legacy](legacy/README.md) 保存百度网盘、Kimi 编排及旧公众号技能的源码快照，不再作为当前推荐，不承诺兼容最新平台。原仓库暂时保留，完整提交历史仍可追溯。

## 安装

```sh
git clone https://github.com/zxdwhda/haoyuan-skills.git
```

只选择所需的当前技能目录，按其 README 安装。不要把整个仓库复制到 Agent 的技能目录，也不要运行递归批量安装。`legacy/` 目录名不能阻止第三方安装器发现其中的 `SKILL.md`；本项目目前只提供逐个目录安装方式，未验证第三方安装器的扫描规则。

## 后续收录

[收录清单](docs/catalog.md) 区分当前维护、历史保留、公开候选和暂不公开内容。[新增指南](docs/adding-skills.md)说明新技能的结构。当前技能放根目录，专用脚本、参考资料和素材保留在对应技能内。

本仓沿用原 `zxdwhda/skills` 的 Git 历史和仓库身份。旧工作区的未提交修改未合并进公开版本。

## 许可

沿用原仓的 [MIT License](LICENSE)。引入内容分别保留原许可证，详见 [来源说明](THIRD_PARTY_NOTICES.md)。目录组织参考 yichen-skills，没有复制其技能实现。
