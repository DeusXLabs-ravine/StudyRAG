import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, GradientBg, DotGrid, Badge, FeatureCard, SHADOWS } from "./shared";

export const FlashcardsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sp = (delay: number, cfg?: object) =>
    spring({ frame: frame - delay, fps, config: { damping: 200, ...cfg } });
  const fadeIn = (start: number, end: number) =>
    interpolate(frame, [start, end], [0, 1], { extrapolateRight: "clamp" });
  const slideIn = (delay: number) => interpolate(sp(delay), [0, 1], [40, 0]);

  // Card flip animation
  const flipStart = 70;
  const flipProgress = interpolate(frame, [flipStart, flipStart + 30], [0, 1], {
    extrapolateRight: "clamp",
  });
  const rotateY = interpolate(flipProgress, [0, 0.5, 1], [0, 90, 180]);
  const showBack = flipProgress > 0.5;

  // Stats
  const stats = [
    { label: "Due Today", value: "24", icon: "📅", color: COLORS.amber },
    { label: "Mastered", value: "156", icon: "⭐", color: COLORS.green },
    { label: "Streak", value: "12d", icon: "🔥", color: COLORS.primary },
  ];

  // Rating buttons
  const ratings = [
    { label: "Again", color: COLORS.red },
    { label: "Hard", color: COLORS.amber },
    { label: "Good", color: COLORS.primary },
    { label: "Easy", color: COLORS.green },
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
        {/* Left: Stats & Info Sidebar */}
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
            <Badge color={COLORS.green}>Smart Flashcards</Badge>
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
            gap: 16
          }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: COLORS.textMuted, margin: 0, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Daily Progress
            </h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {stats.map((stat) => (
                <div key={stat.label} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: COLORS.bgCardAlt, borderRadius: 16 }}>
                  <div style={{ fontSize: 22 }}>{stat.icon}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 12, color: COLORS.textSecondary, fontWeight: 600 }}>{stat.label}</p>
                    <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: stat.color }}>{stat.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: "auto", background: `linear-gradient(135deg, ${COLORS.primary}10, ${COLORS.purple}10)`, borderRadius: 16, padding: 16, border: `1px dashed ${COLORS.primary}33` }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: COLORS.primary, marginBottom: 4 }}>🧠 SM-2 Algorithm</p>
                <p style={{ margin: 0, fontSize: 11, color: COLORS.textSecondary }}>Next review scheduled for tomorrow at 9:00 AM</p>
            </div>
          </div>
        </div>

        {/* Right: Card View */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 24, justifyContent: "center", alignItems: "center" }}>
          {/* Deck title badge */}
          <div style={{ opacity: fadeIn(10, 30), transform: `translateY(${slideIn(10)}px)` }}>
            <Badge color={COLORS.primary}>Biology: Chapter 5 · 24 Cards</Badge>
          </div>

          {/* Flashcard with Flip Animation */}
          <div
            style={{
              width: 580,
              height: 360,
              perspective: 1500,
              opacity: fadeIn(15, 40),
            }}
          >
            <div
              style={{
                position: "relative",
                width: "100%",
                height: "100%",
                transformStyle: "preserve-3d",
                transform: `rotateY(${rotateY}deg)`,
                transition: "transform 0.1s linear",
              }}
            >
              {/* Front face */}
              {!showBack && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "#fff",
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 28,
                    padding: "48px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    backfaceVisibility: "hidden",
                    boxShadow: SHADOWS.lg,
                  }}
                >
                  <div style={{ marginBottom: 20, fontSize: 12, fontWeight: 700, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    Flashcard Question
                  </div>
                  <h3
                    style={{
                      fontSize: 30,
                      fontWeight: 800,
                      color: COLORS.textPrimary,
                      textAlign: "center",
                      margin: 0,
                      lineHeight: 1.4,
                      fontFamily: "Outfit, sans-serif",
                    }}
                  >
                    What enzyme is primarily responsible for carbon fixation in the Calvin cycle?
                  </h3>
                  <div style={{ marginTop: 40, padding: "8px 20px", background: COLORS.bgCardAlt, borderRadius: 100, fontSize: 13, color: COLORS.textMuted, fontWeight: 600 }}>
                    Click to flip
                  </div>
                </div>
              )}

              {/* Back face */}
              {showBack && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: `linear-gradient(135deg, #fff, ${COLORS.primary}05)`,
                    border: `2px solid ${COLORS.primary}44`,
                    borderRadius: 28,
                    padding: "48px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    transform: "rotateY(180deg)",
                    backfaceVisibility: "hidden",
                    boxShadow: `0 20px 60px ${COLORS.primary}22`,
                  }}
                >
                  <div style={{ marginBottom: 20, fontSize: 12, fontWeight: 700, color: COLORS.primary, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    Verified Answer
                  </div>
                  <h3
                    style={{
                      fontSize: 48,
                      fontWeight: 900,
                      color: COLORS.primary,
                      textAlign: "center",
                      margin: "0 0 20px",
                      fontFamily: "Outfit, sans-serif",
                    }}
                  >
                    RuBisCO
                  </h3>
                  <p style={{ margin: 0, fontSize: 18, color: COLORS.textSecondary, textAlign: "center", fontFamily: "Outfit, sans-serif", lineHeight: 1.6, fontWeight: 500 }}>
                    Ribulose-1,5-bisphosphate carboxylase/oxygenase — the most abundant enzyme on Earth.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Rating buttons */}
          <div
            style={{
              opacity: fadeIn(flipStart + 35, flipStart + 60),
              transform: `translateY(${interpolate(sp(flipStart + 35), [0, 1], [20, 0])}px)`,
              display: "flex",
              gap: 16,
              width: 580,
            }}
          >
            {ratings.map((r) => (
              <div
                key={r.label}
                style={{
                  flex: 1,
                  textAlign: "center",
                  padding: "16px 0",
                  borderRadius: 16,
                  background: "#fff",
                  border: `2px solid ${r.color}33`,
                  fontSize: 15,
                  fontWeight: 700,
                  color: r.color,
                  fontFamily: "Outfit, sans-serif",
                  boxShadow: SHADOWS.sm,
                  cursor: "pointer",
                }}
              >
                {r.label}
              </div>
            ))}
          </div>

          {/* AI Generation Badge */}
          <div style={{ opacity: fadeIn(40, 65), display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14 }}>🤖</span>
            <span style={{ fontSize: 14, color: COLORS.textMuted, fontWeight: 500 }}>AI-Generated card from page 142 of your document</span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
