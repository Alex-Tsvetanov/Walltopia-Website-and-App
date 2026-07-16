import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useLoads } from "../lib/useLoads";
import { useAuth } from "../auth";
import { api } from "../api";
import * as L from "../lib/loads";
import { Seg, Chips } from "../components/Controls";
import ProjectBar from "../components/ProjectBar";

const lenChip = (units) => (v) => (units === "EU" ? v : Math.round(v * 3.28084));

function Cell({ v, kind, s, um, cls }) {
  if (v === undefined || v === null) return <td className="num" style={{ color: "var(--ink-faint)" }}>–</td>;
  return <td className={"num " + cls}>{L.fmtForce(L.factored(v, kind, s, um), s.units)}</td>;
}

export default function Calculator() {
  const { data } = useLoads();
  const { requireAuth, ready } = useAuth();
  const [s, setS] = useState(L.initialState());
  const [project, setProject] = useState(null);
  const [params, setParams] = useSearchParams();
  const projectId = params.get("project");

  useEffect(() => { if (data) setS((prev) => L.clampState(data, prev)); }, [data]);

  useEffect(() => {
    if (!projectId || !data || !ready) return; // wait for the session check before deciding to prompt login
    let cancelled = false;
    (async () => {
      try {
        await requireAuth("login");
        const { project: p } = await api.getProject(projectId);
        if (cancelled) return;
        setProject(p);
        setS(L.clampState(data, { ...L.initialState(), ...p.input, cap: p.input?.capacity ?? null }));
      } catch (e) { /* cancelled or not found */ }
    })();
    return () => { cancelled = true; };
  }, [data, projectId, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data) return <main className="layout"><section className="card results"><div className="empty">Loading load tables…</div></section></main>;

  const um = L.unitMeta(data, s.units);
  const opt = L.optionsFor(data, s);
  const update = (patch) => setS((prev) => L.clampState(data, { ...prev, ...patch }));
  const setUnits = (v) => setS((prev) => L.clampState(data, { ...prev, units: v, cap: v !== prev.units ? null : prev.cap }));

  const have = L.hasResult(data, s);
  const gov = L.govColumnLoad(data, s);
  const vd = L.verdict(data, s);
  const rows = L.pointRows(data, s);
  const forceLevels = L.forceLevels(data, s);
  const unitLbl = s.units === "EU" ? "m" : "ft";

  const exitEditing = () => { setProject(null); setParams({}, { replace: true }); };
  const onSaved = (p) => { setProject(p); setParams({ project: p.id }, { replace: true }); };

  return (
    <main className="layout">
      {/* INPUTS */}
      <section className="card panel" aria-label="Inputs">
        <h2>Your inputs</h2>

        <div className="field">
          <label>Units</label>
          <Seg value={s.units} onChange={setUnits}
            options={[{ label: "Metric (kN · m)", value: "EU" }, { label: "Imperial (lb · ft)", value: "USA" }]} />
        </div>

        <div className="field">
          <label>Structure type</label>
          <Seg value={s.type} onChange={(v) => update({ type: v })}
            options={[{ label: "Climbing wall", value: "wall" }, { label: "Boulder wall", value: "boulder" }]} />
          <div className="hint">{s.type === "wall" ? "With protection points · " + um.codeWall : "Without protection points · " + um.codeBoulder}</div>
        </div>

        <div className="field">
          <label>Climbing-surface height <span className="hint">({unitLbl})</span></label>
          <Chips values={opt.heights} value={s.height} onChange={(v) => update({ height: v })} label={lenChip(s.units)} />
        </div>

        {s.type === "wall" && (
          <div className="field">
            <label>Attachment scheme <span className="hint">(levels of attachment by height)</span></label>
            <Chips small values={opt.schemes} value={s.levels} onChange={(v) => update({ levels: v })}
              label={(v) => v + (v === 1 ? " level" : " levels")} />
          </div>
        )}

        <div className="field">
          <label>Column span · A <span className="hint">({unitLbl}, between building columns)</span></label>
          <Chips values={opt.spans} value={s.span} onChange={(v) => update({ span: v })} label={lenChip(s.units)} />
        </div>

        <div className="field">
          <label>Overhang · X <span className="hint">({unitLbl}, top − bottom contour)</span></label>
          <Chips values={opt.overhangs} value={s.overhang} onChange={(v) => update({ overhang: v })} label={lenChip(s.units)} />
        </div>

        <div className="divider" />

        <div className="field" style={{ marginBottom: 10 }}>
          <label>Check against your structure <span className="hint">(optional)</span></label>
          <div className="caprow">
            <input type="number" inputMode="decimal" placeholder="allowable column load" min="0" step="any"
              value={s.cap ?? ""} onChange={(e) => update({ cap: e.target.value === "" ? null : Number(e.target.value) })} />
            <div className="unit">{um.force}</div>
          </div>
          <div className="hint" style={{ marginTop: 7 }}>Horizontal load one existing column / frame can carry.</div>
        </div>

        <label className="toggle-line">
          <input type="checkbox" checked={s.factored} onChange={(e) => update({ factored: e.target.checked })} />
          Show factored design values&nbsp;<span className="hint">(×{um.dl} DL, ×{um.ll} LL)</span>
        </label>
      </section>

      {/* RESULTS */}
      <section className="card results" aria-live="polite">
        <ProjectBar data={data} state={s} project={project} onSaved={onSaved} onExit={exitEditing} />

        {!have ? (
          <div className="empty">No table entry for this combination.</div>
        ) : (
          <>
            <div className="results-head">
              <div>
                <p className="title">{L.titleFor(s)}</p>
                <p className="sub">
                  {(s.type === "wall" ? s.levels + (s.levels === 1 ? " attachment level" : " attachment levels") : "single attachment")}
                  {" · span A = " + L.fmtLen(s.span, s.units) + " · overhang X = " + L.fmtLen(s.overhang, s.units)}
                  {" · characteristic values in " + um.force + (s.factored ? " · factored" : "")}
                </p>
              </div>
              <div className="spacer" />
              {vd === "neutral" ? (
                <div className="verdict neutral"><span className="ico">▤</span>
                  <div>Governing column load<br /><span className="big">{L.fmtForce(gov, s.units)} {um.force}</span>{" "}
                    <span style={{ color: "var(--ink-faint)" }}>(factored)</span></div>
                </div>
              ) : (
                <div className={"verdict " + vd}><span className="ico">{vd === "ok" ? "✓" : "✕"}</span>
                  <div>{vd === "ok" ? "Applicable" : "Exceeds capacity"}<br />
                    <span className="big">{L.fmtForce(gov, s.units)} {um.force}</span>{" "}
                    required vs {L.fmtForce(s.cap, s.units)} {um.force} capacity</div>
                </div>
              )}
            </div>

            {s.type === "wall" && forceLevels.length > 0 && (
              <div className="forcebar">
                <div className="lab">Force level — attachment level taken at its maximum live load</div>
                <Chips small values={forceLevels.map((f) => f.lvl)} value={s.force} onChange={(v) => update({ force: v })}
                  label={(lvl) => { const f = forceLevels.find((x) => x.lvl === lvl); return "Level " + lvl + (f && f.height ? " · " + L.fmtLen(f.height, s.units) : ""); }} />
              </div>
            )}

            <div className="scroller">
              <table className="loads">
                <thead><tr>
                  <th className="pt">Attachment point</th>
                  <th><div className="colhdr grp-dl">R · DL<small>on 1 ACS axis</small></div></th>
                  <th><div className="colhdr grp-ll">R · LL<small>on 1 ACS axis</small></div></th>
                  <th><div className="colhdr grp-dl">L · DL<small>on building column</small></div></th>
                  <th><div className="colhdr grp-ll">L · LL<small>on building column</small></div></th>
                </tr></thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i}>
                      <td className="pt">{r.label}</td>
                      <Cell v={r.rDL} kind="DL" s={s} um={um} cls="grp-dl" />
                      <Cell v={r.rLL} kind="LL" s={s} um={um} cls="grp-ll" />
                      <Cell v={r.lDL} kind="DL" s={s} um={um} cls="grp-dl" />
                      <Cell v={r.lLL} kind="LL" s={s} um={um} cls="grp-ll" />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Legend units={s.units} />
            <Notes data={data} s={s} um={um} />
          </>
        )}
      </section>
    </main>
  );
}

