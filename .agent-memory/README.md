---
title: ".agent-memory 共享记忆系统"
description: "多 Agent 协作项目的共享记忆使用说明"
version: "1.0"
updated: 2026-07-28
---

# .agent-memory 共享记忆系统

## 这是什么

本项目使用 `.agent-memory/` 目录作为多个 AI Agent（WorkBuddy、Claude、Codex、Hermes 等）之间的**共享记忆系统**。你不是唯一为这个项目工作的 Agent——在你之前和之后，其他 Agent 也会参与。

## 启动时必读（按顺序）

每次被召唤到这个项目时，**在做任何工作之前**，请按顺序阅读：

1. **本文件（README.md）** — 了解记忆系统的运作方式
2. **[CONTEXT.md](./CONTEXT.md)** — 项目背景、技术栈、架构决策
3. **[CONVENTIONS.md](./CONVENTIONS.md)** — 编码规范、目录约定、Git 规范
4. **[tasks/active/](./tasks/active/)** 下所有文件 — 当前进行中的任务

> 简言之：**`ls .agent-memory/` → 读所有文件 → 找到你能接手的任务 → 开始工作**

## 完成工作后（非常重要！）

工作完成后，你**必须**更新对应的记忆文件，让下一个 Agent 能无缝接手：

| 你做了什么 | 更新哪个文件 |
|-----------|-------------|
| 做了重大架构决策 | 更新 `CONTEXT.md` |
| 新增或修改了编码规范 | 更新 `CONVENTIONS.md` |
| 推进或完成了某个任务 | 更新 `tasks/active/<task>.md` |
| 任务完全完成 | 将文件从 `tasks/active/` 移到 `tasks/archive/` |
| 开始了一个新任务 | 在 `tasks/active/` 创建新的 `.md` 文件 |

**更新后请执行：** `git add .agent-memory/ && git commit -m "chore(agent-memory): update task progress" && git push`

## 任务文件格式

每个 `tasks/active/<task-id>.md` 必须包含 YAML frontmatter：

```yaml
---
id: task-id（kebab-case）
status: pending | in_progress | blocked | completed
priority: high | medium | low
created: YYYY-MM-DD
last_agent: 你的名字（workbuddy / claude / codex / hermes / ...）
blocked_by: []  # 如果有前置依赖，列出 task-id
---
```

然后正文自由描述当前进度、已完成/待做事项、注意事项等。格式不必死板，但**清晰优于花哨**。

## 核心原则

1. **写给人看，也写给 Agent 看** — 简洁、结构化、不废话
2. **每次出手必有痕迹** — 不管多小的改动，都要更新记忆
3. **宁可多写一行，不少说一句** — 下一任 Agent 不知道你脑子里在想什么
4. **Git 是传输管道** — 记忆通过 Git push/pull 在 Agent 之间流动

## 快速启动 Prompt

如果你需要手动告诉一个 Agent 使用记忆系统，粘贴这段话即可：

> 你先读 `.agent-memory/` 下所有文件了解项目背景和当前进度，完成工作后更新对应的记忆文件并 git commit。
