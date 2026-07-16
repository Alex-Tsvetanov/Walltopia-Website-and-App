import { useEffect, useRef } from "react";
import { Animated, View, Dimensions } from "react-native";
import Svg, { G, Path, Rect, Line, Circle, Polygon, Polyline, Text as SvgText } from "react-native-svg";
import { C, FD, FB } from "../theme";
import { acsGeometry } from "../lib/acsGeometry";

const AnimatedLine = Animated.createAnimatedComponent(Line);

// small filled triangle at the arrow tip, oriented along the force direction
function arrowHead(x1, y1, x2, y2, size = 10) {
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len, px = -uy, py = ux;
  const bx = x2 - ux * size, by = y2 - uy * size, h = size * 0.55;
  return `${x2},${y2} ${bx + px * h},${by + py * h} ${bx - px * h},${by - py * h}`;
}

export default function AcsDiagram({ a, x, height, zValues }) {
  const g = acsGeometry(a, x, height, zValues);
  const flow = useRef(new Animated.Value(0)).current;
  const intro = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(intro, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    const loop = Animated.loop(Animated.timing(flow, { toValue: 1, duration: 1200, easing: (t) => t, useNativeDriver: false }));
    loop.start();
    return () => loop.stop();
  }, []); // eslint-disable-line

  const dashOffset = flow.interpolate({ inputRange: [0, 1], outputRange: [0, -30] });
  const win = Dimensions.get("window").width;
  const w = win - 64; // card + wrapper padding
  const h = (w * 560) / 900;

  return (
    <Animated.View style={{ opacity: intro, transform: [{ scale: intro.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) }], backgroundColor: C.surface2, borderColor: C.line, borderWidth: 1, borderTopColor: C.red, borderTopWidth: 3, padding: 8, marginTop: 16 }}>
      <View style={{ width: w, height: h, alignSelf: "center" }}>
        <Svg width={w} height={h} viewBox="0 0 900 560">
          {/* frame */}
          <G>
            <Path d={g.roof} fill="none" stroke={C.ink} strokeWidth={2.4} strokeLinecap="round" />
            <Path d={g.ground} fill="none" stroke={C.ink} strokeWidth={2.4} strokeLinecap="round" />
            {g.columns.map((c, i) => (
              <Rect key={i} x={c.x} y={c.y} width={c.w} height={c.h} fill="rgba(44,46,61,0.06)" stroke={C.ink} strokeWidth={2} />
            ))}
          </G>
          {/* overhang contour */}
          <Polygon points={g.contourPolygon} fill="rgba(236,28,36,0.08)" stroke={C.inkFaint} strokeWidth={2} />
          <Polyline points={g.topContour} fill="none" stroke={C.inkFaint} strokeWidth={1.5} strokeDasharray="6 6" />
          {/* beams + attachment points */}
          {g.beams.map((b, i) => <Line key={i} x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2} stroke={C.navy} strokeWidth={4} strokeLinecap="round" />)}
          {g.points.map((p, i) => <Circle key={i} cx={p.cx} cy={p.cy} r={6} fill="#fff" stroke={C.red} strokeWidth={3} />)}
          {/* flowing load arrows */}
          {g.forces.map((f, i) => (
            <G key={i}>
              <AnimatedLine x1={f.x1} y1={f.y1} x2={f.x2} y2={f.y2} stroke={C.red} strokeWidth={3} strokeDasharray="8 7" strokeDashoffset={dashOffset} />
              <Polygon points={arrowHead(f.x1, f.y1, f.x2, f.y2)} fill={C.red} />
              <SvgText x={f.lx} y={f.ly} fill={C.ink} fontFamily={FB[700]} fontSize={15}>{f.label}</SvgText>
            </G>
          ))}
          {/* dimensions */}
          {g.guides.map((l, i) => <Line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={C.lineStrong} strokeWidth={1} strokeDasharray="5 6" />)}
          {g.dimLines.map((l, i) => <Line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={C.inkFaint} strokeWidth={1.4} />)}
          {g.dimTexts.map((t, i) => <SvgText key={i} x={t.x} y={t.y} fill={C.inkFaint} fontFamily={FB[400]} fontSize={14}>{t.t}</SvgText>)}
          <SvgText x={g.topContourLabel.x} y={g.topContourLabel.y} fill={C.inkFaint} fontFamily={FB[400]} fontSize={13}>{g.topContourLabel.t}</SvgText>
          <SvgText x={g.bottomContourLabel.x} y={g.bottomContourLabel.y} fill={C.inkFaint} fontFamily={FB[400]} fontSize={13}>{g.bottomContourLabel.t}</SvgText>
        </Svg>
      </View>
    </Animated.View>
  );
}
