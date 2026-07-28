# Loop 第 1 轮存档（Step7 Memory）

> 任务: 修复课程内部 HTML 不匹配夜间模式（白卡）

- iteration: 1
- modify_target: courses/agent-foundations/lessons/0004-workflow-patterns.html（此前 0001-0003 已改、0004 漏改）
- modify_summary: 将 0004 的 <style> 全部硬编码浅色表面（#fff/#fffdf4/#fffaf4/#2c2c2c/#222/#e6c9b8）改为外壳主题变量（var(--card)/var(--card2)/var(--ink)/var(--line)）；删除与外壳重复的 :root 块；删除无效且无用的 `var quiz4=document.getElementById('quiz4')`（HTML 无此 id）。同时新增 .htaccess 对 html/css/js/json 发 no-store，根除浏览器缓存导致的"改了还白卡"误判。
- before_problem: 滚动加载到第4章时，小测/卡片（.quiz/.opt/.schema/.pit/.pcard/.timeline/.box.q/.reminder）背景为纯白 rgb(255,255,255)，在暗色页面里形成刺眼白卡；0001-0003 已正确但 0004 仍是原始硬编码浅色版，漏改。用户最初误以为"缓存/其余可以只有小测不好"，实为第4章漏改。
- after_result: Playwright 真实 Chromium 渲染（no-store 生效）+ 视觉分析双重验证：4 章全部 section.lesson-block=4 无重复注入；每章 .quiz 与 .opt 背景均 = rgb(33,28,22) 深棕；全页无白卡、暗色协调；quiz 点击反馈正常；0 报错 0 404。
- new_problem: 无。唯一残留 #fff 在 @media print 的打印背景（屏幕无影响，正确保留）。
- is_passed: true
- next_hypothesis: 已达标，无需下一轮。后续新增课程章节时，必须统一用 var(--card) 变量而非硬编码 #fff（可用 grep '#fff|#2c2c2c' 预检）。

## Step6 校验反馈（校验子 Agent 固定 JSON 空壳）

```json
{
  "passed": true,
  "success_list": [
    "0004 全部硬编码浅色表面改为外壳主题变量 var(--card)/var(--card2)/var(--ink)/var(--line)",
    "0004 :root 块删除，课程完全继承外壳三态变量",
    "Playwright 真实渲染：4 章 .quiz/.opt 背景均 rgb(33,28,22) 深棕，无白卡",
    "滚动加载 4 章无重复注入（section.lesson-block=4），quiz 点击反馈正常",
    ".htaccess no-store 生效（Cache-Control: no-store），根除缓存误判"
  ],
  "fail_list": [],
  "current_error": "",
  "failed_step": "",
  "possible_cause": [],
  "next_iter_suggestion": ""
}
```
