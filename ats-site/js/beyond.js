/* Among the Stars — Beyond the Moon and Mars (Stage 3).
   Cards for every artifact whose destination is "Beyond", opening the same
   shared exhibit panel as the globe page. Each card carries a mission-status
   badge, and a filter row narrows the fleet by status category. Distance
   diagrams are drawn only from verified data; nothing is ever invented. */
(function () {
  "use strict";

  var D = window.ArtifactData;
  var E = window.Exhibit;
  var S = window.StatusData;

  var allItems = [];
  var filter = "All";
  var current = null;
  var filters = null;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* A card meta span: real value, TODO -> Coming soon, empty/missing -> omitted. */
  function metaSpan(label, value) {
    if (D.present(value)) return "<span>" + label + ": <strong>" + esc(value) + "</strong></span>";
    if (D.isTodo(value)) return "<span>" + label + ': <strong class="coming-soon">Coming soon</strong></span>';
    return "";
  }
  function summaryHtml(a) {
    if (D.present(a.summary)) return '<p class="fc-summary">' + esc(a.summary) + "</p>";
    if (D.isTodo(a.summary)) return '<p class="fc-summary coming-soon">Coming soon</p>';
    return "";
  }
  function openBeyondExhibit(a, trigger) {
    current = a;
    setArtifactHash(a.id);
    E.open(a, {
      trigger: trigger,
      backLabel: "Back to Beyond",
      list: filteredItems(),
      all: allItems,
      onNavigate: function (next, t) { openBeyondExhibit(next, t); },
      onRelated: openBeyondRelated,
      onClose: function () { current = null; clearHash(); }
    });
  }
  /* Related chips can point at a machine shown on a globe instead. */
  function openBeyondRelated(id) {
    var rel = allItems.filter(function (x) { return x.id === id; })[0];
    if (rel) openBeyondExhibit(rel, null);
    else window.location.href = "globe.html#artifact=" + encodeURIComponent(id);
  }

  function verifiedDistance(a) {
    return typeof a.distance_value === "number" && isFinite(a.distance_value) &&
      a.distance_verified === true && D.clean(a.distance_unit) !== null;
  }

  function filteredItems() {
    if (filter === "All") return allItems;
    return allItems.filter(function (a) { return S.categoryOf(a.status) === filter; });
  }

  function updateCount() {
    var shown = filteredItems().length, total = allItems.length;
    var fc = document.getElementById("fleet-filter-count");
    if (fc) fc.textContent = "Showing " + shown + " of " + total;
    var lede = document.getElementById("fleet-count");
    if (lede) lede.textContent = total
      ? total + " machines in the collection, far from any surface"
      : "No machines added yet.";
  }

  /* ---------- Cards ---------- */
  /* The fleet is grouped by machine type, in this fixed order. */
  var TYPE_GROUPS = ["spacecraft", "orbiter", "telescope", "asteroid lander"];
  function typeLabel(t) {
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  function cardEl(a, i) {
    var color = S.colourOf(a.status);
    var shape = S.shapeOf(a.status);
    var card = document.createElement("button");
    card.type = "button";
    card.className = "fleet-card rise";
    card.style.animationDelay = (0.1 + i * 0.08) + "s";
    card.dataset.id = a.id;
    card.style.setProperty("--dot-color", color);
    card.setAttribute("aria-haspopup", "dialog");
    var meta = metaSpan("Mission", a.mission) + metaSpan("Launched", a.landing);
    card.innerHTML =
      '<span class="fc-top"><span class="a-dot" data-shape="' + shape + '" aria-hidden="true"></span>' +
        '<span class="fc-type">' + esc(a.type) + "</span></span>" +
      "<h3>" + esc(a.name) + "</h3>" +
      S.badgeHtml(a.status) +
      (meta ? '<p class="fc-meta">' + meta + "</p>" : "") +
      summaryHtml(a) +
      '<span class="fc-cta">Open exhibit' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>' +
      "</span>";
    card.addEventListener("click", function () { openBeyondExhibit(a, card); });
    return card;
  }
  /* Full-width sub-heading inside the existing grid — no stylesheet change. */
  function groupHeading(t) {
    var h = document.createElement("h3");
    h.className = "fleet-group";
    h.textContent = typeLabel(t);
    h.style.gridColumn = "1 / -1";
    h.style.margin = "6px 0 0";
    h.style.fontSize = "12px";
    h.style.fontWeight = "600";
    h.style.letterSpacing = "0.14em";
    h.style.textTransform = "uppercase";
    h.style.color = "var(--text-muted)";
    return h;
  }
  function renderCards() {
    var items = filteredItems();
    var grid = document.getElementById("fleet-grid");
    grid.innerHTML = "";
    updateCount();

    if (items.length === 0) {
      grid.innerHTML = '<p class="fleet-empty">' +
        (filter !== "All"
          ? "No matching hardware in the collection."
          : "No machines added yet.") +
        "</p>";
      return;
    }

    /* Known groups in fixed order, then any other type that appears. */
    var order = TYPE_GROUPS.slice();
    items.forEach(function (a) {
      var t = String(a.type || "").toLowerCase();
      if (t && order.indexOf(t) === -1) order.push(t);
    });

    var i = 0;
    order.forEach(function (t) {
      var group = items.filter(function (a) { return String(a.type || "").toLowerCase() === t; });
      if (!group.length) return;
      grid.appendChild(groupHeading(t));
      group.forEach(function (a) { grid.appendChild(cardEl(a, i++)); });
    });
  }

  /* ---------- Distance diagram (verified data only) ---------- */
  function distanceDiagram(a) {
    var value = String(a.distance_value);
    var unit = D.clean(a.distance_unit);
    var asOf = D.clean(a.distance_as_of);
    var label = value + " " + unit + (asOf ? " (as of " + asOf + ")" : "");
    var aria = esc(a.name) + " is " + esc(label) + " from Earth. Diagram: Earth on the left, the spacecraft on the right.";
    return '<svg class="dist-diagram" viewBox="0 0 640 150" role="img" aria-label="' + aria + '">' +
      '<line class="d-line" x1="94" y1="82" x2="546" y2="82"/>' +
      '<circle class="d-earth-glow" cx="70" cy="82" r="26"/>' +
      '<circle class="d-earth" cx="70" cy="82" r="14"/>' +
      '<circle class="d-craft-glow" cx="570" cy="82" r="20"/>' +
      '<circle class="d-craft" cx="570" cy="82" r="8"/>' +
      '<text class="d-value" x="320" y="46" text-anchor="middle">' + esc(value + " " + unit) + "</text>" +
      (asOf ? '<text class="d-asof" x="320" y="126" text-anchor="middle">as of ' + esc(asOf) + "</text>" : "") +
      '<text class="d-name" x="70" y="126" text-anchor="middle">Earth</text>' +
      '<text class="d-name" x="570" y="126" text-anchor="middle">' + esc(a.name) + "</text>" +
      "</svg>";
  }

  function renderDistancePanels() {
    var items = filteredItems();
    var host = document.getElementById("distance-panels");
    host.innerHTML = "";
    if (items.length === 0) {
      host.innerHTML = '<p class="fleet-empty">' +
        (filter !== "All"
          ? "No matching hardware to measure."
          : "No machines added yet.") +
        "</p>";
      return;
    }
    items.forEach(function (a) {
      var color = S.colourOf(a.status);
      var shape = S.shapeOf(a.status);
      var panel = document.createElement("article");
      panel.className = "dist-panel";
      panel.style.setProperty("--dot-color", color);

      var distArea = verifiedDistance(a)
        ? '<p class="dist-label">Distance from Earth</p>' + distanceDiagram(a)
        : "";

      var signal = "";
      if (D.present(a.signal_travel_note)) {
        signal = '<div class="signal-block"><h4>How long does a signal take?</h4><p>' + esc(a.signal_travel_note) + "</p></div>";
      } else if (D.isTodo(a.signal_travel_note)) {
        signal = '<div class="signal-block"><h4>How long does a signal take?</h4><p class="coming-soon">Coming soon</p></div>';
      }

      panel.innerHTML =
        '<div class="dist-panel-head"><span class="a-dot" data-shape="' + shape + '" aria-hidden="true"></span><h3>' + esc(a.name) + "</h3></div>" +
        distArea + signal;
      host.appendChild(panel);
    });
  }

  /* ---------- Status filter ---------- */
  function applyFilter(cat) {
    filter = cat;
    if (filters) filters.setActive(cat, false);
    if (current && cat !== "All" && S.categoryOf(current.status) !== cat) {
      if (E.isOpen()) E.close();
    }
    renderCards();
    renderDistancePanels();
  }

  /* ---------- Deep link ---------- */
  function setArtifactHash(id) {
    var frag = "artifact=" + encodeURIComponent(id);
    try { history.replaceState(null, "", "#" + frag); }
    catch (e) { window.location.hash = frag; }
  }
  function clearHash() {
    try { history.replaceState(null, "", window.location.pathname + window.location.search); }
    catch (e) { window.location.hash = ""; }
  }
  function parseArtifactHash() {
    var m = /^#artifact=([^&]+)/.exec(location.hash);
    return m ? decodeURIComponent(m[1]) : null;
  }
  /* A link to a machine that no longer exists: return to the globe, which
     shows "That machine was not found." */
  function backToGlobe(id) {
    window.location.replace("globe.html" +
      (id ? "#artifact=" + encodeURIComponent(id) : ""));
  }
  function openDeepLink() {
    var id = parseArtifactHash();
    if (!id) return;
    var a = allItems.filter(function (x) { return x.id === id; })[0];
    if (!a) { backToGlobe(id); return; }
    if (!E.isOpen() || !current || current.id !== id) openBeyondExhibit(a, null);
  }
  function onHashChange() {
    var id = parseArtifactHash();
    if (id) openDeepLink();
    else if (E.isOpen()) E.close();
  }

  /* ---------- Boot ---------- */
  function showError(err) {
    console.error("Machine data failed to load:", err);
    var msg = (err && err.message) ? err.message : "We could not load the machine data.";
    var lede = document.getElementById("fleet-count");
    if (lede) lede.textContent = "Data unavailable";
    var grid = document.getElementById("fleet-grid");
    if (grid) grid.innerHTML = D.errorBlock(msg);
    var panels = document.getElementById("distance-panels");
    if (panels) panels.innerHTML = "";
    var retry = grid && grid.querySelector(".data-retry");
    if (retry) retry.addEventListener("click", loadData);
  }

  function loadData() {
    return Promise.all([D.load(), S.load()]).then(function (res) {
      allItems = res[0].filter(function (a) { return a.destination === "Beyond"; });
      var container = document.getElementById("fleet-filters");
      if (container) {
        filters = S.mountFilters({
          container: container,
          label: "Filter spacecraft by mission status",
          onChange: applyFilter
        });
      }
      renderCards();
      renderDistancePanels();
      openDeepLink();
    }).catch(showError);
  }

  function boot() {
    window.addEventListener("hashchange", onHashChange);
    loadData();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();