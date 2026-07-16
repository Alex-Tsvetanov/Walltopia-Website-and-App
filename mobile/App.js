import { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useFonts, Montserrat_700Bold, Montserrat_800ExtraBold, Montserrat_900Black } from "@expo-google-fonts/montserrat";
import { OpenSans_400Regular, OpenSans_600SemiBold, OpenSans_700Bold } from "@expo-google-fonts/open-sans";
import { C, FD, FB } from "./src/theme";
import { AuthProvider } from "./src/auth";
import { api } from "./src/api";
import Header from "./src/components/Header";
import LoginModal from "./src/components/LoginModal";
import CalculatorScreen from "./src/screens/CalculatorScreen";
import DashboardScreen from "./src/screens/DashboardScreen";
import ManualScreen from "./src/screens/ManualScreen";

function Root() {
  const insets = useSafeAreaInsets();
  const [fontsLoaded] = useFonts({
    Montserrat_700Bold, Montserrat_800ExtraBold, Montserrat_900Black,
    OpenSans_400Regular, OpenSans_600SemiBold, OpenSans_700Bold,
  });
  const [data, setData] = useState(null);
  const [dataErr, setDataErr] = useState(null);
  const [tab, setTab] = useState("calc");
  const [editingProject, setEditingProject] = useState(null);
  const [login, setLogin] = useState({ visible: false, mode: "login" });

  useEffect(() => { api.loads().then(setData).catch((e) => setDataErr(e)); }, []);

  // Don't render font-styled UI until the fonts are ready (avoids missing text on first paint).
  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: C.navy }}>
        <StatusBar style="light" />
        <View style={st.center}><ActivityIndicator color={C.red} size="large" /></View>
      </View>
    );
  }

  const requireLogin = (mode = "login") => setLogin({ visible: true, mode });
  const openProject = (p) => { setEditingProject(p); setTab("calc"); };

  let content;
  if (dataErr) {
    content = (
      <View style={st.center}>
        <Text style={{ fontFamily: FD[800], fontSize: 16, color: C.ink, marginBottom: 8 }}>Can't reach the server</Text>
        <Text style={{ color: C.inkSoft, textAlign: "center", paddingHorizontal: 30, fontFamily: FB[400] }}>{dataErr.message}</Text>
        <Text style={{ color: C.inkFaint, textAlign: "center", marginTop: 12, paddingHorizontal: 30, fontSize: 12, fontFamily: FB[400] }}>Set the API URL in app.json → expo.extra.apiBase to a URL your phone can reach ({api.base}).</Text>
      </View>
    );
  } else if (!data) {
    content = <View style={st.center}><ActivityIndicator color={C.red} size="large" /><Text style={{ color: C.inkFaint, marginTop: 12, fontFamily: FB[400] }}>Loading load tables…</Text></View>;
  } else if (tab === "calc") {
    content = (
      <CalculatorScreen key={editingProject?.id || "new"} data={data} initialProject={editingProject}
        onProjectChange={setEditingProject} onExit={() => setEditingProject(null)} requireLogin={requireLogin} />
    );
  } else if (tab === "projects") {
    content = <DashboardScreen onOpen={openProject} requireLogin={requireLogin} />;
  } else {
    content = <ManualScreen />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style="light" />
      <Header topInset={insets.top} onLoginPress={() => requireLogin("login")} />
      <View style={{ flex: 1 }}>{content}</View>
      <View style={[st.tabbar, { paddingBottom: insets.bottom }]}>
        <TabButton label="Calculator" active={tab === "calc"} onPress={() => setTab("calc")} />
        <TabButton label="Projects" active={tab === "projects"} onPress={() => setTab("projects")} />
        <TabButton label="Manual" active={tab === "manual"} onPress={() => setTab("manual")} />
      </View>
      <LoginModal visible={login.visible} initialMode={login.mode} onClose={() => setLogin((l) => ({ ...l, visible: false }))} />
    </View>
  );
}

function TabButton({ label, active, onPress }) {
  return (
    <Pressable style={st.tab} onPress={onPress}>
      <View style={{ height: 3, alignSelf: "stretch", backgroundColor: active ? C.red : "transparent" }} />
      <Text style={[st.tabLabel, active && { color: C.ink }]}>{label}</Text>
    </Pressable>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const st = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg },
  tabbar: { flexDirection: "row", backgroundColor: "#fff", borderTopColor: C.line, borderTopWidth: 1 },
  tab: { flex: 1, alignItems: "center" },
  tabLabel: { paddingVertical: 12, fontFamily: FD[800], fontSize: 12.5, textTransform: "uppercase", letterSpacing: 0.5, color: C.inkFaint },
});
