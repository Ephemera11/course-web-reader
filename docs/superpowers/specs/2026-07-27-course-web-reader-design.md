# 课程网页阅读器 · 设计文档（Spec）

- **日期**：2026-07-27
- **状态**：已与用户逐节确认通过，待用户复核后进入实现计划
- **范围**：轻量级网页端「微信读书 / 起点小说式」课程阅读器，第一版
- **目标用户**：课程作者本人（在本机阅读、未来对外发布）

## 1. 目标与边界

### 要做的
- 把现有课程 HTML（每门课多节独立 HTML + 速查表）组织成一个可在线访问的网页端。
- 首页 = 课程书架，列出所有课程与每节课；点进某节课进入阅读器。
- 阅读器提供**连续阅读体验**（微信读书 / 起点小说式）：同一滚动容器内读完一节自动续接下一节。
- 提供**主题模式**：白天 / 夜间 / 自动（跟随系统 `prefers-color-scheme`）。
- 提供**书签功能**（第一版粒度 = 整节课）：收藏 / 取消，本地持久化。

### 不做的（YAGNI，明确排除第一版）
- 跨设备 / 账号体系 / 服务端存储的书签（第一版仅 `localStorage`，清缓存即清空）。
- 文内精确位置书签（微信读书式段落定位）——留待后续。
- 笔记、高亮、进度百分比、评论、搜索等富功能。
- 改动现有课程 HTML 源码（源文件零改动，仅被读取注入）。

## 2. 技术路线决策（已与用户确认）

采用 **方案 B：fetch + 注入「滚动容器」外壳**（非 iframe、非每页内嵌顶栏）。
理由：用户三次强调「连续感、自动加载下一节、小说式」——只有 fetch 注入同一滚动容器能实现真正无缝续读；课页源文件零改动；主题 / 书签 / 翻节集中在外壳统一维护，轻量且可扩展。

## 3. 目录结构（部署单元 = `course-web-reader/`）

```
course-web-reader/                 ← 部署单元；本地 phpstudy 站点根 / 线上子目录
├── index.html                     ← 首页：课程书架（自动汇总各课程 index.json）
├── reader.html                    ← 阅读器外壳（顶部常驻栏 + 滚动容器 #content）
├── app.js                         ← 外壳逻辑：发现课程、注入、续读、书签、URL 参数
├── reader.js                      ← （或并入 app.js）阅读器专属逻辑
├── shell.css                      ← 外壳样式 + 主题 CSS 变量（白天/夜间/自动）
├── docs/superpowers/specs/        ← 本设计文档
└── courses/
    └── agent-foundations/         ← 第 1 门课（一个文件夹 = 一门课）
        ├── index.json             ← 课清单：{id,title,lessons:[{n,file,title}]}
        ├── lessons/
        │   ├── 0001-what-is-an-agent.html
        │   ├── 0002-agent-loop-and-paradigms.html
        │   └── 0003-tool-calling.html
        └── reference/             ← 速查表（课页 ../reference/ 相对链接仍有效）
            ├── glossary.html
            └── paradigms.html
```

- 课程源文件从 `teach-agent-foundations/lessons/`、`reference/` 原样复制进来，**不修改**。
- 不在部署包内的：`teach-agent-foundations/` 的 MISSION.md / NOTES.md / learning-records / RESOURCES.md（属创作源，非线上内容）。

## 4. 内容发现机制（用户选项 A）

- 每门课一个文件夹 + 自带 `index.json`（含课程 id、title、lessons 有序数组）。
- 首页 `index.html` 启动时 `fetch courses/*/index.json`（当前仅 agent-foundations，未来多门课并发 fetch），汇总渲染书架卡片。
- **加新课 = 丢一个文件夹 + 自己的 `index.json`，不改任何代码。** 满足「可扩展但不过度设计」。

`index.json` 形态示例：
```json
{
  "id": "agent-foundations",
  "title": "Agent Foundations · 从零理解 Agent",
  "lessons": [
    {"n": "0001", "file": "lessons/0001-what-is-an-agent.html", "title": "Agent 到底是什么"},
    {"n": "0002", "file": "lessons/0002-agent-loop-and-paradigms.html", "title": "Agent 循环解剖 + 范式图谱"},
    {"n": "0003", "file": "lessons/0003-tool-calling.html", "title": "Tool Calling：模型与世界的接口"}
  ]
}
```

## 5. 首页书架与阅读流程

### 首页 `index.html`
- 启动 fetch 各课程 `index.json` → 渲染书架卡片（课程标题 + 课数 + 已书签 N/M）。
- 点击某节 → 跳转 `reader.html?course=agent-foundations&lesson=0001-what-is-an-agent.html`。

