import { useEffect, useState } from "react";
import { ScrollView, View, Text, TextInput, Switch, StyleSheet } from "react-native";
import { C, FD, FB } from "../theme";
import { Segmented, Chips, Field, SectionTitle, Hint, Card, Btn } from "../components/ui";
import { useAuth } from "../auth";
import { api } from "../api";
import * as L from "../lib/loads";

const lenChip = (units) => (v) => (units === "EU" ? String(v) : String(Math.round(v * 3.28084)));

export default function CalculatorScreen({ data, initialProject, onProjectChange, onExit, requireLogin }) {
  const { user } = useAuth();
  const [s, setS] = useState(() =>
    L.clampState(data, initialProject
      ? { ...L.initialState(), ...initialProject.input, cap: initialProject.input?.capacity ?? null }
      : L.initialState()));
  const [project, setProject] = useState(initialProject || null);

  const um = L.unitMeta(data, s.units);
  const opt = L.optionsFor(data, s);
  const update = (patch) => setS((p) => L.clampState(data, { ...p, ...patch }));
  const setUnits = (v) => setS((p) => L.clampState(data, { ...p, units: v, cap: v !== p.units ? null : p.cap }));
  const unitLbl = s.units === "EU" ? "m" : "ft";

  const have = L.hasResult(data, s);
  const gov = L.govColumnLoad(data, s);
  const vd = L.verdict(data, s);
  const rows = L.pointRows(data, s);
  const forceLevels = L.forceLevels(data, s);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
      <Card>
        <SectionTitle>Your inputs</SectionTitle>
        <Field label="Units">
          <Segmented value={s.units} onChange={setUnits}
            options={[{ label: "Metric (kN·m)", value: "EU" }, { label: "Imperial (lb·ft)", value: "USA" }]} />
        </Field>
        <Field label="Structure type" hint={s.type === "wall" ? "with protection points" : "without protection points"}>
          <Segmented value={s.type} onChange={(v) => update({ type: v })}
            options={[{ label: "Climbing wall", value: "wall" }, { label: "Boulder wall", value: "boulder" }]} />
        </Field>
        <Field label={`Climbing-surface height (${unitLbl})`}>
          <Chips values={opt.heights} value={s.height} onChange={(v) => update({ height: v })} label={lenChip(s.units)} />
        </Field>
        {s.type === "wall" && (
          <Field label="Attachment scheme">
            <Chips small values={opt.schemes} value={s.levels} onChange={(v) => update({ levels: v })}
              label={(v) => v + (v === 1 ? " level" : " levels")} />
          </Field>
        )}
        <Field label={`Column span · A (${unitLbl})`}>
          <Chips values={opt.spans} value={s.span} onChange={(v) => update({ span: v })} label={lenChip(s.units)} />
        </Field>
        <Field label={`Overhang · X (${unitLbl})`}>
          <Chips values={opt.overhangs} value={s.overhang} onChange={(v) => update({ overhang: v })} label={lenChip(s.units)} />
        </Field>

        <View style={{ height: 1, backgroundColor: C.line, marginVertical: 6 }} />
        <Field label="Check against your structure (optional)">
          <View style={{ flexDirection: "row" }}>
            <TextInput style={st.capInput} keyboardType="numeric" placeholder="allowable column load"
              value={s.cap == null ? "" : String(s.cap)}
              onChangeText={(t) => update({ cap: t === "" ? null : Number(t) })} />
            <View style={st.capUnit}><Text style={{ color: "#fff", fontFamily: FD[700] }}>{um.force}</Text></View>
          </View>
        </Field>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Switch value={s.factored} onValueChange={(v) => update({ factored: v })} trackColor={{ true: C.red }} />
          <Text style={{ color: C.inkSoft, fontSize: 13, fontFamily: FB[400], flex: 1 }}>Show factored design values (×{um.dl} DL, ×{um.ll} LL)</Text>
        </View>
      </Card>

      <Card style={{ borderTopColor: C.red, borderTopWidth: 3 }}>
        <ProjectBar data={data} state={s} user={user} project={project} requireLogin={requireLogin}
          onSaved={(p) => { setProject(p); onProjectChange && onProjectChange(p); }}
          onExit={() => { setProject(null); onExit && onExit(); }} />

        {!have ? (
          <Text style={{ color: C.inkFaint, textAlign: "center", paddingVertical: 40, fontFamily: FB[400] }}>No table entry for this combination.</Text>
        ) : (
          <>
            <Text style={st.title}>{L.titleFor(s)}</Text>
            <Text style={st.sub}>
              {(s.type === "wall" ? s.levels + (s.levels === 1 ? " attachment level" : " attachment levels") : "single attachment")}
              {` · A = ${L.fmtLen(s.span, s.units)} · X = ${L.fmtLen(s.overhang, s.units)} · ${um.force}${s.factored ? " · factored" : ""}`}
            </Text>

            <View style={[st.verdict, vd === "ok" ? st.vOk : vd === "bad" ? st.vBad : st.vNeutral]}>
              <Text style={{ fontFamily: FB[700], fontSize: 16, color: vd === "ok" ? C.ok : vd === "bad" ? C.bad : C.inkSoft }}>
                {vd === "neutral" ? "Governing column load" : vd === "ok" ? "✓ Applicable" : "✕ Exceeds capacity"}
              </Text>
              <Text style={{ fontFamily: FB[700], fontSize: 18, color: C.ink, marginTop: 2, fontVariant: ["tabular-nums"] }}>{L.fmtForce(gov, s.units)} {um.force}
                <Text style={{ color: C.inkFaint, fontFamily: FB[400], fontSize: 13 }}>{vd === "neutral" ? "  (factored)" : `  vs ${L.fmtForce(s.cap, s.units)} capacity`}</Text>
              </Text>
            </View>

            {s.type === "wall" && forceLevels.length > 0 && (
              <View style={{ marginBottom: 10 }}>
                <Text style={st.forceLab}>Force level — level taken at max live load</Text>
                <Chips small values={forceLevels.map((f) => f.lvl)} value={s.force} onChange={(v) => update({ force: v })}
                  label={(lvl) => { const f = forceLevels.find((x) => x.lvl === lvl); return "L" + lvl + (f && f.height ? " · " + L.fmtLen(f.height, s.units) : ""); }} />
              </View>
            )}

            <PointTable rows={rows} s={s} um={um} />
            <Text style={st.legend}>R = load on one ACS axis · L = load on a building column (span-adjusted). DL/LL = dead/live load. Preliminary — factor per the acting standard.</Text>
          </>
        )}
      </Card>
    </ScrollView>
  );
}

