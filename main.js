(function () {
  "use strict";

  /* ----- Old saved copies -----
     The site itself stores nothing, but an earlier build may have left a copy
     of the old data in browser storage. Remove any site-owned keys so a stale
     copy can never be read back. Storage may be blocked (file://, private mode),
     in which case there is nothing to clear. */
  (function clearOldStorage() {
    var PREFIX = /^(among-?the-?stars|ats)[:._-]/i;
    ["localStorage", "sessionStorage"].forEach(function (name) {
      try {
        var store = window[name];
        if (!store) return;
        var doomed = [];
        for (var i = 0; i < store.length; i++) {
          var key = store.key(i);
          if (key && PREFIX.test(key)) doomed.push(key);
        }
        doomed.forEach(function (key) { store.removeItem(key); });
      } catch (e) { /* storage unavailable — nothing to clear */ }
    });
  })();

  /* ----- Fixed header state ----- */
  var header = document.querySelector(".site-header");
  function onScroll() {
    if (header) header.classList.toggle("scrolled", window.scrollY > 8);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ----- Mobile navigation ----- */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    function setNav(open) {
      nav.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    }
    toggle.addEventListener("click", function () {
      setNav(!nav.classList.contains("open"));
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setNav(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("open")) {
        setNav(false);
        toggle.focus();
      }
    });
  }

  /* ----- Hidden developer report (#todo-report) -----
     Not linked from any menu. Opening the hash shows, per artifact, every field
     still TODO or missing and whether verified is true/false. Read-only: it
     never writes to the data. Runs before the canvas guard so it works on every
     page, including ones without a starfield context. */
  (function todoReport() {
    var D = window.ArtifactData;
    if (!D) return;

    var REQUIRED = ["id", "name", "destination", "mission", "type", "location",
      "lat", "lon", "coord_source", "sites", "status", "status_detail", "status_source",
      "landing", "story", "how_it_worked", "discoveries", "timeline", "status_text",
      "quick_facts", "instruments", "key_numbers", "did_you_know", "mission_context",
      "related", "image_file", "image_credit", "image_source_url", "image_alt", "sources",
      "phase", "verified"];

    var overlay = null, body = null, closeBtn = null, loaded = false;

    function esc(s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
      });
    }
    function classify(v) {
      if (typeof v === "string") {
        if (D.isTodo(v)) return "TODO";
        if (v.trim() === "") return "empty";
        return null;
      }
      if (v === null || v === undefined) return "missing";
      if (Array.isArray(v) && v.length === 0) return "empty";
      return null;
    }
    function issuesFor(a) {
      var out = [], seen = {};
      function add(path, kind) {
        if (seen[path]) return;
        seen[path] = true;
        out.push({ path: path, kind: kind });
      }
      var expected = REQUIRED;
      expected.forEach(function (k) { if (!(k in a)) add(k, "missing"); });
      (function walk(v, path) {
        if (Array.isArray(v)) {
          if (v.length === 0) { add(path, "empty"); return; }
          v.forEach(function (x, i) { walk(x, path + "[" + i + "]"); });
          return;
        }
        if (v && typeof v === "object") {
          Object.keys(v).forEach(function (k) { walk(v[k], path ? path + "." + k : k); });
          return;
        }
        var kind = classify(v);
        if (kind) add(path, kind);
      })(a, "");
      // null lat/lon on a Beyond craft is intentional (no surface dot), and its
      // empty sites list is intentional too: deep-space craft have no surface site.
      return out.filter(function (it) {
        if (a.destination === "Beyond" && (it.path === "lat" || it.path === "lon") && it.kind === "missing") return false;
        if (a.destination === "Beyond" && it.path === "sites" && it.kind === "empty") return false;
        return true;
      });
    }
    function artifactHtml(a) {
      var issues = issuesFor(a);
      var verified = a.verified === true;
      var dest = a.destination === "Beyond" ? "Deep space" : a.destination;
      var rows = issues.length
        ? '<ul class="todo-fields">' + issues.map(function (it) {
            return '<li><code>' + esc(it.path) + '</code><span class="todo-tag ' + it.kind + '">' +
              (it.kind === "TODO" ? "TODO" : it.kind === "empty" ? "empty" : "missing") + "</span></li>";
          }).join("") + "</ul>"
        : '<p class="todo-clean">All fields filled.</p>';
      return '<article class="todo-artifact">' +
        '<h3>' + esc(a.name || a.id || "(unnamed)") +
          '<span class="todo-dest">' + esc(dest) + "</span>" +
          '<span class="todo-dest">phase ' + esc(String(a.phase)) + "</span>" +
          '<span class="todo-verified ' + (verified ? "yes" : "no") + '">verified: ' + verified + "</span>" +
        "</h3>" + rows + "</article>";
    }
    function render(artifacts) {
      loaded = true;
      var todoTotal = 0, missingTotal = 0;
      artifacts.forEach(function (a) {
        issuesFor(a).forEach(function (it) {
          if (it.kind === "TODO") todoTotal++; else missingTotal++;
        });
      });
      body.innerHTML =
        '<p class="todo-summary">' + artifacts.length + " artifacts · " +
          todoTotal + " TODO field(s) · " + missingTotal + " empty/missing field(s).</p>" +
        (artifacts.length ? artifacts.map(artifactHtml).join("")
          : '<p class="todo-clean">No artifacts in the collection.</p>');
    }
    function loadReport() {
      body.innerHTML = '<p class="todo-loading">Reading data/artifacts.json…</p>';
      /* Developer view: read every record, including phases hidden from the site. */
      D.loadAll().then(render).catch(function (err) {
        loaded = false;
        body.innerHTML = D.errorBlock((err && err.message) || "Data could not be loaded.");
        var r = body.querySelector(".data-retry");
        if (r) r.addEventListener("click", loadReport);
      });
    }
    function ensure() {
      if (overlay) return;
      overlay = document.createElement("div");
      overlay.id = "todo-report";
      overlay.className = "todo-report";
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");
      overlay.setAttribute("aria-labelledby", "todo-report-title");
      overlay.hidden = true;
      overlay.innerHTML =
        '<div class="todo-report-panel">' +
          '<header class="todo-report-head">' +
            '<div><h2 id="todo-report-title">Data TODO report</h2>' +
            '<p class="todo-report-sub">Developer view — fields still TODO or missing in data/artifacts.json. Not linked from the site menu.</p></div>' +
            '<button type="button" class="todo-report-close" aria-label="Close report">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
            "</button>" +
          "</header>" +
          '<div class="todo-report-body"></div>' +
        "</div>";
      document.body.appendChild(overlay);
      body = overlay.querySelector(".todo-report-body");
      closeBtn = overlay.querySelector(".todo-report-close");
      closeBtn.addEventListener("click", close);
      overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && overlay && !overlay.hidden) { e.preventDefault(); close(); }
      });
    }
    function open() {
      ensure();
      overlay.hidden = false;
      document.body.classList.add("todo-report-open");
      if (!loaded) loadReport();
      closeBtn.focus();
    }
    function hide() {
      if (!overlay) return;
      overlay.hidden = true;
      document.body.classList.remove("todo-report-open");
    }
    function close() {
      hide();
      if (location.hash === "#todo-report") {
        try { history.replaceState(null, "", location.pathname + location.search); }
        catch (e) { location.hash = ""; }
      }
    }
    function sync() {
      if (location.hash === "#todo-report") open();
      else hide();
    }
    window.addEventListener("hashchange", sync);
    sync();
  })();

  /* ----- One fixed sky layer for the whole site -----
     #space-bg (base gradient + faint blue nebula glows, painted in CSS) holds a
     single static star canvas. Built once here so every page shares the exact
     same sky; html/body and all wrappers are transparent so it shows through.
     Stars are drawn once — no animation loop — and only redrawn on resize, so
     the background never costs frame rate on the globe page. */
  var spaceBg = document.getElementById("space-bg");
  if (!spaceBg) {
    spaceBg = document.createElement("div");
    spaceBg.id = "space-bg";
    spaceBg.setAttribute("aria-hidden", "true");
    document.body.insertBefore(spaceBg, document.body.firstChild);
  }
  var canvas = document.getElementById("starfield");
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.id = "starfield";
    canvas.setAttribute("aria-hidden", "true");
  }
  if (canvas.parentNode !== spaceBg) spaceBg.appendChild(canvas);
  if (!canvas.getContext) return;

  var ctx = canvas.getContext("2d");
  var STAR_COLORS = ["#FFFFFF", "#FFFFFF", "#CFE3FF", "#9EC5FF"];

  function buildStars() {
    var w = canvas.clientWidth || window.innerWidth;
    var h = canvas.clientHeight || window.innerHeight;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    var count = w < 760 ? 200 : 460;
    for (var i = 0; i < count; i++) {
      var x = Math.random() * w;
      var y = Math.random() * h;
      var bright = Math.random() < 0.05;              // a few larger stars
      var r = bright ? 1.4 + Math.random() * 0.4       // up to 1.8px
                     : 0.5 + Math.random() * 0.9;      // 0.5–1.4px
      var alpha = 0.2 + Math.random() * 0.7;           // 0.2–0.9
      ctx.globalAlpha = alpha;
      ctx.fillStyle = STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)];
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  var resizeTimer = null;
  window.addEventListener("resize", function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(buildStars, 150);
  });

  buildStars();
})();