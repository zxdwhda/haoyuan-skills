# resource/

README 用到的截图存放目录。所有图片为 PNG,建议 1280px 宽以内,文件名见下表。

| 文件名 | 内容 | 截图位置 / 录制方式 |
|---|---|---|
| `install-success.png` | 用户跑完 `/plugin install` 后,Claude Code 显示安装成功的提示 | Claude Code 终端窗口,plugin install 完成后那条绿色成功消息 |
| `claude-skills-list.png` | Claude Code 中执行 `/skills`(或在对话里提到「百度网盘」时)能识别到 `baidu-drive-pro` | Claude Code 的 skill 列表面板 / 触发 skill 后的提示行 |
| `baidu-console.png` | 百度网盘开放平台「创建应用」的关键页面(选 xpansdk + 勾选 netdisk 权限那一步) | <https://pan.baidu.com/union/console/applist> 创建应用流程 |
| `login-flow.png` | `pan.cjs login` device code 流程的终端截图(显示 user_code + 浏览器超链接 + 等待中的状态) | 在终端跑 `node skill/assets/dist/pan.cjs login`,截设备码出现的那一帧 |
| `demo-chat.png` | Claude Code 对话中调用 skill 完成一次真实操作(例:「列一下我的百度网盘 /apps/xxx/」)的截图 | Claude Code 主对话窗口 |

> 仅占位文件 README,实际 PNG 由维护者手工补充。补图后无需删除本说明。
