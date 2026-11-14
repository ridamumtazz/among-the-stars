/* Among the Stars — Home page.
   The museum landing page. Every number, name, status and source link on this
   page is built at runtime from data/artifacts.json, data/statuses.json and
   data/quiz.json. Nothing here hardcodes a count, a date or a fact, and TODO
   values are never printed. Only the published records returned by
   ArtifactData.load() are used, so phases the team has not enabled stay hidden. */
(function () {
  "use strict";

  var D = window.ArtifactData;
  var S = window.StatusData;

  var reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var state = { artifacts: [], questions: [] };

  var WORLDS = {
    Moon: {
      name: "The Moon",
      href: "globe.html?body=moon",
      cta: "Explore the Moon",
      desc: "Landers, rovers and instruments left on the lunar surface.",
      image: "assets/textures/moon_color_2k.jpg",
      alt: "A textured view of the Moon's surface."
    },
    Mars: {
      name: "Mars",
      href: "globe.html?body=mars",
      cta: "Explore Mars",
      desc: "Rovers and landers that explored the red planet and stayed there.",
      image: "assets/textures/mars_color_2k.jpg",
      alt: "A textured view of the Martian surface."
    },
    Beyond: {
      name: "Beyond",
      href: "beyond.html",
      cta: "Go beyond",
      desc: "Spacecraft that flew past the Moon and Mars into deep space.",
      image: null,
      alt: ""
    }
  };
  var WORLD_ORDER = ["Moon", "Mars", "Beyond"];

  function esc(s) {
    return D.esc(s === null || s === undefined ? "" : s);
  }
  function countLabel(n, one, many) {
    return n + " " + (n === 1 ? one : many);
  }
  function artifactHref(a) {
    var page = a.destination === "Beyond" ? "beyond.html" : "globe.html";
    return page + "#artifact=" + encodeURIComponent(a.id);
  }
  function byDestination(dest) {
    return state.artifacts.filter(function (a) { return a.destination === dest; });
  }
  function showSection(sec) {
    if (!sec) return;
    sec.hidden = false;
    sec.classList.add("home-revealed");
  }
  function hideSection(sec) { if (sec) sec.hidden = true; }

  /* First sentences of real text. TODO values have already been rejected by
     the caller, so this only ever trims sourced prose. */
  function firstSentences(text, n) {
    var parts = String(text).match(/[^.!?]+[.!?]+(?:\s|$)/g);
    if (!parts || !parts.length) return String(text).trim();
    return parts.slice(0, n).join(" ").replace(/\s+/g, " ").trim();
  }
  function teaserFor(a) {
    if (D.present(a.story)) return firstSentences(a.story, 2);
    if (D.present(a.mission_context)) return firstSentences(a.mission_context, 2);
    return "Coming soon";
  }

  /* ---------- 1. Hero globe ---------- */
  function startHeroGlobe() {
    var disc = document.getElementById("hero-globe-disc");
    var globe = document.getElementById("hero-globe");
    if (!disc || !globe) return;
    if (reduceMotion) {
      globe.classList.add("is-paused");
      return;
    }
    var bodies = ["moon", "mars"];
    var i = 0;
    var timer = null;
    function tick() {
      i = (i + 1) % bodies.length;
      disc.setAttribute("data-body", bodies[i]);
    }
    function start() {
      if (document.hidden) { globe.classList.add("is-paused"); return; }
      if (timer) return;
      globe.classList.remove("is-paused");
      timer = window.setInterval(tick, 9000);
    }
    function stop() {
      if (timer) { window.clearInterval(timer); timer = null; }
      globe.classList.add("is-paused");
    }
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop(); else start();
    });
    start();
  }

  /* ---------- 2. Live counters ---------- */
  function countUp(node, target) {
    if (reduceMotion || target === 0) { node.textContent = String(target); return; }
    var start = null;
    var duration = 900;
    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min(1, (ts - start) / duration);
      var eased = 1 - Math.pow(1 - p, 3);
      node.textContent = String(Math.round(target * eased));
      if (p < 1) window.requestAnimationFrame(step);
    }
    window.requestAnimationFrame(step);
  }

  function buildCounters() {
    var strip = document.getElementById("stat-strip");
    if (!strip) return;
    var stillWorking = state.artifacts.filter(function (a) {
      return S.categoryOf(a.status) === "Still working";
    }).length;

    var stats = [
      { value: state.artifacts.length, label: "Machines in the museum" },
      { value: byDestination("Moon").length, label: "On the Moon" },
      { value: byDestination("Mars").length, label: "On Mars" },
      { value: byDestination("Beyond").length, label: "Beyond the Moon and Mars" },
      { value: stillWorking, label: "Still operating" }
    ];

    strip.innerHTML = stats.map(function (s) {
      return '<li class="stat" aria-label="' + esc(countLabel(s.value, "machine", "machines") + ", " + s.label) + '">' +
        '<span class="stat-value" aria-hidden="true" data-target="' + s.value + '">0</span>' +
        '<span class="stat-label" aria-hidden="true">' + esc(s.label) + "</span>" +
      "</li>";
    }).join("");

    showSection(document.getElementById("counter-section"));

    var values = strip.querySelectorAll(".stat-value");
    function run() {
      Array.prototype.forEach.call(values, function (node) {
        countUp(node, Number(node.getAttribute("data-target")) || 0);
      });
    }
    if (reduceMotion || !("IntersectionObserver" in window)) { run(); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          io.disconnect();
          run();
        }
      });
    }, { threshold: 0.35 });
    io.observe(strip);
  }

  /* ---------- 3. Three destinations ---------- */
  function beyondIcon() {
    return '<svg viewBox="0 0 120 60" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true">' +
      '<ellipse cx="60" cy="30" rx="52" ry="19" opacity="0.55"/>' +
      '<circle cx="60" cy="30" r="9"/>' +
      '<circle cx="104" cy="19" r="2.4" fill="currentColor" stroke="none"/>' +
      '<path d="M18 42c14 7 40 10 68 3" stroke-dasharray="3 5" opacity="0.6"/>' +
      "</svg>";
  }

  function buildDestinations() {
    var grid = document.getElementById("dest-grid");
    var section = document.getElementById("dest-section");
    if (!grid || !section) return;

    var oldEmpty = section.querySelector(".home-empty");
    if (oldEmpty) oldEmpty.parentNode.removeChild(oldEmpty);

    if (!state.artifacts.length) {
      grid.innerHTML = "";
      section.querySelector(".section-head").insertAdjacentHTML("afterend",
        '<p class="home-empty">The collection is being prepared. <strong>Come back soon</strong> to meet the machines.</p>');
      return;
    }

    grid.innerHTML = WORLD_ORDER.map(function (dest) {
      var world = WORLDS[dest];
      var items = byDestination(dest);
      var names = items.slice(0, 3).map(function (a) {
        return '<span class="name-chip">' + esc(a.name) + "</span>";
      }).join("");
      var media = world.image
        ? '<div class="world-media"><img src="' + world.image + '" alt="' + esc(world.alt) +
            '" width="2048" height="1024" loading="lazy" decoding="async"></div>'
        : '<div class="world-media is-beyond">' + beyondIcon() + "</div>";
      var count = items.length
        ? countLabel(items.length, "machine", "machines")
        : "No machines yet";
      return '<a class="world-card" href="' + world.href + '">' +
        media +
        '<div class="world-body">' +
          '<h3 class="world-name">' + esc(world.name) + "</h3>" +
          '<span class="world-desc">' + esc(world.desc) + "</span>" +
          '<span class="world-count">' + esc(count) + "</span>" +
          (names ? '<span class="world-names">' + names + "</span>" : "") +
          '<span class="world-cta">' + esc(world.cta) +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>' +
          "</span>" +
        "</div></a>";
    }).join("");
  }

  /* ---------- 4. Featured machine ---------- */
  function buildFeatured() {
    var card = document.getElementById("featured-card");
    var section = document.getElementById("featured-section");
    if (!card || !section || !state.artifacts.length) return;

    var preferred = state.artifacts.filter(function (a) {
      return D.present(a.story) && D.present(a.image_file);
    });
    var pool = preferred.length ? preferred : state.artifacts;
    var a = pool[Math.floor(Math.random() * pool.length)];
    if (!a) return;

    var media = D.present(a.image_file)
      ? '<img src="' + esc(a.image_file) + '" alt="' + esc(D.present(a.image_alt) ? a.image_alt : a.name) +
          '" loading="lazy" decoding="async">'
      : '<span class="featured-fallback">Image coming soon</span>';
    var credit = D.present(a.image_credit)
      ? '<p class="featured-credit">Image: ' + esc(a.image_credit) + "</p>" : "";
    var check = a.verified === false
      ? '<p class="featured-credit">This information is being fact-checked.</p>' : "";

    card.innerHTML =
      '<div class="featured-media">' + media + "</div>" +
      '<div class="featured-body">' +
        '<p class="featured-kicker">Featured machine · ' + esc(a.destination) + "</p>" +
        "<h3>" + esc(a.name) + "</h3>" +
        '<div class="featured-status">' + S.badgeHtml(a.status) + "</div>" +
        '<p class="featured-teaser">' + esc(teaserFor(a)) + "</p>" +
        credit + check +
        '<div class="featured-actions">' +
          '<a class="btn" href="' + artifactHref(a) + '">Read the story' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>' +
          "</a>" +
        "</div>" +
      "</div>";
    showSection(section);
  }

  /* ---------- 5. What happened to them? ---------- */
  function buildStatusTiles() {
    var grid = document.getElementById("status-grid");
    var section = document.getElementById("status-section");
    if (!grid || !section || !state.artifacts.length) return;

    var cats = S.categories();
    if (!cats.length) return;

    var oldNote = section.querySelector(".status-note");
    if (oldNote) oldNote.parentNode.removeChild(oldNote);

    grid.innerHTML = cats.map(function (cat) {
      var matches = state.artifacts.filter(function (a) { return S.categoryOf(a.status) === cat; });
      var defs = [];
      var members = S.all().filter(function (st) { return st.category === cat; });
      members.forEach(function (st) {
        if (D.present(st.definition) && defs.indexOf(st.definition) < 0) defs.push(st.definition);
      });
      var swatches = members.map(function (st) {
        return '<span class="status-swatch" ' + S.dotAttrs(st.label) +
          ' title="' + esc(st.label) + '" aria-hidden="true"></span>';
      }).join("");
      var worlds = {};
      matches.forEach(function (a) {
        if (a.destination === "Moon" || a.destination === "Mars") worlds[a.destination] = true;
      });
      var worldKeys = Object.keys(worlds);
      var href = "globe.html?filter=" + encodeURIComponent(cat);
      if (parentMatchesOnlyOneWorld(matches, worldKeys)) href += "&body=" + worldKeys[0].toLowerCase();

      return '<a class="status-tile" href="' + esc(href) + '">' +
        '<div class="status-tile-top">' +
          '<span class="status-swatches">' + swatches + "</span>" +
          "<h3>" + esc(cat) + "</h3>" +
        "</div>" +
        '<span class="status-tile-count">' + matches.length + " " +
          '<span class="status-tile-unit">' + (matches.length === 1 ? "machine" : "machines") + "</span></span>" +
        (defs.length ? '<span class="tile-def">' + esc(defs.join(" ")) + "</span>" : "") +
        '<span class="tile-open">Open on the globe →</span>' +
      "</a>";
    }).join("");

    if (state.artifacts.some(function (a) { return !S.byLabel(a.status); })) {
      grid.insertAdjacentHTML("afterend",
        '<p class="status-note">Machines whose status is still being checked are not counted in these groups.</p>');
    }
    showSection(section);
  }
  /* The category filter is shown on the globe; when every matching machine is
     on one world, open that world directly. */
  function parentMatchesOnlyOneWorld(matches, worldKeys) {
    return worldKeys.length === 1 && matches.every(function (a) {
      return a.destination === worldKeys[0];
    });
  }

  /* ---------- 6. How the museum works: quiz link ---------- */
  function wireQuizStep() {
    var old = document.querySelector("#how-section .step-quiz-link");
    if (old) old.parentNode.removeChild(old);
    if (!state.questions.length) return;
    var text = document.getElementById("step-quiz-text");
    if (!text) return;
    text.insertAdjacentHTML("afterend",
      '<a class="step-quiz-link" href="quiz.html">Take the quiz' +
        '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>' +
      "</a>");
  }

  /* ---------- 7. Built on NASA's own records ---------- */
  function sourceLabel(url) {
    try {
      var u = new URL(url, window.location.href);
      var host = u.hostname.replace(/^www\./, "");
      if (/(^|\.)nssdc\.gsfc\.nasa\.gov$/.test(host)) {
        var id = u.searchParams.get("id");
        return "NSSDCA record" + (id ? " " + id : "");
      }
      if (/(^|\.)science\.nasa\.gov$/.test(host)) {
        var segs = u.pathname.split("/").filter(Boolean);
        var slug = segs.length ? segs[segs.length - 1].replace(/-/g, " ") : "";
        if (slug) slug = slug.charAt(0).toUpperCase() + slug.slice(1);
        return "NASA Science" + (slug ? ": " + slug : "");
      }
      return host;
    } catch (e) {
      return "Source page";
    }
  }

  function buildSources() {
    var wrap = document.getElementById("source-groups");
    var section = document.getElementById("records-section");
    if (!wrap || !section || !state.artifacts.length) return;

    var groups = WORLD_ORDER.map(function (dest) {
      var seen = {};
      var chips = [];
      byDestination(dest).forEach(function (a) {
        (Array.isArray(a.sources) ? a.sources : []).forEach(function (url) {
          if (typeof url !== "string" || !/^https?:\/\//i.test(url) || seen[url]) return;
          seen[url] = true;
          var label = sourceLabel(url);
          chips.push('<a class="source-chip" href="' + esc(url) +
            '" target="_blank" rel="noopener noreferrer" title="' + esc(url) +
            '" aria-label="' + esc(a.name + " — " + label) + '">' +
            esc(label) + "</a>");
        });
      });
      if (!chips.length) return "";
      return '<div class="source-group">' +
        "<h3>" + esc(dest === "Beyond" ? "Beyond the Moon and Mars" : dest) + "</h3>" +
        '<div class="source-chips">' + chips.join("") + "</div>" +
      "</div>";
    }).filter(Boolean);

    if (!groups.length) return;
    wrap.innerHTML = groups.join("");
    showSection(section);
  }

  /* ---------- 8. Quiz teaser ---------- */
  function validQuestion(q) {
    return q && typeof q.question === "string" && q.question !== "" &&
      Array.isArray(q.options) && q.options.length >= 2 &&
      typeof q.correctIndex === "number" && q.correctIndex >= 0 && q.correctIndex < q.options.length;
  }
  function letter(i) { return String.fromCharCode(65 + i); }

  function buildQuizTeaser() {
    var host = document.getElementById("quiz-teaser");
    var section = document.getElementById("quiz-section");
    if (!host || !section || !state.questions.length) return;

    var q = state.questions[Math.floor(Math.random() * state.questions.length)];
    var answered = false;

    host.innerHTML =
      '<p class="quiz-teaser-kicker">From the museum quiz</p>' +
      "<h3>" + esc(q.question) + "</h3>" +
      '<div class="quiz-options2" role="group" aria-label="Answer choices">' +
        q.options.map(function (opt, i) {
          return '<button type="button" class="quiz-opt" data-index="' + i + '">' +
            '<span class="opt-letter" aria-hidden="true">' + letter(i) + "</span>" +
            '<span class="opt-text">' + esc(opt) + "</span></button>";
        }).join("") +
      "</div>" +
      '<div class="quiz-feedback2" id="quiz-teaser-feedback" role="status" hidden></div>';

    var buttons = host.querySelectorAll(".quiz-opt");
    Array.prototype.forEach.call(buttons, function (btn) {
      btn.addEventListener("click", function () {
        if (answered) return;
        answered = true;
        var chosen = Number(btn.getAttribute("data-index"));
        var ok = chosen === q.correctIndex;
        Array.prototype.forEach.call(buttons, function (b) {
          var i = Number(b.getAttribute("data-index"));
          b.disabled = true;
          if (i === q.correctIndex) {
            b.classList.add("is-correct");
            b.insertAdjacentHTML("beforeend", '<span class="sr-only"> (correct answer)</span>');
          } else if (i === chosen) {
            b.classList.add("is-wrong");
            b.insertAdjacentHTML("beforeend", '<span class="sr-only"> (your answer)</span>');
          }
        });
        var fb = host.querySelector("#quiz-teaser-feedback");
        var exp = D.present(q.explanation) ? D.display(q.explanation) : "";
        fb.innerHTML = "<strong>" + (ok ? "Correct." : "Not quite.") + "</strong> " +
          (exp ? esc(exp) + " " : "") +
          '<a class="quiz-more" href="quiz.html">Take the full quiz' +
            '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>' +
          "</a>";
        fb.hidden = false;
        fb.setAttribute("tabindex", "-1");
        fb.focus();
      });
    });
    showSection(section);
  }

  /* ---------- Boot ---------- */
  function showError(err) {
    console.error("Home data failed to load:", err);
    ["counter-section", "dest-section", "featured-section", "status-section",
      "records-section", "quiz-section"].forEach(function (id) {
        hideSection(document.getElementById(id));
      });
    var box = document.getElementById("home-data-error");
    if (!box) return;
    box.innerHTML = D.errorBlock("The museum's data could not be loaded. Run tools/sync-data.js or use a local server, then try again.");
    box.hidden = false;
    var retry = box.querySelector(".data-retry");
    if (retry) retry.addEventListener("click", load);
  }

  function load() {
    var box = document.getElementById("home-data-error");
    if (box) { box.hidden = true; box.innerHTML = ""; }
    return Promise.all([
      D.load(),
      S.load(),
      D.loadQuiz().catch(function () { return []; })
    ]).then(function (res) {
      state.artifacts = res[0];
      state.questions = res[2].filter(validQuestion);

      buildCounters();
      showSection(document.getElementById("counter-section"));
      buildDestinations();
      showSection(document.getElementById("dest-section"));
      buildFeatured();
      buildStatusTiles();
      wireQuizStep();
      buildSources();
      buildQuizTeaser();
    }).catch(showError);
  }

  function boot() {
    startHeroGlobe();
    load();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
