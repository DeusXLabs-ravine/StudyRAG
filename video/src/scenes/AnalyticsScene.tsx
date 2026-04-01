import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, GradientBg, DotGrid, Badge, FeatureCard, SHADOWS } from "./shared";

export const AnalyticsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sp = (delay: number) =>
    spring({ frame: frame - delay, fps, config: { damping: 200 } });
  const fadeIn = (start: number, end: number) =>
    interpolate(frame, [start, end], [0, 1], { extrapolateRight: "clamp" });
  const slideIn = (delay: number) => interpolate(sp(delay), [0, 1], [40, 0]);

  // Mastery score counting up
  const masteryScore = Math.round(
    interpolate(frame, [30, 90], [0, 87], { extrapolateRight: "clamp" })
  );

  // Bar chart data
  const topics = [
    { name: "Photosynthesis", score: 92, color: COLORS.green },
    { name: "Cell Division", score: 78, color: COLORS.primary },
    { name: "Genetics", score: 65, color: COLORS.purple },
    { name: "Evolution", score: 45, color: COLORS.amber },
  ];

  return (
    <AbsoluteFill>
      <GradientBg />
      <DotGrid />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "stretch",
          padding: "60px 80px",
          gap: 48,
        }}
      >
        {/* Left: Progress Sidebar */}
        <div
          style={{
            width: 320,
            display: "flex",
            flexDirection: "column",
            gap: 20,
            opacity: fadeIn(0, 25),
            transform: `translateX(${interpolate(sp(0), [0, 1], [-30, 0])}px)`,
          }}
        >
          <div style={{ marginBottom: 12 }}>
            <Badge color={COLORS.purple}>Learning Analytics</Badge>
          </div>
          
          <div style={{ 
            background: "#fff", 
            borderRadius: 24, 
            padding: 24, 
            boxShadow: SHADOWS.md,
            border: `1px solid ${COLORS.border}`,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 24
          }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: COLORS.textMuted, margin: 0, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Key Performance
            </h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {[
                { icon: "🏆", label: "Overall Mastery", value: `${masteryScore}%`, color: COLORS.green },
                { icon: "🔥", label: "Study Streak", value: "12 days", color: COLORS.amber },
                { icon: "⚡", label: "XP Earned", value: "2,840", color: COLORS.primary },
              ].map((stat, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, opacity: fadeIn(i*10, i*10+20) }}>
                  <div style={{ fontSize: 24 }}>{stat.icon}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 12, color: COLORS.textMuted, fontWeight: 600, textTransform: "uppercase" }}>{stat.label}</p>
                    <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: stat.color }}>{stat.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: "auto", background: COLORS.bgCardAlt, borderRadius: 16, padding: 20, border: `1px solid ${COLORS.border}` }}>
                <p style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: COLORS.textPrimary }}>Weekly Goal</p>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: COLORS.textSecondary }}>Study Time</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.primary }}>12/15h</span>
                </div>
                <div style={{ height: 6, background: "#fff", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: "80%", height: "100%", background: COLORS.primary }} />
                </div>
            </div>
          </div>
        </div>

        {/* Right: Detailed Charts */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Main Title Area */}
          <div style={{ opacity: fadeIn(10, 35), transform: `translateY(${slideIn(10)}px)` }}>
            <h2
              style={{
                fontSize: 56,
                fontWeight: 900,
                color: COLORS.textPrimary,
                margin: "0 0 12px",
                lineHeight: 1.1,
                letterSpacing: "-0.04em",
                fontFamily: "Outfit, sans-serif",
              }}
            >
              Visualize Your{" "}
              <span
                style={{
                  background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.purple})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Growth
              </span>
            </h2>
            <p style={{ fontSize: 20, color: COLORS.textSecondary, fontWeight: 500 }}>AI-driven insights to optimize your study patterns.</p>
          </div>

          <div style={{ display: "flex", gap: 24 }}>
             {/* Score Card */}
             <div style={{ flex: 1.5, background: "#fff", borderRadius: 24, padding: 32, boxShadow: SHADOWS.lg, border: `1px solid ${COLORS.border}`, display: "flex", flexDirection: "column", gap: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ fontSize: 18, fontWeight: 800, color: COLORS.textPrimary }}>Topic Mastery Breakdown</h3>
                    <Badge color={COLORS.primary}>Biology Ch.5</Badge>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {topics.map((topic, i) => {
                        const barDelay = 50 + i * 15;
                        const barWidth = interpolate(frame, [barDelay, barDelay + 40], [0, topic.score], { extrapolateRight: "clamp" });
                        return (
                            <div key={topic.name}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                                    <span style={{ fontSize: 14, color: COLORS.textSecondary, fontWeight: 600 }}>{topic.name}</span>
                                    <span style={{ fontSize: 14, fontWeight: 800, color: topic.color }}>{Math.round(barWidth)}%</span>
                                </div>
                                <div style={{ height: 10, background: COLORS.bgCardAlt, borderRadius: 5, overflow: "hidden" }}>
                                    <div style={{ width: `${barWidth}%`, height: "100%", background: topic.color, borderRadius: 5 }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
             </div>

             {/* Right Column: Mini Cards */}
             <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 24 }}>
                <div style={{ background: "#fff", borderRadius: 24, padding: 24, boxShadow: SHADOWS.md, border: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: `${COLORS.amber}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🎯</div>
                    <div>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: COLORS.textMuted }}>FOCUS AREA</p>
                        <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: COLORS.textPrimary }}>Evolution Basics</p>
                    </div>
                </div>
                
                <div style={{ flex: 1, background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.purple})`, borderRadius: 24, padding: 24, boxShadow: SHADOWS.lg, color: "#fff", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, opacity: 0.9, marginBottom: 8 }}>PREDICTED GRADE</p>
                    <p style={{ margin: 0, fontSize: 64, fontWeight: 900, lineHeight: 1 }}>A+</p>
                    <p style={{ margin: "12px 0 0", fontSize: 14, fontWeight: 600, opacity: 0.9 }}>Based on 124 quiz attempts</p>
                </div>
             </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
