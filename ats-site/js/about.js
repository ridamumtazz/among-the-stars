/* Among the Stars — About & Sources credits (Stage 5).
   Reads data/artifacts.json and lists each machine's sources, image credit and
   coordinates reference, and reads data/statuses.json to explain every mission
   status label. Nothing is invented: TODO fields show "Coming soon". */
(function () {
  "use strict";

  var D = window.ArtifactData;
  var S = window.StatusData;
  if (!D) return;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function sourceItems(sources) {
    var list = (sources || []).map(D.clean).filter(function (v) { return v !== null && v !== ""; });
    if (!list.length) return '<li class="coming-soon">Coming soon</li>';
    return list.map(function (s) {
      if (/^https?:\/\//i.test(s)) {
        var host = s.replace(/^https?:\/\//i, "").split("/")[0];
        return '<li><a href="' + esc(s) + '" target="_blank" rel="noopener noreferrer">' + esc(host) + "</a></li>";
      }
      return "<li>" + esc(s) + "</li>";
    }).join("");
  }

  /* One credit line: TODO -> Coming soon, real -> text/link, missing -> hidden. */
  function creditRow(label, value, isUrl) {
    if (D.isTodo(value)) {
      return '<div><dt>' + label + '</dt><dd><span class="coming-soon">Coming soon</span></dd></div>';
    }
    if (!D.present(value)) return "";
    var c = D.clean(value);
    if (isUrl && /^https?:\/\//i.test(c)) {
      return '<div><dt>' + label + '</dt><dd><a href="' + esc(c) + '" target="_blank" rel="noopener noreferrer">' + esc(c) + "</a></dd></div>";
    }
    return '<div><dt>' + label + "</dt><dd>" + esc(c) + "</dd></div>";
  }

  function render(artifacts) {
    var host = document.getElementById("machine-credits");
    if (!host) return;
    if (!artifacts.length) {
      host.innerHTML = '<p class="coming-soon">No machines added yet.</p>';
      return;
    }
    host.innerHTML = artifacts.map(function (a) {
      var dest = a.destination === "Beyond" ? "Deep space" : a.destination;
      return '<article class="credit-item">' +
        '<h3>' + esc(a.name) + '<span class="credit-dest">' + esc(dest) + "</span></h3>" +
        '<dl class="credit-lines">' +
          creditRow("Image credit", a.image_credit, false) +
          creditRow("Image source", a.image_source_url, true) +
          creditRow("Status source", a.status_source, true) +
          creditRow("Coordinates reference", a.coord_source, false) +
        "</dl>" +
        '<p class="credit-sources-label">Mission sources</p>' +
        '<ul class="source-list credit-sources">' + sourceItems(a.sources) + "</ul>" +
      "</article>";
    }).join("");
  }

  /* Every source URL recorded in the data, grouped by destination. Duplicates
     are collapsed, so Viking and the two Mars Exploration Rovers appear once. */
  var DEST_ORDER = ["Moon", "Mars", "Beyond"];
  function renderSourceIndex(artifacts) {
    var host = document.getElementById("source-index");
    if (!host) return;
    var groups = { Moon: [], Mars: [], Beyond: [] };
    artifacts.forEach(function (a) {
      var dest = groups[a.destination] ? a.destination : "Beyond";
      (Array.isArray(a.sources) ? a.sources : []).forEach(function (s) {
        var url = D.clean(s);
        if (!url || !/^https?:\/\//i.test(url)) return;
        if (groups[dest].indexOf(url) === -1) groups[dest].push(url);
      });
    });
    var html = DEST_ORDER.filter(function (d) { return groups[d].length; }).map(function (d) {
      var label = d === "Beyond" ? "Beyond (deep space)" : d;
      return '<article class="credit-item">' +
        "<h3>" + esc(label) + "</h3>" +
        '<ul class="source-list credit-sources">' +
          groups[d].map(function (url) {
            return '<li><a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer" ' +
              'style="word-break:break-word">' + esc(url) + "</a></li>";
          }).join("") +
        "</ul></article>";
    }).join("");
    host.innerHTML = html
      ? '<div class="machine-credits">' + html + "</div>"
      : '<p class="coming-soon">No sources listed yet.</p>';
  }

  /* The eight mission status labels, generated entirely from statuses.json. */
  function renderStatusLabels(statuses) {
    var host = document.getElementById("status-labels");
    if (!host) return;
    if (!statuses.length) {
      host.innerHTML = '<p class="coming-soon">No status labels defined yet.</p>';
      return;
    }
    host.innerHTML = statuses.map(function (s) {
      return '<div class="status-label-item" style="--status-color:' + esc(s.colour) + '">' +
        '<span class="status-swatch" data-shape="' + esc(S.categoryShape(s.category)) +
          '" style="--dot-color:' + esc(s.colour) + '" aria-hidden="true"></span>' +
        '<span class="status-label-icon" aria-hidden="true">' + S.iconSvg(s.icon) + "</span>" +
        '<span class="status-label-body">' +
          '<span class="status-label-name">' + esc(s.label) + "</span>" +
          '<p class="status-label-def">' + esc(s.definition) + "</p>" +
          '<span class="status-label-cat">' + esc(s.category) + "</span>" +
        "</span>" +
      "</div>";
    }).join("");
  }

  /* Surface texture + font credits, read from data/credits.json. TODO fields
     show "Coming soon"; a fully unfilled entry collapses to one short line. */
  function creditField(label, value, isUrl) {
    var c = D.clean(value);
    if (c === null || c === "") {
      return '<div><dt>' + label + '</dt><dd><span class="coming-soon">Coming soon</span></dd></div>';
    }
    if (isUrl && /^https?:\/\//i.test(c)) {
      return '<div><dt>' + label + '</dt><dd><a href="' + esc(c) + '" target="_blank" rel="noopener noreferrer">' + esc(c) + "</a></dd></div>";
    }
    return '<div><dt>' + label + "</dt><dd>" + esc(c) + "</dd></div>";
  }
  function creditEntry(t) {
    var head = '<h3>' + esc(t.name) +
      (t.files ? '<span class="credit-dest">' + esc(t.files) + "</span>" : "") + "</h3>";
    var note = t.note ? '<p class="credit-note">' + esc(t.note) + "</p>" : "";
    var unfilled = ["source", "author", "licence", "url"].every(function (k) { return D.clean(t[k]) === null; });
    if (unfilled) {
      return '<article class="credit-item">' + head + note +
        '<p class="coming-soon">Source, author, licence and URL coming soon.</p></article>';
    }
    return '<article class="credit-item">' + head + note +
      '<dl class="credit-lines">' +
        creditField("Source", t.source, false) +
        creditField("Author", t.author, false) +
        creditField("Licence", t.licence, false) +
        creditField("URL", t.url, true) +
      "</dl></article>";
  }
  function renderCredits(credits) {
    var th = document.getElementById("texture-credits");
    if (th) {
      th.innerHTML = (credits.textures || []).map(creditEntry).join("") ||
        '<p class="coming-soon">No surface textures listed.</p>';
    }
    var fh = document.getElementById("font-credits");
    if (fh) {
      fh.innerHTML = (credits.fonts || []).map(creditEntry).join("") ||
        '<p class="coming-soon">No fonts listed.</p>';
    }
  }

  function wireRetry(host, fn) {
    var r = host && host.querySelector(".data-retry");
    if (r) r.addEventListener("click", fn);
  }
  function showMainError(err) {
    var msg = (err && err.message) ? err.message : "Credits could not be loaded.";
    var host = document.getElementById("machine-credits");
    if (host) { host.innerHTML = D.errorBlock(msg); wireRetry(host, loadMain); }
    var sl = document.getElementById("status-labels");
    if (sl) sl.innerHTML = '<p class="coming-soon">Status labels could not be loaded.</p>';
  }
  function loadMain() {
    return Promise.all([D.load(), S.load()]).then(function (res) {
      render(res[0]);
      renderSourceIndex(res[0]);
      renderStatusLabels(res[1]);
    }).catch(showMainError);
  }
  function showCreditsError(err) {
    var msg = (err && err.message) ? err.message : "Credits could not be loaded.";
    ["texture-credits", "font-credits"].forEach(function (id) {
      var n = document.getElementById(id);
      if (n) { n.innerHTML = D.errorBlock(msg); wireRetry(n, loadCreditsData); }
    });
  }
  function loadCreditsData() {
    return D.loadCredits().then(renderCredits).catch(showCreditsError);
  }

  function boot() {
    loadMain();
    loadCreditsData();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();