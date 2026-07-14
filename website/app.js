/* Walltopia preliminary-loads applicability tool.
   Reads window.WALLTOPIA_LOADS (from data.js) and drives a faithful reproduction
   of the Excel lookup: pick units, structure type, height/scheme, span A and
   overhang X -> read characteristic loads on ACS axis (R) and building columns (L),
   dead (DL) + live (LL). Optional factoring and a capacity pass/fail check. */
(function () {
  "use strict";
  var DATA = window.WALLTOPIA_LOADS;
  if (!DATA) { document.getElementById("result-root").innerHTML =
      '<div class="empty">Could not load data.js.</div>'; return; }

  // ---- state ----
  var S = { units: "EU", type: "wall", height: null, levels: null,
            span: null, overhang: null, force: null, factored: false, cap: null };

  // ---- derive option sets ----
  // wall height -> sorted list of available schemes (levels)
  var wallSchemes = {};        // { 8:[1,2], 9:[2], 12:[2,3], ... }
  Object.keys(DATA.walls).forEach(function (k) {
    var w = DATA.walls[k];
    (wallSchemes[w.height] = wallSchemes[w.height] || []).push(w.levels);
  });
  Object.keys(wallSchemes).forEach(function (h) { wallSchemes[h].sort(function (a, b) { return a - b; }); });
  var wallHeights = Object.keys(wallSchemes).map(Number).sort(function (a, b) { return a - b; });
  var boulderHeights = uniq(DATA.boulder.rows.map(function (r) { return r.z; })).sort(num);

  function uniq(a) { return a.filter(function (v, i) { return a.indexOf(v) === i; }); }
  function num(a, b) { return a - b; }

  function wallKey(h, lv) { return "W_" + h + "_" + lv; }

  function optionsFor() {
    // returns {heights, spans, overhangs} for current type + selection
    if (S.type === "boulder") {
      var rows = DATA.boulder.rows.filter(function (r) { return r.z === S.height; });
      return { heights: boulderHeights,
               spans: uniq(DATA.boulder.rows.map(function (r) { return r.a; })).sort(num),
               overhangs: uniq(DATA.boulder.rows.map(function (r) { return r.x; })).sort(num) };
    }
    var w = DATA.walls[wallKey(S.height, S.levels)];
    var spans = w ? uniq(w.rows.map(function (r) { return r.a; })).sort(num) : [];
    var over = w ? uniq(w.rows.map(function (r) { return r.x; })).sort(num) : [];
    return { heights: wallHeights, spans: spans, overhangs: over };
  }

  // ---- unit-aware formatting ----
  function U() { return DATA.meta.units[S.units]; }
  function fmtForce(v) {
    if (v === null || v === undefined) return "–";
    var d = S.units === "EU" ? 2 : 1;
    var s = Number(v).toFixed(d);
    return s.replace(/\.?0+$/, function (m) { return m.indexOf(".") === 0 ? "" : m; }) === "" ? s : s;
  }
  function fmtLen(v) { return S.units === "EU" ? v + " m" : (Math.round(v * 3.28084 * 10) / 10) + " ft"; }

  // ---- record lookup ----
  function wallRows() { // rows for current wall + span + overhang, keyed by level
    var w = DATA.walls[wallKey(S.height, S.levels)];
    if (!w) return [];
    return w.rows.filter(function (r) { return r.a === S.span && r.x === S.overhang; })
                 .sort(function (a, b) { return a.lvl - b.lvl; });
  }
  function boulderRow() {
    return DATA.boulder.rows.filter(function (r) {
      return r.z === S.height && r.a === S.span && r.x === S.overhang; })[0];
  }

  // ============ RENDER CONTROLS ============
  function seg(elId, items, cur, onPick) {
    var el = document.getElementById(elId);
    el.innerHTML = "";
    items.forEach(function (it) {
      var b = document.createElement("button");
      b.type = "button"; b.textContent = it.label;
      b.setAttribute("aria-pressed", String(it.value === cur));
      b.onclick = function () { onPick(it.value); };
      el.appendChild(b);
    });
  }
  function chips(elId, values, cur, onPick, labelFn) {
    var el = document.getElementById(elId);
    el.innerHTML = "";
    values.forEach(function (v) {
      var b = document.createElement("button");
      b.type = "button"; b.textContent = labelFn ? labelFn(v) : v;
      b.setAttribute("aria-pressed", String(v === cur));
      b.onclick = function () { onPick(v); };
      el.appendChild(b);
    });
  }

  function renderControls() {
    var u = U();
    // units + type
    seg("seg-units", [
      { label: "Metric (kN · m)", value: "EU" },
      { label: "Imperial (lb · ft)", value: "USA" }
    ], S.units, function (v) {
      if (v !== S.units) { S.cap = null; var ci = document.getElementById("cap-input"); if (ci) ci.value = ""; }
      S.units = v; clampAndRender();
    });

    seg("seg-type", [
      { label: "Climbing wall", value: "wall" },
      { label: "Boulder wall", value: "boulder" }
    ], S.type, function (v) { S.type = v; onTypeChange(); });

    document.getElementById("type-hint").textContent = S.type === "wall"
      ? "With protection points · " + u.codeWall
      : "Without protection points · " + u.codeBoulder;

    // heights
    var heights = S.type === "wall" ? wallHeights : boulderHeights;
    document.getElementById("lbl-height").innerHTML =
      "Climbing-surface height <span class=\"hint\">(" + (S.units === "EU" ? "m" : "ft") + ")</span>";
    chips("chips-height", heights, S.height, function (v) {
      S.height = v;
      if (S.type === "wall") {
        var sch = wallSchemes[v];
        if (sch.indexOf(S.levels) < 0) S.levels = sch[sch.length - 1];
      }
      clampAndRender();
    }, function (v) { return S.units === "EU" ? v : (Math.round(v * 3.28084)); });

    // scheme (levels) — only for walls with >1 option
    var schemeField = document.getElementById("field-scheme");
    if (S.type === "wall") {
      var schemes = wallSchemes[S.height] || [];
      schemeField.style.display = "";
      chips("chips-scheme", schemes, S.levels, function (v) { S.levels = v; clampAndRender(); },
        function (v) { return v + (v === 1 ? " level" : " levels"); });
      // when only one scheme, keep it visible but it acts as a static badge
    } else {
      schemeField.style.display = "none";
    }

    var opt = optionsFor();
    document.getElementById("lbl-span").innerHTML =
      "Column span · A <span class=\"hint\">(" + (S.units === "EU" ? "m" : "ft") + ", between building columns)</span>";
    chips("chips-span", opt.spans, S.span, function (v) { S.span = v; clampAndRender(); },
      function (v) { return S.units === "EU" ? v : Math.round(v * 3.28084); });

    document.getElementById("lbl-overhang").innerHTML =
      "Overhang · X <span class=\"hint\">(" + (S.units === "EU" ? "m" : "ft") + ", top − bottom contour)</span>";
    chips("chips-overhang", opt.overhangs, S.overhang, function (v) { S.overhang = v; clampAndRender(); },
      function (v) { return S.units === "EU" ? v : Math.round(v * 3.28084); });

    // capacity + factored
    document.getElementById("cap-unit").textContent = u.force;
    document.getElementById("factored-hint").textContent =
      "(×" + u.dl + " DL, ×" + u.ll + " LL)";
  }

  function onTypeChange() {
    if (S.type === "wall") {
      if (wallHeights.indexOf(S.height) < 0) S.height = 12;
      var sch = wallSchemes[S.height];
      if (sch.indexOf(S.levels) < 0) S.levels = sch[sch.length - 1];
    } else {
      if (boulderHeights.indexOf(S.height) < 0) S.height = boulderHeights[0];
    }
    clampAndRender();
  }

  function clampAndRender() {
    var opt = optionsFor();
    if (opt.spans.indexOf(S.span) < 0) S.span = opt.spans.includes(6) ? 6 : opt.spans[0];
    if (opt.overhangs.indexOf(S.overhang) < 0) {
      S.overhang = opt.overhangs.includes(1) ? 1 : opt.overhangs[0];
    }
    renderControls();
    renderResults();
  }

  // ============ RENDER RESULTS ============
  // Component metadata: label + which axis + point.
  function ptLabelWall(lvl, lh) {
    var h = lh && lh[lvl] !== undefined ? lh[lvl] : null;
    return "Level " + lvl + (h !== null ? " · " + fmtLen(h) : "");
  }

  function factor(v, kind) { // kind 'DL'|'LL'
    if (v === null || v === undefined) return v;
    if (!S.factored) return v;
    var u = U();
    return v * (kind === "DL" ? u.dl : u.ll);
  }

  function cell(v, kind, cls) {
    return '<td class="num ' + (cls || "") + '">' + fmtForce(factor(v, kind)) + "</td>";
  }

  function govColumnLoad() {
    // worst-case factored horizontal load on a building column across all force levels.
    // For each scenario row and each level's L column: DL always + LL (concurrent in that row).
    var u = U(), worst = 0, detail = null;
    function consider(dl, ll, tag) {
      if (dl === undefined && ll === undefined) return;
      var val = Math.abs((dl || 0) * u.dl + (ll || 0) * u.ll);
      if (val > worst) { worst = val; detail = tag; }
    }
    if (S.type === "boulder") {
      var b = boulderRow();
      if (b) consider(b.eu.LX1DL !== undefined ? pick(b, "LX1DL") : undefined,
                       pick(b, "LX1LL"), "column");
      return { value: worst, detail: detail };
    }
    var rows = wallRows(), w = DATA.walls[wallKey(S.height, S.levels)];
    rows.forEach(function (r) {
      for (var lv = 1; lv <= w.levels; lv++) {
        consider(pick(r, "LX" + lv + "DL"), pick(r, "LX" + lv + "LL"),
                 "Level " + lv + " (max at L" + r.lvl + ")");
      }
    });
    return { value: worst, detail: detail };
  }

  function pick(row, key) {
    var src = S.units === "EU" ? row.eu : row.us;
    return src ? src[key] : undefined;
  }

  function renderResults() {
    var root = document.getElementById("result-root");
    var u = U();
    var have = S.type === "boulder" ? !!boulderRow() : wallRows().length > 0;
    if (!have) { root.innerHTML = '<div class="empty">No table entry for this combination.</div>'; return; }

    var heightLbl = fmtLen(S.height);
    var schemeLbl = S.type === "wall" ? (S.levels + (S.levels === 1 ? " attachment level" : " attachment levels")) : "single attachment";
    var title = (S.type === "wall" ? "Climbing wall " : "Boulder wall ") + heightLbl;
    var sub = schemeLbl + " · span A = " + fmtLen(S.span) + " · overhang X = " + fmtLen(S.overhang)
            + " · characteristic values in " + u.force + (S.factored ? " · factored" : "");

    var html = '<div class="results-head">'
      + '<div><p class="title">' + title + '</p><p class="sub">' + sub + '</p></div>'
      + '<div class="spacer"></div>' + verdictHtml() + "</div>";

    if (S.type === "boulder") html += boulderTable();
    else html += wallResults();

    html += legendHtml() + notesHtml();
    root.innerHTML = html;
    wireForceBar();
  }

  function verdictHtml() {
    var gov = govColumnLoad(), u = U();
    if (S.cap === null || isNaN(S.cap)) {
      return '<div class="verdict neutral"><span class="ico">▤</span>'
        + '<div>Governing column load<br><span class="big">' + fmtForce(gov.value) + " " + u.force
        + '</span> <span class="sub" style="color:var(--ink-faint)">(factored)</span></div></div>';
    }
    var ok = gov.value <= S.cap;
    return '<div class="verdict ' + (ok ? "ok" : "bad") + '">'
      + '<span class="ico">' + (ok ? "✓" : "✕") + '</span>'
      + "<div>" + (ok ? "Applicable" : "Exceeds capacity")
      + '<br><span class="big">' + fmtForce(gov.value) + " " + u.force + "</span> "
      + "required vs " + fmtForce(S.cap) + " " + u.force + " capacity</div></div>";
  }

  // wall: force-level selector + point-load table for the selected governing level
  function wallResults() {
    var rows = wallRows(), w = DATA.walls[wallKey(S.height, S.levels)];
    if (S.force === null || !rows.some(function (r) { return r.lvl === S.force; }))
      S.force = rows.length ? rows[0].lvl : 1;

    var html = '<div class="forcebar"><div class="lab">Force level — attachment level taken at its maximum live load</div>'
      + '<div class="chips small" id="chips-force">';
    rows.forEach(function (r) {
      var h = w.lhEU && w.lhEU[r.lvl];
      html += '<button type="button" data-force="' + r.lvl + '" aria-pressed="' + (r.lvl === S.force) + '">'
        + "Level " + r.lvl + (h ? " · " + fmtLen(h) : "") + "</button>";
    });
    html += "</div></div>";

    var row = rows.filter(function (r) { return r.lvl === S.force; })[0];
    html += pointTable(row, w);
    return html;
  }

  function grouptags() {
    return '<span class="grouptag tag-dl">Dead load</span> &nbsp; <span class="grouptag tag-ll">Live load</span>';
  }

  function pointTable(row, w) {
    // Points: Base Z (R only), Base X (R only), then each level (R at level + L at column)
    var rowsHtml = "";
    // base vertical
    rowsHtml += trPoint("Base — vertical (Z)", "RZ0", null, row);
    rowsHtml += trPoint("Base — horizontal (X)", "RX0", null, row);
    for (var lv = 1; lv <= w.levels; lv++) {
      var h = w.lhEU && w.lhEU[lv];
      rowsHtml += trPoint("Level " + lv + (h ? " · " + fmtLen(h) : ""), "RX" + lv, "LX" + lv, row);
    }
    return tableShell(rowsHtml);
  }

  function tableShell(rowsHtml) {
    return '<div class="scroller"><table class="loads">'
      + "<thead><tr>"
      + '<th class="pt">Attachment point</th>'
      + '<th><div class="colhdr grp-dl">R · DL<small>on 1 ACS axis</small></div></th>'
      + '<th><div class="colhdr grp-ll">R · LL<small>on 1 ACS axis</small></div></th>'
      + '<th><div class="colhdr grp-dl">L · DL<small>on building column</small></div></th>'
      + '<th><div class="colhdr grp-ll">L · LL<small>on building column</small></div></th>'
      + "</tr></thead><tbody>" + rowsHtml + "</tbody></table></div>";
  }

  function trPoint(label, rKey, lKey, row) {
    var rdl = rKey ? pick(row, rKey + "DL") : undefined;
    var rll = rKey ? pick(row, rKey + "LL") : undefined;
    var ldl = lKey ? pick(row, lKey + "DL") : undefined;
    var lll = lKey ? pick(row, lKey + "LL") : undefined;
    return "<tr><td class=\"pt\">" + label + "</td>"
      + cellOrDash(rdl, "DL", "grp-dl")
      + cellOrDash(rll, "LL", "grp-ll")
      + cellOrDash(ldl, "DL", "grp-dl")
      + cellOrDash(lll, "LL", "grp-ll") + "</tr>";
  }

  function cellOrDash(v, kind, cls) {
    if (v === undefined || v === null) return '<td class="num" style="color:var(--ink-faint)">–</td>';
    return cell(v, kind, cls);
  }

  function boulderTable() {
    var b = boulderRow();
    var rowsHtml = trPoint("Base — vertical (Z)", "RZ0", null, b)
      + trPoint("Attachment — horizontal (X)", "RX1", "LX1", b);
    return tableShell(rowsHtml);
  }

  function wireForceBar() {
    var bar = document.getElementById("chips-force");
    if (!bar) return;
    bar.querySelectorAll("button").forEach(function (b) {
      b.onclick = function () { S.force = Number(b.getAttribute("data-force")); renderResults(); };
    });
  }

  function legendHtml() {
    return '<div class="legend">'
      + '<div><h3>Coordinate system &amp; symbols</h3><dl>'
      + "<dt>R</dt><dd>Load on one axis of the ACS — base points and single-axis attachment points.</dd>"
      + "<dt>L</dt><dd>Load on a building column / frame, with the column span A taken into account. Focus on these for the existing structure.</dd>"
      + "<dt>Z0</dt><dd>Vertical component at the base.</dd>"
      + "<dt>X0 / X1 / X2 / X3</dt><dd>Horizontal component at the base (X0) and at attachment level 1, 2, 3.</dd>"
      + "<dt>DL / LL</dt><dd>Dead load / Live load (climber load per EN 12572).</dd>"
      + "</dl></div>"
      + '<div class="schematic">' + schematicSvg() + "</div></div>";
  }

  function schematicSvg() {
    return '<svg viewBox="0 0 360 240" role="img" aria-label="Overhang X and span A schematic">'
      + '<defs><marker id="ah" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">'
      + '<path d="M0,0 L6,3 L0,6 z" fill="#0b5cab"/></marker></defs>'
      + '<rect x="0" y="0" width="360" height="240" fill="none"/>'
      // ground
      + '<line x1="20" y1="210" x2="340" y2="210" stroke="#b9c5d1" stroke-width="2"/>'
      // existing columns
      + '<line x1="70" y1="60" x2="70" y2="210" stroke="#8394a4" stroke-width="4"/>'
      + '<line x1="200" y1="60" x2="200" y2="210" stroke="#8394a4" stroke-width="4"/>'
      // climbing surface profile (overhang)
      + '<path d="M70,210 L110,210 L90,60 L70,60 Z" fill="#e5eefb" stroke="#0b5cab" stroke-width="1.5"/>'
      // overhang X dimension
      + '<line x1="90" y1="45" x2="110" y2="45" stroke="#0b5cab" stroke-width="1.5" marker-start="url(#ah)" marker-end="url(#ah)"/>'
      + '<text x="100" y="38" fill="#0b5cab" font-size="13" font-weight="700" text-anchor="middle">X</text>'
      // span A dimension
      + '<line x1="70" y1="228" x2="200" y2="228" stroke="#0b5cab" stroke-width="1.5" marker-start="url(#ah)" marker-end="url(#ah)"/>'
      + '<text x="135" y="224" fill="#0b5cab" font-size="13" font-weight="700" text-anchor="middle">A</text>'
      // attachment points
      + '<circle cx="90" cy="60" r="4" fill="#b4530a"/>'
      + '<circle cx="86" cy="135" r="4" fill="#b4530a"/>'
      + '<text x="120" y="64" fill="#4a5b6b" font-size="11">L / attachment level</text>'
      + '<text x="215" y="150" fill="#8394a4" font-size="11">existing columns</text>'
      + "</svg>";
  }

  function notesHtml() {
    var items = DATA.meta.notes.map(function (n) { return "<li>" + n + "</li>"; }).join("");
    var u = U();
    return '<div class="notes"><h3 style="font-size:12px;text-transform:uppercase;letter-spacing:.8px;color:var(--ink-faint);margin:0 0 4px">Notes</h3>'
      + "<ol>" + items
      + '<li class="code">Factors used: dead load ×' + u.dl + ", live load ×" + u.ll
      + " — code: " + (S.type === "wall" ? u.codeWall : u.codeBoulder) + "</li>"
      + "</ol>"
      + '<p class="footnote">Reproduces the Walltopia 2026 preliminary-loads tables. Preliminary sizing only — the manual for use is an inseparable part of these tables.</p></div>';
  }

  // ---- init ----
  S.height = 12; S.levels = 3; S.span = 6; S.overhang = 1; S.force = 1;
  document.getElementById("cap-input").addEventListener("input", function (e) {
    var v = e.target.value.trim();
    S.cap = v === "" ? null : Number(v);
    renderResults();
  });
  document.getElementById("chk-factored").addEventListener("change", function (e) {
    S.factored = e.target.checked; renderResults();
  });
  clampAndRender();
})();
