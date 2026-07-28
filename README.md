# Course Web Reader

一个轻量级、纯静态的网页课程阅读器，设计目标是像「微信读书 / 起点」那样连续翻阅学习资料：书架陈列课程，点开即像翻开一本书，逐章往下读，读到哪自动续上。

## 当前状态

可用版本。已实现书架、连续续读、主题三态、整节课书签，无后端、纯静态，可任意静态托管（本地 phpstudy、GitHub Pages、Nginx 等）。

## 功能特性

- **书架形态**：一门课 = 一本书，暗色书脊 + 悬停微抬，符合「像翻开一本书」的直觉
- **连续续读**：正文向下滚动接近底部时，自动注入下一章，一气呵成（起点式体验）
- **主题三态**：白天 ☀ / 夜间 🌙 / 自动 🔄（跟随系统）
- **整节课书签**：收藏当前章，书架显示「已读 N/总章数」，数据存 `localStorage`
- **目录导航**：阅读器内 ☰ 目录可跳任意章，支持上一章 / 下一章
- **零依赖**：无构建步骤、无框架、无后端，双击 `index.html`（或托管到任意静态服务器）即用

## 本地运行

最简单：用任意静态服务器托管本目录即可（因章节通过 `fetch` 加载，需经 HTTP，不能用 `file://` 直接打开）。

示例（phpstudy / Apache / Nginx 均可，根目录指向本仓库）：

```
http://localhost/course-web-reader/index.html
```

或临时起一个静态服务：

```bash
# Python
python -m http.server 8080
# 然后访问 http://localhost:8080/index.html
```

## 目录结构

```
course-web-reader/
├── index.html          # 书架首页
├── reader.html         # 阅读器外壳（顶栏 + 正文容器）
├── app.js              # 核心逻辑：书架渲染、注入、续读、主题、书签、目录
├── shell.css           # 书架 / 阅读器外壳样式（含主题变量）
├── courses/
│   ├── manifest.json   # 课程清单（数组，列出各课程 id）
│   └── <course-id>/
│       ├── index.json  # 课程元信息（标题、封面色、章节列表）
│       └── lessons/    # 各章节 HTML（每节 = 一章）
└── .agent-memory/      # 多 Agent 协作共享记忆（见其 README）
```

## 如何新增一门课

1. 在 `courses/` 下新建 `<course-id>/lessons/` 目录，放入各章节 HTML
2. 新建 `<course-id>/index.json`，格式：

```json
{
  "id": "my-course",
  "title": "课程标题",
  "kicker": "COURSE",
  "cover": "oxblood",
  "lessons": [
    { "n": "0001", "file": "0001-xxx.html", "title": "第1章标题" },
    { "n": "0002", "file": "0002-yyy.html", "title": "第2章标题" }
  ]
}
```

3. 把 `id` 加进 `courses/manifest.json` 数组
4. 刷新书架即可看到新书

`cover` 可选值：`oxblood` `indigo` `forest` `slate` `teal` `plum` `amber`

## 技术说明

- 章节 HTML 通过 `fetch` 拉取后，提取其 `<style>`（剥离 `:root` 主题变量，避免污染外壳暗色）与 `<body>` 正文注入阅读器
- 注入脚本统一包进 IIFE，避免多章同名顶层变量（如 quiz 的 `Q`）冲突
- 所有 `fetch` 与导航用 `SITE_ROOT` 绝对路径，规避阅读器内 `<base>` 标签对相对路径的改写（曾导致 404）

## 许可证

本项目仅供个人学习使用，未指定开源许可证。
