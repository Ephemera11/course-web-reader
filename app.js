/* app.js — 课程阅读器外壳核心逻辑
 * 职责：① 首页书架发现（fetch courses/manifest.json -> 各 courses/<id>/index.json）
 *       ② 阅读器：参数解析 / fetch 注入 / 滚到底自动续读 / 主题三态 / 书签 / 脚本重执
 * 纯静态，无后端；书签存 localStorage。
 */
(function () {
  "use strict";

  var COURSES_DIR = "courses";
  var MANIFEST = COURSES_DIR + "/manifest.json";
  var BM_KEY = "cwr_bookmarks";   // {"<courseId>/<file>": true}
  var THEME_KEY = "cwr_theme";    // "light" | "dark" | "auto"

  /* ---------- 工具 ---------- */
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
    if (mode === "auto") {
      document.documentElement.removeAttribute("data-theme");
      syncAuto();
    } else {
      document.documentElement.setAttribute("data-theme", mode);
    }
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

  /* ---------- 书架（首页） ---------- */
  function renderShelf() {
    var root = $("#shelfRoot");
    if (!root) return; // 不是首页
    root.textContent = "加载课程中…";
    fetch(MANIFEST)
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (ids) {
        if (!ids.length) { root.textContent = "暂无课程。"; return; }
        var bm = loadBookmarks();
        var pending = ids.length;
        ids.forEach(function (id) {
          fetch(COURSES_DIR + "/" + id + "/index.json")
            .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
            .then(function (meta) {
              var count = meta.lessons.length;
              var marked = meta.lessons.filter(function (l) {
                return bm[bmKey(id, l.file)];
              }).length;
              var lis = meta.lessons.map(function (l) {
                var on = bm[bmKey(id, l.file)] ? " bm" : "";
                return '<li><a class="' + on.trim() + '" href="reader.html?course=' +
                  encodeURIComponent(id) + "&lesson=" + encodeURIComponent(l.file) + '">' +
                  '<span>' + l.n + ' · ' + l.title + '</span>' +
                  '<span class="lk">🔖</span></a></li>';
              }).join("");
              var card = document.createElement("div");
              card.className = "card";
              card.innerHTML =
                '<h2>' + meta.title + '</h2>' +
                '<div class="meta">共 ' + count + ' 节 · 已收藏 ' + marked + '/' + count + '</div>' +
                '<ul class="llist">' + lis + '</ul>';
              root.appendChild(card);
            })
            .catch(function (err) {
              console.error("课程加载失败:", id, err);
              var card = document.createElement("div");
              card.className = "card";
              card.innerHTML = '<h2>' + id + '</h2><div class="meta">加载失败，见控制台</div>';
              root.appendChild(card);
            })
            .then(function () { if (--pending === 0) {/* done */} });
        });
      })
      .catch(function (err) {
        console.error("清单加载失败:", err);
        root.textContent = "课程清单加载失败，见控制台。";
      });
  }

  /* ---------- 阅读器 ---------- */
  var state = null; // {courseId, lessons, idx, meta, loading, baseHref}

  function parseParams() {
    var q = new URLSearchParams(location.search);
    return { course: q.get("course"), lesson: q.get("lesson") };
  }

  // 注入一节：提取 head 的 <style>（剥离 :root 主题变量，避免覆盖外壳暗色）
  // + body 正文；对 id 做命名空间化，避免多节同 id 冲突（如 quiz）。
  function injectLesson(html, idx) {
    var doc = new DOMParser().parseFromString(html, "text/html");
    var section = document.createElement("section");
    section.className = "lesson-block";

    // 样式：复制 <style>，移除 :root{...} 块，让外壳主题变量生效
    $all("style", doc).forEach(function (st) {
      var css = st.textContent.replace(/:root\s*\{[^}]*\}/g, "");
      var ns = document.createElement("style");
      ns.textContent = css;
      section.appendChild(ns);
    });

    // 正文
    var body = doc.body;
    while (body.firstChild) section.appendChild(body.firstChild);

    // 命名空间化 id，防冲突
    var map = {};
    $all("[id]", section).forEach(function (el) {
      var old = el.id, neu = old + "-" + idx;
      map[old] = neu; el.id = neu;
    });
    $all("script", section).forEach(function (s) {
      var t = s.textContent;
      Object.keys(map).forEach(function (old) {
        var neu = map[old];
        t = t.split("getElementById('" + old + "')").join("getElementById('" + neu + "')");
        t = t.split('getElementById("' + old + '")').join('getElementById("' + neu + '")');
      });
      s.textContent = t;
    });

    return section;
  }

  // 注入课页后，内联 <script> 不自动执行 —— 重建节点触发执行
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

    fetch(state.baseHref + lesson.file)
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (html) {
        var section = injectLesson(html, idx);
        content.appendChild(section);
        reexecScripts(section);
        content.classList.remove("loading");
        state.loading = false;
        updateBar(lesson);
        history.replaceState(null, "",
          "reader.html?course=" + encodeURIComponent(state.courseId) +
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

  function maybeLoadNext() {
    if (!state || state.idx + 1 >= state.lessons.length) return;
    if (state.loading) return;
    var content = $("#content");
    var nearBottom = (content.scrollTop + content.clientHeight) >=
                     (content.scrollHeight - 600);
    if (nearBottom) loadLessonAt(state.idx + 1, { append: true });
  }

  function updateBar(lesson) {
    var t = $("#barTitle");
    if (t) t.textContent = state.meta.title + " · " + lesson.n;
    var bm = loadBookmarks();
    var on = !!bm[bmKey(state.courseId, lesson.file)];
    var btn = $("#bmBtn");
    if (btn) btn.classList.toggle("on", on);
    var prev = $("#prevBtn"), next = $("#nextBtn");
    if (prev) prev.disabled = state.idx <= 0;
    if (next) next.disabled = state.idx + 1 >= state.lessons.length;
  }

  function initReader() {
    var p = parseParams();
    if (!p.course || !p.lesson) {
      $("#content").textContent = "缺少 course / lesson 参数。";
      return;
    }
    state = { courseId: p.course, lessons: [], idx: 0, meta: null, loading: false,
              baseHref: COURSES_DIR + "/" + p.course + "/lessons/" };
    // 单一 base，置于 head，让课页相对链接解析
    var base = document.createElement("base");
    base.href = state.baseHref;
    document.head.appendChild(base);

    fetch(COURSES_DIR + "/" + p.course + "/index.json")
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

    $("#prevBtn").addEventListener("click", function () {
      if (state.idx > 0) loadLessonAt(state.idx - 1, {});
    });
    $("#nextBtn").addEventListener("click", function () {
      if (state.idx + 1 < state.lessons.length) loadLessonAt(state.idx + 1, {});
    });
    $("#bmBtn").addEventListener("click", function () {
      var lesson = state.lessons[state.idx];
      var bm = loadBookmarks();
      var key = bmKey(state.courseId, lesson.file);
      if (bm[key]) delete bm[key]; else bm[key] = true;
      saveBookmarks(bm);
      $("#bmBtn").classList.toggle("on", !!bm[key]);
    });
    $("#content").addEventListener("scroll", function () { maybeLoadNext(); });
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
    if ($("#shelfRoot")) renderShelf();
    else if ($("#content")) initReader();
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