### 阅读流程（方案 B 连续感核心）
1. `reader.html` 解析 URL 参数 → 取该课 `index.json` 得到 lesson 顺序数组。
2. 顶部常驻栏：`☀ 白天 / 🌙 夜间 / 🔄 自动 主题` · `🔖 本节书签` · `‹ 上一节` · `本节标题` · `下一节 ›`。
3. `fetch` 当前节 HTML → 提取其 `<body>` 正文 → 注入 `#content` 滚动容器；同时设 `<base href="{course}/lessons/">` 使相对链接（`../reference/`、`0001-...html`、图片）正常解析。
4. 用户向下滚动，**接近容器底部时自动 `fetch` 下一节 append 到同一容器下方**（起点小说式无缝续读），顶部栏不动；用 `history.replaceState` 更新 URL 参数（不刷页）。
5. 书签图标实时反映当前节收藏态（读 localStorage）。
6. 续读自然进行至全部读完为止，无强制终止。

## 6. 主题模式（白天 / 夜间 / 自动）

- `shell.css` 用 CSS 变量定义两套调色板：`:root` 为白天默认；`[data-theme="dark"]` 覆盖为夜间。
- 手动切换白天 / 夜间；选「自动」时跟随系统 `prefers-color-scheme` 并监听 `matchMedia` 变化实时切换。
- 作用范围：顶部栏与注入正文均继承同一文档的 CSS 变量而随之变色。现有 3 课均使用同名变量（`--ink/--bg/--accent` 等），注入后自动继承外壳变量，无需改课页源码。个别写死颜色处可能留亮块（风险低，已知）。
- 选择记忆于 `localStorage(theme)`，下次访问沿用。

## 7. 书签功能（整节课粒度，localStorage）

- 存储结构：`localStorage` 一个 JSON 对象，键 = `课程id/课文件`，值 = 已收藏布尔：
  ```js
  { "agent-foundations/0001-what-is-an-agent.html": true,
    "agent-foundations/0003-tool-calling.html": true }
  ```
  可多课程共存、O(1) 查询。
- 交互：阅读器顶栏 `🔖` 切换当前节收藏态（已收藏高亮），即时写入 localStorage；首页书架显示「已收藏 N/M 节」。
- 书签仅标整节课，与课内小测无关、互不干扰。
- 边界：纯本地、无账号；清缓存即清空（第一版范围，跨设备留待后续）。

## 8. 错误处理与验证

### 错误与边界（纯静态，无后端）
- `index.json` 缺失 / 损坏：该课不进书架，其他课正常，控制台明确报错，不整页崩。
- 相对链接 / 图片：靠注入时 `<base href>` 解析，课页现有相对链接照常生效。
- 脚本重执：注入课页后其 `<script>` 不自动执行，外壳在注入后扫描容器重新实例化（让小测可点）——方案 B 已知成本，此处明确兜底。
- 主题变量遗漏：个别写死颜色处可能留亮块，风险低。

### 本地验证环境（用户确认用 phpstudy）
- 用 **phpstudy** 起 Apache 站点，根指向 `course-web-reader/`，浏览器访问 `http://localhost/...`。
- 与线上 `help.wuqiulei.top`（同 Apache / 宝塔）环境一致，验证结论可迁移；静态 `fetch` 无 CORS 限制。
- 仅用 Apache 提供静态文件，不需要 PHP。

### 验收（真实跑，非描述）
1. phpstudy 起 Apache，根指向 `course-web-reader/` → 浏览器开首页看到书架卡片。
2. 点进 0001 → 验证：三态主题切换生效；🔖 收藏后刷新仍在；向下滚到底自动续读 0002 → 0003。
3. （多课就绪时）验证「丢文件夹即上新课」发现机制。
4. 交付时实际起服务跑通，把可访问的本地地址 / 预览交给用户，而非只丢文件。

## 9. 线上部署（待本地验证通过后）
- 结构上已按可部署形态组织：传 `course-web-reader/` 到 `help.wuqiulei.top` 子目录（如 `/courses`），Apache 静态服务即可对外访问。
- 具体部署步骤留待本地验证通过后再定（不在第一版实现范围内）。

## 10. 实现阶段拆分（供 writing-plans 参考）
1. 搭建 `course-web-reader/` 骨架 + 复制课程 HTML + 编写各 `index.json`。
2. 实现 `shell.css` 主题变量 + 顶部栏布局。
3. 实现 `index.html` 书架（fetch + 汇总渲染）。
4. 实现 `reader.html` + `app.js`：参数解析、fetch 注入、`<base>`、续读、URL 更新。
5. 实现主题三态切换 + localStorage 记忆。
6. 实现书签（localStorage 读写 + 顶栏 / 首页计数）。
7. 脚本重执兜底（小测可点）。
8. phpstudy 起站真实验收。
