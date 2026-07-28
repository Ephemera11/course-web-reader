---
id: course-reader-baseline
status: completed
priority: high
created: 2026-07-28
last_agent: hermes
---

# 课程阅读器基础版（已落地）

## 已完成

- 书架首页：一门课一本书，暗色书脊 + 悬停微抬
- 阅读器：顶栏（返回 / 目录 / 主题三态 / 书签 / 上下章）+ 正文容器
- 连续续读：滚到底自动注入下一章
- 主题三态：白天 / 夜间 / 自动
- 整节课书签：`localStorage`，书架显示「已读 N/总章数」
- 目录导航：☰ 目录跳章 + 上一章 / 下一章
- 修复历史坑：`<base>` 导致 fetch 404、`SITE_ROOT` 推导、`const Q` 多章冲突、书架骨架未清、返回键 404

## 验收

- 经 jsdom 自动化验证（7/7 通过，0 运行时错误）：骨架清除、单本书、返回键绝对路径、无报错
- 最终视觉验收由用户在本地 phpstudy 点验

## 待办 / 可扩展

- [ ] 可选：部署到 `help.wuqiulei.top` 子目录
- [ ] 跨设备书签同步（目前仅 `localStorage`）
- [ ] 章节内 quiz 答题状态持久化
