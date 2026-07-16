import { View, Text, Pressable, StyleSheet } from "react-native";
import { C, FD } from "../theme";
import { useAuth } from "../auth";

// Wordmark rendered as styled text (the SVG logo isn't bundled). "WALL" white + red "TOPIA".
export default function Header({ onLoginPress, topInset = 0 }) {
  const { user, logout } = useAuth();
  return (
    <View style={[s.bar, { paddingTop: 12 + topInset }]}>
      <View style={s.brand}>
        <Text style={s.logo}>WALL<Text style={{ color: C.red }}>TOPIA</Text></Text>
        <Text style={s.tag}>PRELIMINARY LOADS</Text>
      </View>
      {user ? (
        <Pressable style={s.userWrap} onPress={logout}>
          <View style={s.avatar}><Text style={s.avatarText}>{(user.name || "?").trim().charAt(0).toUpperCase()}</Text></View>
          <Text style={s.logout}>Log out</Text>
        </Pressable>
      ) : (
        <Pressable onPress={onLoginPress} style={s.login}><Text style={s.loginText}>Log in</Text></Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  bar: { backgroundColor: C.navy, borderTopColor: C.red, borderTopWidth: 4, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brand: {},
  logo: { color: "#fff", fontFamily: FD[900], fontSize: 20, letterSpacing: 0.5 },
  tag: { color: "#9aa2b4", fontSize: 10, fontFamily: FD[800], letterSpacing: 1.2, marginTop: 1 },
  userWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  avatar: { width: 26, height: 26, backgroundColor: C.red, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontFamily: FD[800], fontSize: 12 },
  logout: { color: "#c3c8d6", fontFamily: FD[700], fontSize: 12, textTransform: "uppercase" },
  login: { borderColor: "#454a5e", borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  loginText: { color: "#dfe3ec", fontFamily: FD[700], fontSize: 12, textTransform: "uppercase" },
});
