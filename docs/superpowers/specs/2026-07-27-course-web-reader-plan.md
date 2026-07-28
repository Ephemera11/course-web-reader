# 课程网页阅读器 · 实现计划（Implementation Plan）

> 配套设计文档：`docs/superpowers/specs/2026-07-27-course-web-reader-design.md`
> 部署单元：`C:\Users\WTY\Documents\course-web-reader/`
> 验证环境：phpstudy 起 Apache，根指向 `course-web-reader/`，浏览器访问 `http://localhost/`
> 注：原 brainstorming 流程终态本应调用 `writing-plans` 技能，但该技能本机未安装，故按同形态手写此计划。

## 阶段 0 · 搭建骨架 + 搬运课程（预计 10 min）
**目标**：部署目录成形，3 课 HTML 与速查表就位，写好课程清单。
**步骤**：
1. 在 `course-web-reader/` 下建 `index.html`、`reader.html`、`app.js`、`shell.css`、`courses/agent-foundations/lessons/`、`courses/agent-foundations/reference/`。
2. 把 `teach-agent-foundations/lessons/0001..0003-*.html` 复制到 `courses/agent-foundations/lessons/`；把 `reference/glossary.html`、`reference/paradigms.html` 复制到 `courses/agent-foundations/reference/`。**源文件零改动**。
3. 写 `courses/agent-foundations/index.json`（见 spec §4 形态）。
**验收**：目录树与 spec §3 一致；`index.json` 合法 JSON；课页相对链接 `../reference/glossary.html` 路径存在。

## 阶段 1 · shell.css 主题变量 + 顶部栏布局（预计 15 min）
**目标**：定义白天/夜间两套 CSS 变量，做出阅读器顶部常驻栏样式。
**步骤**：
1. `shell.css`：`:root` 白天调色板；`[data-theme="dark"]` 夜间覆盖；定义 `--bg/--ink/--accent/--soft/--line` 等（与课页同名变量对齐）。
2. 顶部栏 `.reader-bar` 布局：左 `主题三态`、中 `本节标题`、右 `🔖 + ‹ ›`。
3. `#content` 滚动容器基础样式（max-width、padding、滚动区）。
**验收**：`reader.html` 静态套用 shell.css 可见顶部栏 + 空白滚动区；手动切 `data-theme` 颜色随之变。

## 阶段 2 · 首页书架 index.html（预计 20 min）
**目标**：启动即 fetch 各课程 index.json，汇总渲染书架卡片。
**步骤**：
1. `index.html` + 少量内联样式（可复用 shell.css 变量）+ `app.js` 的 `loadShelf()`。
2. `fetch('courses/agent-foundations/index.json')` → 渲染卡片（课程标题、课数、已书签 N/M 从 localStorage 算）。
3. 卡片每节链接 → `reader.html?course=agent-foundations&lesson=<file>`。
4. 容错：某课 json 失败 → 控制台报错、跳过该课、不整页崩。
**验收**：浏览器开首页见 1 张书架卡、3 节链接；点链接跳到 reader 并带正确参数。

## 阶段 3 · 阅读器核心：参数解析 + fetch 注入 + 续读（预计 40 min，核心）
**目标**：方案 B 落地——读参、注入正文、滚到底自动续读下一节。
**步骤**：
1. `reader.html` 解析 URL `course` / `lesson`；fetch 该课 `index.json` 得有序数组。
2. `loadLesson(file)`：`fetch` HTML → 取 `<body>` 正文 → append 进 `#content`；设 `<base href="{course}/lessons/">`（让 `../reference/`、图片、节间链接解析）。
3. 滚动监听：容器滚动接近底部（如距底 < 400px）且仍有下一节 → `loadLesson(next)` append 到同容器；`history.replaceState` 更新 URL 参数（不刷页）。
4. 顶部栏 `‹ ›` 可手动跳节（仍走 loadLesson）。
**验收**：进 0001 → 向下滚自动接 0002 → 0003；顶部栏始终不动；URL 参数随当前节更新；相对链接可点开。

## 阶段 4 · 主题三态切换 + 记忆（预计 15 min）
**目标**：白天/夜间/自动三态，跟随系统，记忆选择。
**步骤**：
1. 顶部三态按钮（☀/🌙/🔄），当前态高亮。
2. 选白天/夜间 → `document.documentElement.dataset.theme` 设值 + 存 `localStorage('cwr_theme')`。
3. 选自动 → 清 data-theme，监听 `matchMedia('(prefers-color-scheme: dark)')` 实时切；记忆 `'auto'`。
4. 启动初始化：读 localStorage，auto 则按系统。
**验收**：三态切换全站（含注入正文）变色；刷新沿用选择；切系统主题自动跟随。

## 阶段 5 · 书签（整节课粒度，localStorage）（预计 20 min）
**目标**：顶栏 🔖 收藏/取消当前节，本地持久；首页计数。
**步骤**：
1. 存储键 `cwr_bookmarks` = JSON：`{"agent-foundations/0001-...html": true, ...}`。
2. 顶栏 🔖 点击 → 切当前节 key 状态、写 localStorage、按钮高亮态刷新。
3. `loadLesson` 后据 key 刷新 🔖 高亮。
4. 首页 `loadShelf` 统计每课已收藏数显示「已收藏 N/M」。
**验收**：收藏 0001 → 刷新后仍在、🔖 高亮；首页计数 +1；取消后清除。

## 阶段 6 · 脚本重执兜底（小测可点）（预计 15 min）
**目标**：注入课页后其内联 `<script>`（小测逻辑）能重新执行。
**步骤**：
1. `loadLesson` 注入后，扫描容器内 `<script>`，对每段重建 `<script>` 节点并替换（触发执行）；或 `eval` 其 textContent。
2. 校验 0001/0002/0003 的小测点选有即时反馈、互不锁死（回归第 1 课修过的分块 bug）。
**验收**：三课小测注入后均可独立点击、反馈正确。

## 阶段 7 · 真实验收（phpstudy + Apache）（预计 15 min）
**目标**：照 spec §8 实际起站跑通全部验收。
**步骤**：
1. phpstudy 起 Apache，站点根指向 `course-web-reader/`。
2. 浏览器开 `http://localhost/` → 书架可见。
3. 进 0001：验证三态主题、🔖 收藏刷新仍在、滚到底续读 0002→0003、小测可点、相对链接可达。
4. 自检 spec 风险项：是否有写死颜色亮块（如有，记一笔但第一版可容忍）。
**验收**：全部手动验收通过；把可访问本地地址交给用户确认。

## 风险与已知项
- 课页个别写死颜色可能在夜间模式留亮块（现有 3 课均用变量，风险低）。
- 续读为「全读完为止」，无末节强制终止（符合设计）。
- 线上部署（help.wuqiulei.top 子目录）不在本计划内，结构已预留。

## 提交节奏
- 每个阶段完成即在 `course-web-reader/` git 仓库提交一个阶段 commit。
- 阶段 7 通过后，询问用户是否进行线上部署。