function PointTable({ rows, s, um }) {
  const cell = (v, kind, color) => {
    const val = v == null ? "–" : L.fmtForce(L.factored(v, kind, s, um), s.units);
    return <Text style={[st.cell, { color: v == null ? C.inkFaint : color }]}>{val}</Text>;
  };
  return (
    <View style={{ marginTop: 6 }}>
      <View style={[st.trow, { borderBottomColor: C.navy, borderBottomWidth: 2 }]}>
        <Text style={[st.hPt]}>Point</Text>
        <Text style={[st.hCell, { color: C.dl }]}>R·DL</Text>
        <Text style={[st.hCell, { color: C.ll }]}>R·LL</Text>
        <Text style={[st.hCell, { color: C.dl }]}>L·DL</Text>
        <Text style={[st.hCell, { color: C.ll }]}>L·LL</Text>
      </View>
      {rows.map((r, i) => (
        <View key={i} style={st.trow}>
          <Text style={st.ptCell}>{r.label}</Text>
          {cell(r.rDL, "DL", C.dl)}
          {cell(r.rLL, "LL", C.ll)}
          {cell(r.lDL, "DL", C.dl)}
          {cell(r.lLL, "LL", C.ll)}
        </View>
      ))}
    </View>
  );
}

const currentInput = (s) => ({ units: s.units, type: s.type, height: s.height, levels: s.levels, overhang: s.overhang, span: s.span, force: s.force, factored: s.factored, capacity: s.cap });