function Legend() {
  return (
    <div className="legend">
      <div>
        <h3>Coordinate system &amp; symbols</h3>
        <dl>
          <dt>R</dt><dd>Load on one axis of the ACS — base points and single-axis attachment points.</dd>
          <dt>L</dt><dd>Load on a building column / frame, with the column span A taken into account. Focus on these for the existing structure.</dd>
          <dt>Z0</dt><dd>Vertical component at the base.</dd>
          <dt>X0 / X1 / X2 / X3</dt><dd>Horizontal component at the base (X0) and at attachment level 1, 2, 3.</dd>
          <dt>DL / LL</dt><dd>Dead load / Live load (climber load per EN 12572).</dd>
        </dl>
      </div>
      <div className="schematic">
        <svg viewBox="0 0 360 240" role="img" aria-label="Overhang X and span A schematic">
          <defs><marker id="ah" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#ec1c24" /></marker></defs>
          <line x1="20" y1="210" x2="340" y2="210" stroke="#c7cad0" strokeWidth="2" />
          <line x1="70" y1="60" x2="70" y2="210" stroke="#2c2e3d" strokeWidth="4" />
          <line x1="200" y1="60" x2="200" y2="210" stroke="#2c2e3d" strokeWidth="4" />
          <path d="M70,210 L110,210 L90,60 L70,60 Z" fill="#fdebec" stroke="#ec1c24" strokeWidth="1.5" />
          <line x1="90" y1="45" x2="110" y2="45" stroke="#ec1c24" strokeWidth="1.5" markerStart="url(#ah)" markerEnd="url(#ah)" />
          <text x="100" y="38" fill="#ec1c24" fontSize="13" fontWeight="800" textAnchor="middle">X</text>
          <line x1="70" y1="228" x2="200" y2="228" stroke="#ec1c24" strokeWidth="1.5" markerStart="url(#ah)" markerEnd="url(#ah)" />
          <text x="135" y="224" fill="#ec1c24" fontSize="13" fontWeight="800" textAnchor="middle">A</text>
          <circle cx="90" cy="60" r="4" fill="#ec1c24" /><circle cx="86" cy="135" r="4" fill="#ec1c24" />
          <text x="120" y="64" fill="#454955" fontSize="11">L / attachment level</text>
          <text x="215" y="150" fill="#878d99" fontSize="11">existing columns</text>
        </svg>
      </div>
    </div>
  );
}

function Notes({ data, s, um }) {
  return (
    <div className="notes">
      <h3 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: ".8px", color: "var(--ink-faint)", margin: "0 0 4px" }}>Notes</h3>
      <ol>
        {data.meta.notes.map((n, i) => <li key={i}>{n}</li>)}
        <li className="code">Factors used: dead load ×{um.dl}, live load ×{um.ll} — code: {s.type === "wall" ? um.codeWall : um.codeBoulder}</li>
      </ol>
      <p className="footnote">Reproduces the Walltopia 2026 preliminary-loads tables. Preliminary sizing only — the manual for use is an inseparable part of these tables.</p>
    </div>
  );
}
