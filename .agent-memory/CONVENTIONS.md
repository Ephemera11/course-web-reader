---
updated: 2026-07-28
last_agent: hermes
---

# 编码规范与约定

## 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 文件名（章节） | kebab-case + 序号前缀 | `0001-what-is-an-agent.html` |
| 目录名 | kebab-case | `course-web-reader`, `lessons` |
| JS 函数/变量 | camelCase | `renderShelf`, `loadLessonAt` |
| CSS 类名 | kebab-case | `reader-bar`, `book-row` |
| JSON 键 | camelCase / snake 混用（沿用既定） | `courseId`, `file`, `cover` |

## 目录约定

- `courses/` — 所有课程数据
- `courses/manifest.json` — 课程 id 数组（唯一发现入口）
- `courses/<id>/index.json` — 单课程元信息
- `courses/<id>/lessons/` — 章节 HTML（每节 = 一章）
- `.agent-memory/` — 多 Agent 共享记忆（见其 README）

## 前端规范

- 无构建、无打包；直接写原生 HTML/CSS/JS
- 主题用 CSS 变量，外壳在 `:root` 与 `[data-theme="dark"]` 定义；章节 HTML 不得用 `:root` 覆盖外壳变量（注入时剥离）
- 章节内 `id` 注入时需加章节序号命名空间（如 `q1-0`），避免多章冲突
- 注入章节的 `<script>` 必须包进 IIFE，避免顶层变量全局冲突
- 所有 `fetch`、导航、状态 URL 一律用 `SITE_ROOT` 绝对路径（见 CONTEXT 架构决策）

## Git 规范

- Commit message 格式：`type(scope): description`
  - type: feat / fix / refactor / chore / docs
  - scope: shelf / reader / app / css / courses / agent-memory（可省略）
- 示例：`fix(app): clear shelf skeleton + back button absolute path`
- 每个 commit 应是可回滚的独立逻辑单元
- `.agent-memory/` 的改动单独提交：`chore(agent-memory): update task progress`

## 数据 / 存储约定

- 书签键：`cwr_bookmarks`，结构 `{ "<courseId>/<file>": true }`
- 主题键：`cwr_theme`，值 `light` / `dark` / `auto`
- 以上均存 `localStorage`，无后端、无跨设备同步

## 验证约定

- 沙箱浏览器连不上 `localhost`，最终验收由用户在 phpstudy 上点验
- 自动化验证：临时用 jsdom 在 Node 执行 `app.js`，断言书架/阅读器行为（点按钮、滚到底续读、无运行时报错）；脚本跑完即删，不入库
- 不写 permanent test suite；以 ad-hoc 验证 + 用户手动验收为准

## 环境变量

- 无（纯静态、无服务端配置）
- 本地静态托管需注意：章节经 `fetch` 加载，必须经 HTTP，**不能**用 `file://` 直接打开 `index.html`
