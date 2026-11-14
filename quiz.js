/* Among the Stars — quiz (Stage 4).
   One question at a time with instant feedback, a link to the related exhibit
   (on its globe or Beyond page), a final score and Try again. Questions and
   explanations come only from data/quiz.json. Answer options are shuffled for
   display; the stored answer is still the original option index, so scoring
   keeps using correctIndex. A question whose artifact is not yet visible links
   to its NASA source instead of a story page. */
(function () {
  "use strict";

  var D = window.ArtifactData;
  var E = window.Exhibit;
  var S = window.StatusData;

  var state = { questions: [], artifacts: [], i: 0, answers: [], orders: [], phase: "question" };
  var firstRender = true;
  var el = {};

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function letter(i) { return String.fromCharCode(65 + i); }
  function artifactFor(q) {
    for (var i = 0; i < state.artifacts.length; i++) {
      if (state.artifacts[i].id === q.artifact_id) return state.artifacts[i];
    }
    return null;
  }
  function answeredCount() {
    return state.answers.filter(function (v) { return typeof v === "number"; }).length;
  }
  function score() {
    return state.questions.reduce(function (n, q, i) {
      return n + (state.answers[i] === q.correctIndex ? 1 : 0);
    }, 0);
  }

  var CHECK = '<svg class="opt-mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>';
  var CROSS = '<svg class="opt-mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  /* ---------- Option order ----------
     A fresh Fisher–Yates order per question and per attempt. The order holds
     original option indices, so correctIndex and the stored answers keep
     pointing at the same data. */
  function shuffleInto(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }
  function orderFor(qi) {
    if (!state.orders[qi]) {
      state.orders[qi] = shuffleInto(state.questions[qi].options.map(function (_, k) { return k; }));
    }
    return state.orders[qi];
  }

  /* ---------- Links ----------
     "See the full story" only for artifacts that are currently visible
     (state.artifacts comes from the published collection). Hidden artifacts,
     and every question anyway, carry the small source link. */
  function storyLink(a) {
    if (!a) return "";
    var page = a.destination === "Beyond" ? "beyond.html" : "globe.html";
    var href = page + "#artifact=" + encodeURIComponent(a.id);
    return '<a class="quiz-exhibit-link" href="' + esc(href) + '"' +
      ' style="--dot-color:' + E.typeColor(a.type) + '">' +
      '<span class="a-dot" aria-hidden="true"></span>See the full story: ' + esc(a.name) + "</a>";
  }
  function sourceLink(q, cls) {
    var url = typeof q.source_url === "string" ? q.source_url.trim() : "";
    if (!/^https?:\/\//i.test(url)) return "";
    return '<small class="' + (cls || "quiz-source") + '">' +
      '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">Source</a></small>';
  }

  /* ---------- Progress ---------- */
  function updateProgress() {
    var n = state.questions.length;
    var done = answeredCount();
    el.track.setAttribute("aria-valuemax", String(n));
    el.track.setAttribute("aria-valuenow", String(state.phase === "results" ? n : done));
    el.track.innerHTML = state.questions.map(function (q, i) {
      var cls = "seg";
      if (typeof state.answers[i] === "number") cls += " done";
      else if (i === state.i && state.phase === "question") cls += " current";
      return '<span class="' + cls + '"></span>';
    }).join("");
    el.progress.textContent = state.phase === "results"
      ? "Quiz complete · score " + score() + " of " + n
      : "Question " + (state.i + 1) + " of " + n;
    el.restart.hidden = state.phase === "results";
  }

  /* ---------- Question ---------- */
  function showQuestion() {
    state.phase = "question";
    var q = state.questions[state.i];
    el.stage.innerHTML =
      '<article class="quiz-card rise">' +
        '<p class="quiz-kicker">Question ' + (state.i + 1) + " of " + state.questions.length + "</p>" +
        '<h2 id="quiz-q" tabindex="-1">' + esc(q.question) + "</h2>" +
        '<div class="quiz-options" role="group" aria-label="Answer choices">' +
          orderFor(state.i).map(function (orig, d) {
            return '<button type="button" class="quiz-option" data-index="' + orig + '">' +
              '<span class="opt-letter" aria-hidden="true">' + letter(d) + "</span>" +
              '<span class="opt-text">' + esc(q.options[orig]) + "</span></button>";
          }).join("") +
        "</div>" +
      "</article>";
    el.stage.querySelectorAll(".quiz-option").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.answers[state.i] = Number(btn.getAttribute("data-index"));
        showFeedback();
      });
    });
    updateProgress();
    if (!firstRender) document.getElementById("quiz-q").focus();
    firstRender = false;
  }

  /* ---------- Feedback ---------- */
  function showFeedback() {
    state.phase = "feedback";
    var q = state.questions[state.i];
    var chosen = state.answers[state.i];
    var ok = chosen === q.correctIndex;
    var a = artifactFor(q);
    var last = state.i === state.questions.length - 1;

    el.stage.innerHTML =
      '<article class="quiz-card">' +
        '<p class="quiz-kicker">Question ' + (state.i + 1) + " of " + state.questions.length + "</p>" +
        '<h2 tabindex="-1">' + esc(q.question) + "</h2>" +
        '<div class="quiz-options" role="group" aria-label="Answer choices">' +
          orderFor(state.i).map(function (orig, d) {
            var cls = "quiz-option";
            var mark = "";
            var sr = "";
            if (orig === q.correctIndex) { cls += " is-correct"; mark = CHECK; sr = ' <span class="sr-only">(correct answer)</span>'; }
            else if (orig === chosen) { cls += " is-wrong"; mark = CROSS; sr = ' <span class="sr-only">(your answer)</span>'; }
            else { cls += " is-dim"; }
            return '<button type="button" class="' + cls + '" disabled>' +
              '<span class="opt-letter" aria-hidden="true">' + letter(d) + "</span>" +
              '<span class="opt-text">' + esc(q.options[orig]) + sr + "</span>" + mark + "</button>";
          }).join("") +
        "</div>" +
        '<div class="quiz-feedback ' + (ok ? "ok" : "no") + '" id="quiz-feedback" tabindex="-1" role="status">' +
          '<p class="fb-verdict">' + (ok ? CHECK : CROSS) + (ok ? "Correct" : "Not quite") + "</p>" +
          '<p class="fb-explain">' + esc(D.display(q.explanation)) + "</p>" +
          '<p class="fb-source">' + sourceLink(q) + "</p>" +
          '<div class="fb-actions">' + storyLink(a) +
            '<button type="button" class="btn quiz-next" id="quiz-next">' +
              (last ? "See my score" : "Next question") + "</button>" +
          "</div>" +
        "</div>" +
      "</article>";
    document.getElementById("quiz-next").addEventListener("click", function () {
      if (last) showResults();
      else { state.i += 1; showQuestion(); }
    });
    updateProgress();
    document.getElementById("quiz-feedback").focus();
  }

  /* ---------- Results ---------- */
  function showResults() {
    state.phase = "results";
    var n = state.questions.length;
    var s = score();
    var pct = Math.round((s / n) * 100);
    var title = s === n ? "Perfect transmission!"
      : pct >= 75 ? "Strong signal!"
      : pct >= 50 ? "Good work — keep exploring."
      : "Every mission starts somewhere.";

    el.stage.innerHTML =
      '<article class="quiz-card quiz-results rise">' +
        '<p class="quiz-kicker">Quiz complete</p>' +
        '<div class="score-dial" style="--pct:' + pct + '" role="img" aria-label="Score: ' + s + " out of " + n + '">' +
          "<span>" + s + '<span class="score-of">/ ' + n + "</span></span></div>" +
        '<h2 id="quiz-result-title" tabindex="-1">' + esc(title) + "</h2>" +
        '<p class="quiz-result-sub">You answered ' + s + " of " + n + " correctly. " +
          "Each question links to its exhibit when it is on the site, or to its NASA source.</p>" +
        '<ol class="quiz-review">' +
          state.questions.map(function (q, i) {
            var ok = state.answers[i] === q.correctIndex;
            var a = artifactFor(q);
            return "<li>" +
              '<svg class="rev-mark ' + (ok ? "ok" : "no") + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
                (ok ? '<path d="M20 6L9 17l-5-5"/>' : '<path d="M6 6l12 12M18 6L6 18"/>') + "</svg>" +
              "<div>" +
                '<p class="rev-q">' + esc(q.question) + "</p>" +
                '<p class="rev-a">' + (ok
                  ? "Your answer: <strong>" + esc(q.options[state.answers[i]]) + "</strong>"
                  : "Your answer: <strong>" + esc(q.options[state.answers[i]]) + "</strong> · Correct answer: <strong>" + esc(q.options[q.correctIndex]) + "</strong>") + "</p>" +
                '<div class="rev-links">' + storyLink(a) + sourceLink(q, "review-source") + "</div>" +
              "</div></li>";
          }).join("") +
        "</ol>" +
        '<div class="quiz-result-actions">' +
          '<button type="button" class="btn" id="quiz-again">Try again</button>' +
          '<a class="btn ghost" href="globe.html">Explore the globe</a>' +
          '<a class="btn ghost" href="beyond.html">Go Beyond</a>' +
        "</div>" +
      "</article>";

    document.getElementById("quiz-again").addEventListener("click", restart);
    updateProgress();
    document.getElementById("quiz-result-title").focus();
  }

  function restart() {
    state.i = 0;
    state.answers = [];
    state.orders = [];
    showQuestion();
  }

  /* ---------- Boot ---------- */
  function validQuestion(q) {
    return q && typeof q.question === "string" && q.question !== "" &&
      Array.isArray(q.options) && q.options.length >= 2 &&
      typeof q.correctIndex === "number" && q.correctIndex >= 0 && q.correctIndex < q.options.length;
  }

  function showError(err) {
    console.error("Quiz data failed to load:", err);
    var msg = (err && err.message) ? err.message : "We could not load the quiz just now.";
    el.progress.textContent = "Quiz unavailable";
    el.stage.innerHTML = D.errorBlock(msg);
    var retry = el.stage.querySelector(".data-retry");
    if (retry) retry.addEventListener("click", loadData);
  }

  function loadData() {
    return Promise.all([D.load(), D.loadQuiz(), S.load()]).then(function (results) {
      state.artifacts = results[0];
      state.questions = results[1].filter(validQuestion);
      state.orders = [];
      if (state.questions.length === 0) {
        el.progress.textContent = "Quiz coming soon.";
        el.stage.innerHTML = '<p class="quiz-error">Quiz coming soon.</p>';
        return;
      }
      el.restart.hidden = false;
      showQuestion();
    }).catch(showError);
  }

  function boot() {
    el.stage = document.getElementById("quiz-stage");
    el.progress = document.getElementById("quiz-progress");
    el.track = document.getElementById("quiz-track");
    el.restart = document.getElementById("quiz-restart");
    el.restart.addEventListener("click", restart);
    loadData();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();