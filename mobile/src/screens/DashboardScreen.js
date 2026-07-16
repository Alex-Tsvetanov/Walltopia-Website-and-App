import { useEffect, useRef, useState } from "react";
import { ScrollView, View, Text, TextInput, Pressable, Alert, StyleSheet } from "react-native";
import { C, FD, FB } from "../theme";
import { Btn, Chips, Card } from "../components/ui";
import { useAuth } from "../auth";
import { api } from "../api";

export default function DashboardScreen({ onOpen, requireLogin }) {
  const { user, ready } = useAuth();
  const [projects, setProjects] = useState([]);
  const [tags, setTags] = useState([]);
  const [filters, setFilters] = useState({ q: "", tag: "", sort: "updated" });
  const [loading, setLoading] = useState(true);
  const debounce = useRef();

  async function load(f = filters) {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      const [t, p] = await Promise.all([api.listTags(), api.listProjects(f)]);
      setTags(t.tags || []); setProjects(p.projects || []);
    } catch (e) { setProjects([]); }
    setLoading(false);
  }
  useEffect(() => { if (ready) load(); }, [user, ready]); // eslint-disable-line

  const setQ = (q) => { setFilters((f) => ({ ...f, q })); clearTimeout(debounce.current); debounce.current = setTimeout(() => load({ ...filters, q }), 300); };
  const setTag = (tag) => { const f = { ...filters, tag: filters.tag === tag ? "" : tag }; setFilters(f); load(f); };
  const setSort = (sort) => { const f = { ...filters, sort }; setFilters(f); load(f); };

  const del = (p) => Alert.alert("Delete project", `Delete "${p.name}"? This also removes its questions and cannot be undone.`, [
    { text: "Cancel", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: async () => { try { await api.deleteProject(p.id); load(); } catch (e) { Alert.alert("Error", e.message); } } },
  ]);

  if (ready && !user) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, padding: 20, justifyContent: "center" }}>
        <Card style={{ borderTopColor: C.red, borderTopWidth: 3, alignItems: "center", paddingVertical: 40 }}>
          <Text style={{ fontFamily: FD[900], fontSize: 22, marginBottom: 8, textAlign: "center" }}>Log in to see your projects</Text>
          <Text style={{ color: C.inkSoft, textAlign: "center", marginBottom: 20, fontFamily: FB[400] }}>Save calculations, organise them with tags and custom properties, reopen to tweak, and ask Walltopia about a design.</Text>
          <Btn title="Log in or register" variant="primary" onPress={() => requireLogin("register")} />
        </Card>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
      <Text style={{ fontFamily: FD[900], fontSize: 26, letterSpacing: -1 }}>My Projects</Text>
      <Text style={{ color: C.inkFaint, marginBottom: 16, fontFamily: FB[400] }}>{loading ? "Loading…" : projects.length ? `${projects.length} project${projects.length === 1 ? "" : "s"}` : "No projects yet"}</Text>

      <TextInput style={s.search} placeholder="Search name, tags, properties…" value={filters.q} onChangeText={setQ} />
      {tags.length > 0 && (
        <View style={{ marginBottom: 10 }}>
          <Text style={s.flabel}>Tag</Text>
          <Chips small values={["All", ...tags]} value={filters.tag === "" ? "All" : filters.tag} onChange={(t) => setTag(t === "All" ? "" : t)} />
        </View>
      )}
      <View style={{ marginBottom: 16 }}>
        <Text style={s.flabel}>Sort</Text>
        <Chips small values={["updated", "created", "name"]} value={filters.sort} onChange={setSort}
          label={(v) => ({ updated: "Recently updated", created: "Newest", name: "Name A–Z" }[v])} />
      </View>

      {!loading && projects.length === 0 ? (
        <Text style={{ color: C.inkFaint, textAlign: "center", padding: 30, fontFamily: FB[400] }}>
          {filters.q || filters.tag ? "No projects match these filters." : "You haven't saved any projects yet — save one from the calculator."}
        </Text>
      ) : (
        projects.map((p) => <ProjectCard key={p.id} p={p} onOpen={() => onOpen(p)} onDelete={() => del(p)} onTag={setTag} />)
      )}
    </ScrollView>
  );
}

function ProjectCard({ p, onOpen, onDelete, onTag }) {
  const snap = p.snapshot || {};
  const when = p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : "";
  return (
    <Card style={{ borderTopColor: C.red, borderTopWidth: 3 }}>
      <Text style={{ fontFamily: FD[800], fontSize: 16 }}>{p.name}</Text>
      <Text style={{ color: C.inkFaint, fontSize: 12, marginTop: 2, fontFamily: FB[400] }}>{snap.title || ""}{when ? " · updated " + when : ""}</Text>
      {typeof snap.governing === "number" && (
        <View style={{ backgroundColor: C.surface2, padding: 8, marginTop: 8 }}>
          <Text style={{ color: C.inkSoft, fontSize: 12.5, fontFamily: FB[400] }}>Governing column load <Text style={{ color: C.red, fontFamily: FB[700] }}>{snap.governing} {snap.unit || ""}</Text>
            {snap.verdict && snap.verdict !== "neutral" ? (snap.verdict === "ok" ? " · applicable" : " · exceeds capacity") : ""}</Text>
        </View>
      )}
      {(p.tags || []).length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {p.tags.map((t) => (
            <Pressable key={t} onPress={() => onTag(t)}><Text style={s.tagChip}>{t}</Text></Pressable>
          ))}
        </View>
      )}
      {(p.properties || []).length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
          {p.properties.slice(0, 4).map((pr, i) => <Text key={i} style={s.propChip}>{pr.key}{pr.value ? ": " + pr.value : ""}</Text>)}
        </View>
      )}
      <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
        <Btn small title="Open & edit" variant="primary" onPress={onOpen} style={{ flex: 1 }} />
        <Btn small title="Delete" onPress={onDelete} />
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  search: { borderWidth: 1, borderColor: C.lineStrong, backgroundColor: "#fff", paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 10, fontFamily: FB[400] },
  flabel: { fontSize: 11, fontFamily: FD[800], textTransform: "uppercase", letterSpacing: 0.5, color: C.inkFaint, marginBottom: 6 },
  tagChip: { backgroundColor: C.navy, color: "#fff", fontSize: 10.5, fontFamily: FD[700], textTransform: "uppercase", paddingHorizontal: 8, paddingVertical: 3, overflow: "hidden" },
  propChip: { backgroundColor: C.surface2, borderColor: C.lineStrong, borderWidth: 1, color: C.inkSoft, fontSize: 11, paddingHorizontal: 8, paddingVertical: 3, overflow: "hidden", fontFamily: FB[600] },
});
