import { useEffect, useState } from "react";
import { ScrollView, View, Text, Image, Pressable, Dimensions, StyleSheet } from "react-native";
import { C, FD, FB } from "../theme";
import { Segmented } from "../components/ui";
import { api } from "../api";
import pages from "../manualPages.json";

// Images are served by the backend (same host as the API), e.g. http://host:8787/manuals/...
const IMG_BASE = api.base.replace(/\/api\/?$/, "");
const pad = (n) => (n < 10 ? "0" + n : "" + n);

export default function ManualScreen() {
  const [view, setView] = useState("manual");
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ padding: 14, paddingBottom: 8 }}>
        <Segmented value={view} onChange={setView}
          options={[{ label: "Manual", value: "manual" }, { label: "Attachment details", value: "attachment" }]} />
      </View>
      {view === "manual" ? <ManualPages /> : <AttachmentView />}
    </View>
  );
}

function ManualPages() {
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingTop: 6, paddingBottom: 60 }}>
      <Text style={s.h2}>Applying Walltopia preliminary loads</Text>
      <Text style={s.intro}>Worked example, coordinate-system definitions, and the special cases for corner and end columns. Preliminary loads — not for construction.</Text>
      {pages.map((p) => <ManualPage key={p.page} page={p} />)}
    </ScrollView>
  );
}

function ManualPage({ page }) {
  const uri = `${IMG_BASE}/manuals/manual/page-${pad(page.page)}.png`;
  const [ratio, setRatio] = useState(1190 / 1684);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let mounted = true;
    Image.getSize(uri, (w, h) => mounted && w && setRatio(w / h), () => {});
    return () => { mounted = false; };
  }, [uri]);
  return (
    <View style={s.figure}>
      <Text style={s.pnum}>Page {page.page} of {pages.length}</Text>
      <Image source={{ uri }} style={{ width: "100%", aspectRatio: ratio, backgroundColor: "#fff" }} resizeMode="contain" />
      {page.text ? (
        <>
          <Pressable onPress={() => setOpen((v) => !v)} style={s.summary}>
            <Text style={s.summaryText}>{open ? "− Page text" : "+ Page text"}</Text>
          </Pressable>
          {open ? <Text style={s.transcript}>{page.text}</Text> : null}
        </>
      ) : null}
    </View>
  );
}

function AttachmentView() {
  const uri = `${IMG_BASE}/manuals/attachment/sheet.png`;
  const win = Dimensions.get("window");
  const [size, setSize] = useState({ w: 4210, h: 5960 });
  useEffect(() => { Image.getSize(uri, (w, h) => w && setSize({ w, h }), () => {}); }, [uri]);
  const dispW = win.width * 2.2;
  const dispH = dispW * (size.h / size.w);
  return (
    <View style={{ flex: 1 }}>
      <View style={s.cadtools}>
        <Text style={s.cadTitle}>Standard attachment details</Text>
        <Text style={s.cadHint}>Concrete floor / wall · steel column · masonry. Drag to pan{" "}· pinch to zoom.</Text>
      </View>
      <ScrollView style={{ flex: 1, backgroundColor: "#e9ebee" }} maximumZoomScale={4} minimumZoomScale={1}>
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <Image source={{ uri }} style={{ width: dispW, height: dispH }} resizeMode="contain" />
        </ScrollView>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  h2: { fontFamily: FD[900], fontSize: 22, letterSpacing: -0.6, color: C.ink, marginBottom: 6 },
  intro: { fontFamily: FB[400], fontSize: 13, color: C.inkSoft, marginBottom: 16, lineHeight: 19 },
  figure: { backgroundColor: C.surface, borderColor: C.line, borderWidth: 1, marginBottom: 18 },
  pnum: { fontFamily: FD[800], fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, color: C.inkFaint, backgroundColor: C.surface2, borderLeftColor: C.red, borderLeftWidth: 3, paddingVertical: 10, paddingHorizontal: 14 },
  summary: { borderTopColor: C.line, borderTopWidth: 1, paddingVertical: 11, paddingHorizontal: 14 },
  summaryText: { fontFamily: FD[700], fontSize: 12, textTransform: "uppercase", letterSpacing: 0.4, color: C.red },
  transcript: { fontFamily: FB[400], fontSize: 13, color: C.inkSoft, lineHeight: 20, paddingHorizontal: 16, paddingBottom: 16, borderTopColor: C.line, borderTopWidth: 1, paddingTop: 12 },
  cadtools: { padding: 14, backgroundColor: C.surface2, borderBottomColor: C.line, borderBottomWidth: 1, borderLeftColor: C.red, borderLeftWidth: 3 },
  cadTitle: { fontFamily: FD[800], fontSize: 14, color: C.ink },
  cadHint: { fontFamily: FB[400], fontSize: 12, color: C.inkFaint, marginTop: 3 },
});
