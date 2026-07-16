/* My Projects dashboard: filterable list of the user's saved designs. */
(function () {
  "use strict";
  var body = document.getElementById("dash-body");
  var sub = document.getElementById("dash-sub");
  var filters = { q: "", tag: "", sort: "updated" };
  var debounce;

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function guestView() {
    sub.textContent = "Saved load designs";
    body.innerHTML =
      '<div class="dash-guest"><h2>Log in to see your projects</h2>'
      + "<p>Save any calculation as a project, organise it with tags and custom properties, reopen it to tweak the numbers, and send questions to Walltopia about a design.</p>"
      + '<button class="btn primary" id="dg-login">Log in or register</button></div>';
    body.querySelector("#dg-login").onclick = function () { window.WTAuth.open("register"); };
  }

  async function load() {
    var user = window.WTAuth && window.WTAuth.current();
    if (!user) return guestView();
    try {
      var tagsRes = await window.WTApi.listTags();
      var res = await window.WTApi.listProjects(filters);
      render(res.projects, tagsRes.tags || [], user);
    } catch (e) {
      body.innerHTML = '<div class="dash-empty">' + esc(e.message || "Could not load projects.") + "</div>";
    }
  }

  function render(projects, tags, user) {
    sub.textContent = projects.length
      ? projects.length + (projects.length === 1 ? " project" : " projects")
      : "No projects yet";

    var toolbar =
      '<div class="dash-toolbar">'
      + '<input type="search" id="f-q" placeholder="Search name, tags, properties…" value="' + esc(filters.q) + '" />'
      + '<span class="lbl">Tag</span><select id="f-tag"><option value="">All</option>'
      + tags.map(function (t) { return '<option value="' + esc(t) + '"' + (t === filters.tag ? " selected" : "") + ">" + esc(t) + "</option>"; }).join("")
      + "</select>"
      + '<span class="lbl">Sort</span><select id="f-sort">'
      + [["updated", "Recently updated"], ["created", "Newest"], ["name", "Name A–Z"]].map(function (o) {
          return '<option value="' + o[0] + '"' + (o[0] === filters.sort ? " selected" : "") + ">" + o[1] + "</option>";
        }).join("")
      + "</select></div>";

    var grid;
    if (!projects.length) {
      grid = '<div class="dash-empty">'
        + (filters.q || filters.tag ? "No projects match these filters. " : "You haven't saved any projects yet. ")
        + '<a href="index.html">Open the calculator</a> and save a design.</div>';
    } else {
      grid = '<div class="proj-grid">' + projects.map(card).join("") + "</div>";
    }
    body.innerHTML = toolbar + grid;
    wireToolbar();
    wireCards();
  }

  function card(p) {
    var snap = p.snapshot || {};
    var when = p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : "";
    var gov = (typeof snap.governing === "number")
      ? '<div class="snap">Governing column load <b>' + snap.governing + " " + esc(snap.unit || "") + "</b>"
        + (snap.verdict && snap.verdict !== "neutral" ? " · " + (snap.verdict === "ok" ? "applicable" : "exceeds capacity") : "") + "</div>"
      : "";
    var tagChips = (p.tags || []).map(function (t) { return '<span class="tag-chip" data-tag="' + esc(t) + '">' + esc(t) + "</span>"; }).join("");
    var propChips = (p.properties || []).slice(0, 4).map(function (pr) {
      return '<span class="tag-chip prop">' + esc(pr.key) + (pr.value ? ": " + esc(pr.value) : "") + "</span>";
    }).join("");
    return '<div class="proj-card" data-id="' + p.id + '">'
      + "<h3>" + esc(p.name) + "</h3>"
      + '<div class="meta">' + esc(snap.title || "") + (when ? " · updated " + when : "") + "</div>"
      + gov
      + (tagChips ? '<div class="tags">' + tagChips + "</div>" : "")
      + (propChips ? '<div class="tags">' + propChips + "</div>" : "")
      + '<div class="card-actions"><a class="btn small primary" href="index.html?project=' + p.id + '">Open &amp; edit</a>'
      + '<button class="btn small" data-del="' + p.id + '">Delete</button></div>'
      + "</div>";
  }

  function wireToolbar() {
    var q = document.getElementById("f-q");
    if (q) q.oninput = function () { clearTimeout(debounce); debounce = setTimeout(function () { filters.q = q.value.trim(); load(); }, 300); };
    var tag = document.getElementById("f-tag");
    if (tag) tag.onchange = function () { filters.tag = tag.value; load(); };
    var sort = document.getElementById("f-sort");
    if (sort) sort.onchange = function () { filters.sort = sort.value; load(); };
  }

  function wireCards() {
    body.querySelectorAll(".tag-chip[data-tag]").forEach(function (c) {
      c.onclick = function () { filters.tag = c.getAttribute("data-tag"); load(); };
    });
    body.querySelectorAll("[data-del]").forEach(function (b) {
      b.onclick = async function () {
        var id = b.getAttribute("data-del");
        var card = b.closest(".proj-card");
        var name = card ? card.querySelector("h3").textContent : "this project";
        if (!confirm('Delete "' + name + '"? This also removes its questions and cannot be undone.')) return;
        b.disabled = true;
        try { await window.WTApi.deleteProject(id); load(); }
        catch (e) { alert(e.message || "Could not delete."); b.disabled = false; }
      };
    });
  }

  window.WTAuth ? window.WTAuth.onChange(load) : null;
  // initial (auth-ui fires wtauth:change once it resolves the session; also try now)
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", load);
  else load();
})();
