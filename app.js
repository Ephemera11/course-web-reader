/* app.js — 课程阅读器外壳核心逻辑 (v3)
 * 一门课 = 一本书；每节课 = 一章。书架每门课一本，点进阅读器用上下章/目录翻。
 * 关键：所有 fetch 用绝对 SITE_ROOT 路径，避开 <base> 对 fetch 的影响（曾导致 404）。
 */
(function () {
  "use strict";

  // 站点根：从 app.js 自身 URL 推导（对 index.html / reader.html 都正确，
  // 不受 URL 是否含文件名影响；也不受 reader 里 <base> 影响）。
  var SITE_ROOT = (function () {
    var src = (document.currentScript && document.currentScript.src) || "";
    if (src) return src.substring(0, src.lastIndexOf("/") + 1);
    return location.pathname.replace(/[^/]*$/, ""); // fallback: 当前路径的目录
  })();
  var COURSES_DIR = "courses";
  var MANIFEST = SITE_ROOT + COURSES_DIR + "/manifest.json";
  var BM_KEY = "cwr_bookmarks";   // {"<courseId>/<file>": true}
  var THEME_KEY = "cwr_theme";    // "light" | "dark" | "auto"

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function loadBookmarks() {
    try { return JSON.parse(localStorage.getItem(BM_KEY) || "{}"); }
    catch (e) { return {}; }
  }
  function saveBookmarks(obj) { localStorage.setItem(BM_KEY, JSON.stringify(obj)); }
  function bmKey(courseId, file) { return courseId + "/" + file; }

  /* ---------- 主题 ---------- */
  var mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  function applyTheme(mode) {
    if (mode === "auto") { document.documentElement.removeAttribute("data-theme"); syncAuto(); }
    else { document.documentElement.setAttribute("data-theme", mode); }
    markThemeButtons(mode);
  }
  function syncAuto() {
    if (localStorage.getItem(THEME_KEY) !== "auto") return;
    if (mq && mq.matches) document.documentElement.setAttribute("data-theme", "dark");
    else document.documentElement.removeAttribute("data-theme");
  }
  function markThemeButtons(mode) {
    $all(".reader-bar button[data-theme-set]").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-theme-set") === mode);
    });
  }
  function initTheme() {
    var saved = localStorage.getItem(THEME_KEY) || "auto";
    applyTheme(saved);
    if (mq && mq.addEventListener) mq.addEventListener("change", syncAuto);
  }

  /* ---------- 书架（首页，一门课一本书） ---------- */
  var COVER_COLORS = {
    oxblood:"#7c2d12", indigo:"#312e81", forest:"#14532d",
    slate:"#1e293b", teal:"#0f766e", plum:"#581c87", amber:"#92400e"
  };
  function renderShelf() {
    var row = $("#bookRow");
    var note = $("#shelfNote");
    if (!row) return;
    fetch(MANIFEST)
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (ids) {
        if (!ids.length) { row.innerHTML = '<div class="shelf-note">暂无课程。</div>'; return; }
        row.innerHTML = "";  // 清空骨架占位（否则会与真实书本并存）
        var bm = loadBookmarks();
        var pending = ids.length;
        ids.forEach(function (id) {
          fetch(SITE_ROOT + COURSES_DIR + "/" + id + "/index.json")
            .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
            .then(function (meta) {
              var color = COVER_COLORS[meta.cover] || COVER_COLORS.oxblood;
              var marked = meta.lessons.filter(function (l) { return bm[bmKey(id, l.file)]; }).length;
              var total = meta.lessons.length;
              var a = document.createElement("a");
              a.className = "book" + (marked > 0 ? " bm" : "");
              a.href = "reader.html?course=" + encodeURIComponent(id) +
                       "&lesson=" + encodeURIComponent(meta.lessons[0].file);
              a.style.setProperty("--bc", color);
              a.innerHTML =
                '<span class="bm-dot">🔖</span>' +
                '<span class="cover-kicker">' + (meta.kicker || "COURSE") + '</span>' +
                '<span class="cover-t">' + meta.title + '</span>' +
                '<span class="cover-meta">' + total + ' 章 · 已读 ' + marked + '/' + total + '</span>' +
                '<span class="spine-line"></span>';
              a.title = meta.title + "（" + total + " 章）";
              row.appendChild(a);
            })
            .catch(function (err) {
              console.error("课程加载失败:", id, err);
              var d = document.createElement("div");
              d.className = "shelf-note"; d.textContent = "课程「" + id + "」加载失败，见控制台。";
              row.appendChild(d);
            })
            .then(function () { if (--pending === 0) finishShelf(note, ids.length); });
        });
      })
      .catch(function (err) {
        console.error("清单加载失败:", err);
        row.innerHTML = '<div class="shelf-note">课程清单加载失败，请确认 courses/manifest.json 可访问。</div>';
      });
  }
  function finishShelf(note, n) {
    if (note) note.textContent = "共 " + n + " 门课程 · 点击书本开始阅读";
  }

  /* ---------- 阅读器 ---------- */
  var state = null;

  function parseParams() {
    var q = new URLSearchParams(location.search);
    return { course: q.get("course"), lesson: q.get("lesson") };
  }

  // 注入一节：提取 head 的 <style>（剥离 :root 主题变量）+ body 正文；id 命名空间化防冲突。
  function injectLesson(html, idx) {
    var doc = new DOMParser().parseFromString(html, "text/html");
    var section = document.createElement("section");
    section.className = "lesson-block";
    $all("style", doc).forEach(function (st) {
      var css = st.textContent.replace(/:root\s*\{[^}]*\}/g, "");
      var ns = document.createElement("style"); ns.textContent = css; section.appendChild(ns);
    });
    var body = doc.body;
    while (body.firstChild) section.appendChild(body.firstChild);
    var map = {};
    $all("[id]", section).forEach(function (el) { var old = el.id, neu = old + "-" + idx; map[old] = neu; el.id = neu; });
    // 章节脚本处理：
    // 1) id 映射（getElementById 字面量）
    // 2) getElementById 垫片：章节常动态拼接 id（如 getElementById("q4-block-"+qn)），
    //    注入后真实 id 带 -{idx} 后缀，垫片先查原 id、查不到补后缀，保证 quiz 命中。
    // 3) 整段包 IIFE：隔离每章顶层变量（如 quiz 的 const Q / correct），多章连续注入不冲突；
    //    章节内 b.onclick=()=>{Q.answer()} 闭包能捕获本 IIFE 的 Q，无需全局暴露。
    $all("script", section).forEach(function (s) {
      var t = s.textContent;
      Object.keys(map).forEach(function (old) {
        var neu = map[old];
        t = t.split("getElementById('" + old + "')").join("getElementById('" + neu + "')");
        t = t.split('getElementById("' + old + '")').join('getElementById("' + neu + '")');
      });
      var pad = "var __lgeb" + idx + "=function(id){return document.getElementById(id)||document.getElementById(id+\"-" + idx + "\");};";
      t = t.replace(/document\.getElementById\(/g, "__lgeb" + idx + "(");
      t = pad + t.replace(/(?<!\.)getElementById\(/g, "__lgeb" + idx + "(");
      s.textContent = "(function(){\n" + t + "\n})();"; // IIFE 隔离顶层变量
    });
    return section;
  }
  function reexecScripts(scope) {
    $all("script", scope).forEach(function (old) {
      var s = document.createElement("script");
      if (old.src) s.src = old.src; else s.textContent = old.textContent;
      old.parentNode.replaceChild(s, old);
    });
  }

  function loadLessonAt(idx, opts) {
    opts = opts || {};
    if (!state || idx < 0 || idx >= state.lessons.length) return;
    if (state.loading) return;
    state.loading = true;
    state.idx = idx;
    var lesson = state.lessons[idx];
    var content = $("#content");
    if (!opts.append) content.innerHTML = "";
    content.classList.add("loading");
    // 章节文件用绝对站点根路径，避开 <base>
    fetch(SITE_ROOT + COURSES_DIR + "/" + state.courseId + "/lessons/" + lesson.file)
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (html) {
        var section = injectLesson(html, idx);
        content.appendChild(section);
        reexecScripts(section);
        content.classList.remove("loading");
        state.loading = false;
        updateBar(lesson);
        history.replaceState(null, "",
          SITE_ROOT + "reader.html?course=" + encodeURIComponent(state.courseId) +
          "&lesson=" + encodeURIComponent(lesson.file));
        if (opts.append) maybeLoadNext();
      })
      .catch(function (err) {
        content.classList.remove("loading");
        state.loading = false;
        var p = document.createElement("p");
        p.style.color = "var(--sub)";
        p.textContent = "本节加载失败：" + lesson.file + " (" + err.message + ")";
        content.appendChild(p);
      });
  }

  function isNearBottom() {
    var doc = document.documentElement;
    var scrollTop = window.scrollY || doc.scrollTop || 0;
    var viewport = window.innerHeight || doc.clientHeight || 0;
    var full = doc.scrollHeight || document.body.scrollHeight || 0;
    return (scrollTop + viewport) >= (full - 600);
  }
  function maybeLoadNext() {
    if (!state || state.idx + 1 >= state.lessons.length) return;
    if (state.loading) return;
    if (isNearBottom()) loadLessonAt(state.idx + 1, { append: true });
  }

  function updateBar(lesson) {
    var t = $("#barTitle");
    if (t) t.textContent = state.meta.title + " · 第 " + (state.idx + 1) + " 章";
    var bm = loadBookmarks();
    var on = !!bm[bmKey(state.courseId, lesson.file)];
    var btn = $("#bmBtn");
    if (btn) btn.classList.toggle("on", on);
    var prev = $("#prevBtn"), next = $("#nextBtn");
    if (prev) prev.disabled = state.idx <= 0;
    if (next) next.disabled = state.idx + 1 >= state.lessons.length;
    renderToc();
  }

  function renderToc() {
    var menu = $("#tocMenu");
    if (!menu || !state) return;
    var html = '<div class="toc-h">目录 · ' + state.meta.title + '</div>';
    state.lessons.forEach(function (l, i) {
      html += '<button data-i="' + i + '" class="' + (i === state.idx ? "cur" : "") + '">' +
              (i + 1) + '. ' + l.title + '</button>';
    });
    menu.innerHTML = html;
    $all("button", menu).forEach(function (b) {
      b.addEventListener("click", function () {
        menu.classList.remove("open");
        loadLessonAt(parseInt(b.getAttribute("data-i"), 10), {});
      });
    });
  }

  function initReader() {
    var p = parseParams();
    if (!p.course || !p.lesson) { $("#content").textContent = "缺少 course / lesson 参数。"; return; }
    state = { courseId: p.course, lessons: [], idx: 0, meta: null, loading: false };
    // base 仅用于让注入课页里的相对链接(../reference/)正确解析，不影响 fetch(用绝对根)
    var base = document.createElement("base");
    base.href = SITE_ROOT + COURSES_DIR + "/" + p.course + "/lessons/";
    document.head.appendChild(base);

    fetch(SITE_ROOT + COURSES_DIR + "/" + p.course + "/index.json")
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (meta) {
        state.meta = meta;
        state.lessons = meta.lessons;
        var idx = meta.lessons.findIndex(function (l) { return l.file === p.lesson; });
        if (idx < 0) idx = 0;
        loadLessonAt(idx, {});
      })
      .catch(function (err) {
        $("#content").textContent = "课程清单加载失败：" + p.course + " (" + err.message + ")";
      });

    $("#backBtn").addEventListener("click", function () { location.href = SITE_ROOT + "index.html"; });
    $("#tocBtn").addEventListener("click", function (e) { e.stopPropagation(); $("#tocMenu").classList.toggle("open"); });
    document.addEventListener("click", function () { $("#tocMenu").classList.remove("open"); });
    $("#prevBtn").addEventListener("click", function () { if (state.idx > 0) loadLessonAt(state.idx - 1, {}); });
    $("#nextBtn").addEventListener("click", function () { if (state.idx + 1 < state.lessons.length) loadLessonAt(state.idx + 1, {}); });
    $("#bmBtn").addEventListener("click", function () {
      var lesson = state.lessons[state.idx];
      var bm = loadBookmarks();
      var key = bmKey(state.courseId, lesson.file);
      if (bm[key]) delete bm[key]; else bm[key] = true;
      saveBookmarks(bm);
      $("#bmBtn").classList.toggle("on", !!bm[key]);
    });
    window.addEventListener("scroll", function () { maybeLoadNext(); });
    $all(".reader-bar button[data-theme-set]").forEach(function (b) {
      b.addEventListener("click", function () {
        var mode = b.getAttribute("data-theme-set");
        localStorage.setItem(THEME_KEY, mode);
        applyTheme(mode);
      });
    });
  }

  /* ---------- 启动 ---------- */
  function boot() {
    initTheme();
    if ($("#bookRow")) renderShelf();
    else if ($("#content")) initReader();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