function ProjectBar({ data, state, user, project, onSaved, onExit, requireLogin }) {
  const [showSave, setShowSave] = useState(false);
  const [name, setName] = useState("");
  const [tags, setTags] = useState("");
  const [props, setProps] = useState([{ key: "", value: "" }]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [questions, setQuestions] = useState([]);
  const [qmsg, setQmsg] = useState("");

  useEffect(() => {
    if (project) api.listQuestions(project.id).then((r) => setQuestions(r.questions || [])).catch(() => {});
  }, [project]);

  const openSave = (asNew) => {
    if (!user) { requireLogin(); return; }
    setName(project && !asNew ? project.name : L.titleFor(state));
    setTags(project && !asNew ? (project.tags || []).join(", ") : "");
    setProps(project && !asNew && project.properties?.length ? project.properties : [{ key: "", value: "" }]);
    setShowSave(asNew ? "saveas" : "save");
  };

  async function save() {
    if (!name.trim()) { setMsg("Enter a project name."); return; }
    setBusy(true); setMsg("");
    const payload = {
      name: name.trim(),
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      properties: props.filter((p) => p.key.trim()).map((p) => ({ key: p.key.trim(), value: p.value.trim() })),
      input: currentInput(state), snapshot: L.snapshot(data, state),
    };
    try {
      const editing = project && showSave === "save";
      const res = editing ? await api.updateProject(project.id, payload) : await api.createProject(payload);
      setShowSave(false); onSaved(res.project);
    } catch (e) { setMsg(e.message || "Could not save."); }
    setBusy(false);
  }

  async function saveChanges() {
    if (!user || !project) return;
    setBusy(true);
    try {
      const res = await api.updateProject(project.id, { name: project.name, tags: project.tags, properties: project.properties, input: currentInput(state), snapshot: L.snapshot(data, state) });
      onSaved(res.project); setMsg("Updated.");
    } catch (e) { setMsg(e.message); }
    setBusy(false);
  }

  async function sendQuestion() {
    if (q.trim().length < 5) { setQmsg("Write your question."); return; }
    try { await api.askQuestion(project.id, q.trim()); setQ(""); setQmsg("Sent to Walltopia."); const r = await api.listQuestions(project.id); setQuestions(r.questions || []); }
    catch (e) { setQmsg(e.message); }
  }

  if (showSave) {
    return (
      <View style={{ marginBottom: 14, backgroundColor: C.surface2, borderColor: C.line, borderWidth: 1, padding: 14 }}>
        <SectionTitle>{showSave === "saveas" ? "Save as new project" : project ? "Update project" : "Save project"}</SectionTitle>
        <Text style={st.saveLbl}>Project name</Text>
        <TextInput style={st.saveInput} value={name} onChangeText={setName} />
        <Text style={st.saveLbl}>Tags (comma separated)</Text>
        <TextInput style={st.saveInput} value={tags} onChangeText={setTags} placeholder="gym, EU, seismic zone 2" />
        <Text style={st.saveLbl}>Custom properties</Text>
        {props.map((p, i) => (
          <View key={i} style={{ flexDirection: "row", gap: 6, marginBottom: 6 }}>
            <TextInput style={[st.saveInput, { flex: 1, marginBottom: 0 }]} placeholder="Property" value={p.key} onChangeText={(t) => setProps((a) => a.map((r, j) => (j === i ? { ...r, key: t } : r)))} />
            <TextInput style={[st.saveInput, { flex: 1.3, marginBottom: 0 }]} placeholder="Value" value={p.value} onChangeText={(t) => setProps((a) => a.map((r, j) => (j === i ? { ...r, value: t } : r)))} />
          </View>
        ))}
        <Btn small title="+ Add property" onPress={() => setProps((a) => [...a, { key: "", value: "" }])} style={{ alignSelf: "flex-start", marginTop: 4 }} />
        {msg ? <Text style={{ color: C.bad, marginTop: 8, fontFamily: FB[400] }}>{msg}</Text> : null}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
          <Btn title={busy ? "Saving…" : "Save"} variant="primary" onPress={save} disabled={busy} style={{ flex: 1 }} />
          <Btn title="Cancel" onPress={() => setShowSave(false)} style={{ flex: 1 }} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ marginBottom: 14, paddingBottom: 14, borderBottomColor: C.lineStrong, borderBottomWidth: 1, borderStyle: "dashed" }}>
      {!user ? (
        <>
          <Btn small title="Save as project" variant="primary" onPress={() => requireLogin()} style={{ alignSelf: "flex-start" }} />
          <Hint>Log in to save this design, tag it, and ask Walltopia about it.</Hint>
        </>
      ) : project ? (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <Btn small title="← Exit" onPress={onExit} />
            <View style={{ backgroundColor: C.navy, paddingHorizontal: 9, paddingVertical: 4 }}><Text style={{ color: "#fff", fontFamily: FD[800], fontSize: 10.5, textTransform: "uppercase" }}>Editing · {project.name}</Text></View>
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            <Btn small title="Save changes" variant="primary" onPress={saveChanges} disabled={busy} />
            <Btn small title="Save as new" onPress={() => openSave(true)} />
          </View>
          {msg ? <Text style={{ color: C.ok, marginTop: 6, fontFamily: FB[400] }}>{msg}</Text> : null}
          <View style={{ marginTop: 14, backgroundColor: "#fff", borderColor: C.line, borderWidth: 1, padding: 12 }}>
            <SectionTitle>Ask Walltopia about this project</SectionTitle>
            <TextInput style={[st.saveInput, { minHeight: 70, textAlignVertical: "top" }]} multiline value={q} onChangeText={setQ} placeholder="e.g. Is this valid for a 6 m raster in seismic zone 2?" />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 }}>
              <Btn small title="Send question" variant="primary" onPress={sendQuestion} />
              {qmsg ? <Text style={{ color: C.inkSoft, fontFamily: FB[400] }}>{qmsg}</Text> : null}
            </View>
            {questions.map((qq) => (
              <View key={qq.id} style={{ borderLeftColor: C.navy, borderLeftWidth: 3, backgroundColor: C.surface2, padding: 9, marginTop: 8 }}>
                <Text style={{ color: C.inkSoft, fontSize: 13, fontFamily: FB[400] }}>{qq.message}</Text>
                <Text style={{ color: C.inkFaint, fontSize: 11, marginTop: 3, fontFamily: FB[400] }}>{new Date(qq.createdAt).toLocaleDateString()} · {qq.status}</Text>
              </View>
            ))}
          </View>
        </>
      ) : (
        <>
          <Btn small title="Save as project" variant="primary" onPress={() => openSave(false)} style={{ alignSelf: "flex-start" }} />
          <Hint>Save this design with tags & custom properties.</Hint>
        </>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  title: { fontFamily: FD[900], fontSize: 22, color: C.ink, letterSpacing: -0.4 },
  sub: { fontSize: 12, fontFamily: FB[400], color: C.inkFaint, marginTop: 4, marginBottom: 12 },
  verdict: { padding: 12, borderLeftWidth: 4, marginBottom: 16 },
  vOk: { backgroundColor: C.okSoft, borderLeftColor: C.ok },
  vBad: { backgroundColor: C.badSoft, borderLeftColor: C.red },
  vNeutral: { backgroundColor: C.surface2, borderLeftColor: C.navy },
  forceLab: { fontSize: 11, fontFamily: FD[800], textTransform: "uppercase", letterSpacing: 0.6, color: C.inkFaint, marginBottom: 8 },
  trow: { flexDirection: "row", alignItems: "center", borderBottomColor: C.line, borderBottomWidth: 1, paddingVertical: 9 },
  hPt: { flex: 2.4, fontSize: 10.5, fontFamily: FD[800], textTransform: "uppercase", color: C.inkFaint },
  hCell: { flex: 1, fontSize: 10.5, fontFamily: FD[800], textAlign: "right" },
  ptCell: { flex: 2.4, fontSize: 12.5, fontFamily: FB[700], color: C.ink },
  cell: { flex: 1, fontSize: 12.5, fontFamily: FB[400], textAlign: "right", fontVariant: ["tabular-nums"] },
  legend: { fontSize: 11.5, fontFamily: FB[400], color: C.inkFaint, marginTop: 12, lineHeight: 16 },
  capInput: { flex: 1, borderWidth: 1, borderColor: C.lineStrong, paddingHorizontal: 11, paddingVertical: 10, fontSize: 14, fontFamily: FB[400] },
  capUnit: { backgroundColor: C.navy, paddingHorizontal: 13, justifyContent: "center" },
  saveLbl: { fontSize: 11.5, fontFamily: FB[700], textTransform: "uppercase", letterSpacing: 0.4, color: C.inkSoft, marginBottom: 6, marginTop: 4 },
  saveInput: { borderWidth: 1, borderColor: C.lineStrong, backgroundColor: "#fff", paddingHorizontal: 11, paddingVertical: 9, fontSize: 14, marginBottom: 10, fontFamily: FB[400] },
});
