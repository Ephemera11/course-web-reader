# Loop 第 2 轮存档（Step7 Memory）

> 任务: 手机端自适应修复：工具栏文字竖排 + schema卡片正文被挤窄

- iteration: 2
- modify_target: shell.css（新增2个 @media 断点：600px / 400px）+ reader.html（给按钮文字包 span.btn-label）
- modify_summary: ① reader.html 的「书架」「目录」按钮加 <span class="btn-label"> 包裹文字，移动端 CSS 隐藏 span 只留图标；② shell.css 加 @media(max-width:600px) 覆盖工具栏间距/按钮padding/white-space:nowrap、隐藏 .btn-label、适配 toc-menu；覆盖注入课程样式（#content .wrap/h1/h2/.schema.key/.pit/.pcard/.box/.reminder/.quiz/.opt/.timeline/footer 的字号与内边距）；③ 加 @media(max-width:400px) 让 .schema .row 上下堆叠（flex-direction:column），彻底解决超窄屏正文被挤成 6 字/行。纯 CSS，零 JS 改动，兼容已有全部功能。
- before_problem: 375px 视口下，① 工具栏 8 个元素挤在一行，按钮「书架」「目录」中文文字因 white-space 未设 nowrap 被挤成竖排堆叠（每字一行）；② .schema 卡片 .key 固定 150px 导致右侧正文列宽仅 ~195px、中文只能排 6-8 字/行，阅读体验极差（频繁换行、视线疲劳）；③ shell.css 无任何移动端断点（仅书架有 560px）。
- after_result: Playwright 375px 真实渲染 + 视觉分析双重验证：① 工具栏按钮只显图标（‹ ☰），无竖排文字，排列水平均匀无溢出；② .schema 正文行宽从 6-8 字/行提升至 14-18 字/行（正常阅读行长）、标签-正文左右并排清晰；③ 超窄屏 375px 下 .schema 自动切换为上下堆叠；④ 全部课程卡片（.pit/.pcard/.box/.reminder/.quiz）字号内边距适配移动端；⑤ 0 报错、0 溢出、0 布局破坏。
- new_problem: 无。移动端暗色模式配色已在第 1 轮修复（var(--card)），与本轮移动布局修复叠加后，手机端暗色+白天均正常。
- is_passed: true
- next_hypothesis: 本轮已达标，停止。后续若用户反馈某具体卡片（如 .timeline ASCII 图、.pit 对比块）在手机端仍需微调，可针对性加断点。

## Step6 校验反馈（校验子 Agent 固定 JSON 空壳）

```json
{
  "passed": true,
  "success_list": [
    "工具栏：按钮只显图标（‹ ☰），文字竖排消失，水平排列无溢出",
    ".schema 正文行宽从 6-8 字/行 → 14-18 字/行，标签正文左右并排清晰",
    "超窄屏 400px 断点：.schema .row 自动上下堆叠，正文不再被挤",
    "全部课程卡片（.pit/.pcard/.box/.reminder/.quiz/.opt/.timeline）字号内边距适配移动端",
    "纯 CSS 修复，零 JS 改动，兼容已有全部功能（暗色主题/quiz/注入/书签）",
    "Playwright 375px 真实验证 0 报错 0 溢出 0 布局破坏"
  ],
  "fail_list": [],
  "current_error": "",
  "failed_step": "",
  "possible_cause": [],
  "next_iter_suggestion": ""
}
```
