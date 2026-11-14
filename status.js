/* Among the Stars — shared mission-status system.
   Every status name, colour, definition, category and icon name lives in
   data/statuses.json. This module loads that file (with a file:// mirror
   fallback) and turns it into badges, dots, shapes, legends and filter rows.
   No status name, colour or definition is hardcoded here — only the icon
   artwork (keyed by the config's icon name) and the neutral "being verified"
   fallback, which the brief defines for TODO statuses. */
(function () {
  "use strict";

  var NEUTRAL = "#8A93A6";           // neutral grey for a TODO / unverified status
  var VERIFY_LABEL = "Status being verified";
  var SHAPES = ["circle", "square", "triangle", "hexagon"];
  var RESOLUTION = { circle: 24, square: 4, triangle: 3, hexagon: 6 };

  var list = [], map = {}, loadPromise = null;

  function clean(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === "string" && value.trim().toUpperCase().indexOf("TODO") === 0) return null;
    return value;
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function rgba(hex, a) {
    var h = String(hex).replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
  }

  /* Simple line icons, keyed by the icon name stored in statuses.json. */
  var ICONS = {
    "pulse": '<path d="M2 12h4l2-6 4 12 2-6h8"/>',
    "check": '<circle cx="12" cy="12" r="9"/><path d="M8 12.4l2.6 2.6L16 9.6"/>',
    "signal-off": '<circle cx="12" cy="13" r="1.5"/><path d="M8.8 9.8a4.5 4.5 0 0 0 0 6.4M15.2 9.8a4.5 4.5 0 0 1 0 6.4"/><path d="M6 7a8.5 8.5 0 0 0 0 12M18 7a8.5 8.5 0 0 1 0 12"/><path d="M4 4l16 16"/>',
    "power": '<path d="M12 3v9"/><path d="M6.3 6.3a8 8 0 1 0 11.4 0"/>',
    "crash": '<circle cx="12" cy="12" r="2.4"/><path d="M12 3v5M12 16v5M3 12h5M16 12h5"/><path d="M6 6l3 3M18 6l-3 3M6 18l3-3M18 18l-3-3"/>',
    "box": '<path d="M3 8l9-5 9 5v8l-9 5-9-5V8z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
    "flame": '<path d="M12 22a6 6 0 0 0 6-6c0-4-3-5-4-9-2 2-3 3.5-3 5.5C10 11 9 10 9 8.5 7.5 10 6 12.5 6 16a6 6 0 0 0 6 6z"/>',
    "target": '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
    "unknown": '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .9-1 1.6"/><path d="M12 17h.01"/>'
  };
  function iconSvg(name) {
    var inner = ICONS[name] || ICONS.unknown;
    return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" ' +
      'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + "</svg>";
  }

  function load() {
    if (loadPromise) return loadPromise;
    loadPromise = fetch("data/statuses.json?v=4", { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .catch(function () {
        if (window.STATUSES_MIRROR) return window.STATUSES_MIRROR;
        loadPromise = null;   // allow a later retry to re-fetch
        throw new Error("Status data unavailable. Run tools/sync-data.js or use a local server.");
      })
      .then(function (data) {
        if (!data || !Array.isArray(data.statuses)) { loadPromise = null; throw new Error("Invalid statuses.json"); }
        list = data.statuses;
        map = {};
        list.forEach(function (s) { map[s.label] = s; });
        return list;
      });
    return loadPromise;
  }

  function all() { return list; }
  function byLabel(label) {
    var c = clean(label);
    return c !== null && map[c] ? map[c] : null;
  }
  function categoryOf(status) { var e = byLabel(status); return e ? e.category : null; }
  function colourOf(status) { var e = byLabel(status); return e ? e.colour : NEUTRAL; }
  function definitionOf(status) { var e = byLabel(status); return e ? e.definition : null; }
  function labelFor(status) { var e = byLabel(status); return e ? e.label : VERIFY_LABEL; }

  /* Categories in order of first appearance, derived from the data. */
  function categories() {
    var seen = {}, out = [];
    list.forEach(function (s) {
      if (s.category && !seen[s.category]) { seen[s.category] = true; out.push(s.category); }
    });
    return out;
  }
  /* Shape encodes the category so colour is never the only signal. The mapping
     follows category order, so no category name is hardcoded here. */
  function categoryShape(category) {
    var idx = categories().indexOf(category);
    return SHAPES[idx >= 0 ? idx % SHAPES.length : 0];
  }
  function shapeResolution(shape) { return RESOLUTION[shape] || RESOLUTION.circle; }
  function shapeOf(status) {
    var e = byLabel(status);
    return e ? categoryShape(e.category) : "circle";
  }

  function badgeVars(colour) {
    return "--status-color:" + colour + ";--status-border:" + rgba(colour, 0.5) +
      ";--status-bg:" + rgba(colour, 0.13);
  }
  /* A badge always carries an icon AND a text label; colour is supplementary. */
  function badgeHtml(status) {
    var e = byLabel(status);
    return '<span class="status-badge" data-shape="' + shapeOf(status) + '" style="' +
      badgeVars(colourOf(status)) + '">' + iconSvg(e ? e.icon : "unknown") +
      '<span class="sb-label">' + esc(labelFor(status)) + "</span></span>";
  }
  /* Attributes for a small colour+shape dot (legend, list, chips, cards). */
  function dotAttrs(status) {
    return 'data-shape="' + shapeOf(status) + '" style="--dot-color:' + colourOf(status) + '"';
  }

  /* Builds the "All + four categories" filter row. Native buttons give Tab /
     Enter / Space for free; aria-pressed exposes state; the count element is an
     aria-live region the page updates through updateCount(). */
  function mountFilters(opts) {
    var container = opts && opts.container;
    if (!container) return null;
    var active = "All";
    var cats = ["All"].concat(categories());
    container.classList.add("status-filters");
    container.setAttribute("role", "group");
    container.setAttribute("aria-label", opts.label || "Filter by mission status");
    container.innerHTML = "";
    var buttons = cats.map(function (cat) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "filter-btn";
      b.dataset.category = cat;
      b.setAttribute("aria-pressed", cat === active ? "true" : "false");
      b.textContent = cat;
      b.addEventListener("click", function () { setActive(cat, true); });
      container.appendChild(b);
      return b;
    });
    function setActive(cat, fire) {
      active = cat;
      buttons.forEach(function (b) {
        b.setAttribute("aria-pressed", b.dataset.category === cat ? "true" : "false");
      });
      if (fire && opts.onChange) opts.onChange(cat);
    }
    function updateCount(shown, total) {
      if (opts.countEl) opts.countEl.textContent = "Showing " + shown + " of " + total;
    }
    return {
      getActive: function () { return active; },
      setActive: setActive,
      updateCount: updateCount,
      buttons: buttons
    };
  }

  window.StatusData = {
    load: load,
    all: all,
    byLabel: byLabel,
    categoryOf: categoryOf,
    colourOf: colourOf,
    definitionOf: definitionOf,
    labelFor: labelFor,
    categories: categories,
    categoryShape: categoryShape,
    shapeOf: shapeOf,
    shapeResolution: shapeResolution,
    iconSvg: iconSvg,
    badgeHtml: badgeHtml,
    dotAttrs: dotAttrs,
    mountFilters: mountFilters,
    NEUTRAL: NEUTRAL,
    VERIFY_LABEL: VERIFY_LABEL
  };
})();