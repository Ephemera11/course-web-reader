---
updated: 2026-07-28
last_agent: hermes
---

# 项目背景

Course Web Reader 是一个轻量级、纯静态的网页课程阅读器，目标是像「微信读书 / 起点」那样连续翻阅学习资料：书架陈列课程，点开即像翻开一本书，逐章往下读，读到哪自动续上。当前承载的课程是「Agent Foundations」系列教学（由 teach 技能产出的 3 节 HTML 课）。

## 核心能力（已落地）

- 书架形态：一门课 = 一本书，暗色书脊 + 悬停微抬
- 连续续读：滚动接近底部自动注入下一章（起点式体验）
- 主题三态：白天 ☀ / 夜间 🌙 / 自动 🔄（跟随系统）
- 整节课书签：收藏当前章，`localStorage` 存储，书架显示「已读 N/总章数」
- 目录导航：阅读器内 ☰ 目录跳章 + 上一章 / 下一章
- 零依赖：无构建、无框架、无后端，任意静态托管即用

## 技术栈

| 层次 | 技术 | 备注 |
|------|------|------|
| 外壳结构 | 纯 HTML + CSS | `index.html` 书架、`reader.html` 阅读器 |
| 核心逻辑 | 原生 JavaScript（IIFE，无框架） | `app.js` |
| 样式 | 原生 CSS + CSS 变量（主题三态） | `shell.css` |
| 内容源 | 各章节独立 HTML 文件 | `courses/<id>/lessons/*.html` |
| 元信息 | JSON 清单 | `courses/manifest.json` + 各 `index.json` |
| 存储 | `localStorage` | 书签、主题偏好 |
| 托管 | 任意静态服务器 | 本地 phpstudy / Apache / Nginx / GitHub Pages |

## 项目结构

```
course-web-reader/
├── index.html          # 书架首页
├── reader.html         # 阅读器外壳（顶栏 + 正文容器）
├── app.js              # 核心逻辑
├── shell.css           # 外壳样式（含主题变量）
├── courses/
│   ├── manifest.json   # 课程清单（id 数组）
│   └── <course-id>/
│       ├── index.json  # 课程元信息
│       └── lessons/    # 各章节 HTML
└── .agent-memory/      # 多 Agent 共享记忆
```

## 关键架构决策

### 为什么纯静态、无框架？
项目面向「本地双击 / 任意静态托管即可用」的轻量场景，无构建步骤降低维护与分发成本，也便于把单门课整体拷贝走。

### 为什么用 fetch 注入章节而非 iframe？
iframe 会割裂滚动与主题，无法做「连续续读 + 统一主题」。改为 `fetch` 拉取章节 HTML，剥离其 `:root` 主题变量后注入同一文档，实现真正的连续滚动与主题继承。

### 为什么所有 fetch / 导航用 SITE_ROOT 绝对路径？
阅读器 `reader.html` 会设 `<base href=".../lessons/">` 让注入章节内的相对链接（如 `../reference/`）正确解析；但若 `fetch` / `history.replaceState` / 返回键也用相对路径，会被 `<base>` 改写而 404。因此一律用从 `document.currentScript.src` 推导的 `SITE_ROOT` 绝对路径。

### 为什么注入的章节脚本要包 IIFE？
多章连续注入时，各章顶层 `const`/`let`（如 quiz 的 `Q`）会在全局作用域冲突报 `Identifier already declared`。统一用 `(function(){ ... })();` 包裹隔离作用域。

## 开发 / 验证环境

- 本地静态服务器：phpstudy 集成 Apache，根 `D:\phpstudy_pro\WWW`，访问 `http://localhost/course-web-reader/index.html`
- 注意：Hermes 沙箱浏览器连不上 `localhost`，最终视觉验收由用户在 phpstudy 上点验；自动化验证用 jsdom 在 Node 中执行 `app.js` 并断言行为（临时脚本，跑完即删，不入库）
- Git 远程：私有仓库 `git@github.com:Ephemera11/course-web-reader.git`（HTTPS 也配了代理 `127.0.0.1:17890`）

## 已知坑（防回归）

- `SITE_ROOT` 必须基于 `document.currentScript.src`，不能基于 `location.pathname`（在 `index.html` 下会变成 `/index.html/` 导致清单 404）
- 书架 `renderShelf` 必须清空 `#bookRow` 里的骨架占位，否则会与真实书本并存显示「空书」
- 注入章节的 `:root` 必须剥离，否则覆盖外壳暗色变量
- 章节内 `id` 必须加章节序号命名空间，否则多章同名 `id` 冲突
