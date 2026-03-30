import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, GradientBg, DotGrid, Badge, FeatureCard, IconCircle } from "./shared";

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
    { label: "Streak", value: "12d", icon: "🔥", color: COLORS.sky },
  ];

  // Rating buttons
  const ratings = [
    { label: "Again", color: COLORS.red },
    { label: "Hard", color: COLORS.amber },
    { label: "Good", color: COLORS.sky },
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
          alignItems: "center",
          justifyContent: "center",
          padding: "60px 100px",
          gap: 80,
        }}
      >
        {/* Left: description + stats */}
        <div style={{ flex: 1, maxWidth: 380 }}>
          <div style={{ opacity: fadeIn(0, 20), marginBottom: 20 }}>
            <Badge color={COLORS.green}>Flashcards</Badge>
          </div>
          <h2
            style={{
              opacity: fadeIn(10, 35),
              transform: `translateY(${slideIn(10)}px)`,
              fontSize: 52,
              fontWeight: 800,
              color: COLORS.textPrimary,
              margin: "0 0 20px",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              fontFamily: "Outfit, sans-serif",
            }}
          >
            Smart{" "}
            <span style={{ background: `linear-gradient(135deg, ${COLORS.green}, ${COLORS.sky})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Spaced Repetition
            </span>
          </h2>
          <p
            style={{
              opacity: fadeIn(30, 55),
              fontSize: 17,
              color: COLORS.textSecondary,
              lineHeight: 1.7,
              margin: "0 0 32px",
              fontFamily: "Outfit, sans-serif",
            }}
          >
            AI-generated flashcards using the SM-2 algorithm. Review only what you need, when you need it — for maximum retention with minimum effort.
          </p>

          {/* Stats */}
          <div style={{ opacity: fadeIn(50, 75), display: "flex", gap: 16 }}>
            {stats.map((stat) => (
              <FeatureCard key={stat.label} style={{ flex: 1, textAlign: "center", padding: "16px 12px" }}>
                <div style={{ fontSize: 20, marginBottom: 6 }}>{stat.icon}</div>
                <p style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: stat.color, fontFamily: "Outfit, sans-serif" }}>
                  {stat.value}
                </p>
                <p style={{ margin: 0, fontSize: 11, color: COLORS.textMuted, fontFamily: "Outfit, sans-serif", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {stat.label}
                </p>
              </FeatureCard>
            ))}
          </div>
        </div>

        {/* Right: flashcard + controls */}
        <div style={{ flex: 1, maxWidth: 560, display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Flashcard */}
          <div
            style={{
              opacity: fadeIn(5, 30),
              perspective: 1000,
              height: 280,
            }}
          >
            <div
              style={{
                position: "relative",
                width: "100%",
                height: "100%",
                transformStyle: "preserve-3d",
                transform: `rotateY(${rotateY}deg)`,
              }}
            >
              {/* Front face */}
              {!showBack && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: COLORS.bgCard,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 20,
                    padding: "32px 40px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    backfaceVisibility: "hidden",
                    boxShadow: `0 20px 60px rgba(0,0,0,0.3)`,
                  }}
                >
                  <div style={{ marginBottom: 16, fontSize: 11, fontWeight: 600, color: COLORS.textMuted, fontFamily: "Outfit, sans-serif", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Question
                  </div>
                  <h3
                    style={{
                      fontSize: 22,
                      fontWeight: 700,
                      color: COLORS.textPrimary,
                      textAlign: "center",
                      margin: 0,
                      lineHeight: 1.4,
                      fontFamily: "Outfit, sans-serif",
                    }}
                  >
                    What enzyme is primarily responsible for carbon fixation in the Calvin cycle?
                  </h3>
                  <p style={{ margin: "20px 0 0", fontSize: 13, color: COLORS.textMuted, fontFamily: "Outfit, sans-serif" }}>
                    Tap to reveal answer
                  </p>
                </div>
              )}

              {/* Back face */}
              {showBack && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: `linear-gradient(135deg, ${COLORS.sky}18, ${COLORS.purple}18)`,
                    border: `1px solid ${COLORS.sky}44`,
                    borderRadius: 20,
                    padding: "32px 40px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    transform: "rotateY(180deg)",
                    backfaceVisibility: "hidden",
                    boxShadow: `0 20px 60px rgba(14,165,233,0.15)`,
                  }}
                >
                  <div style={{ marginBottom: 16, fontSize: 11, fontWeight: 600, color: COLORS.sky, fontFamily: "Outfit, sans-serif", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Answer
                  </div>
                  <h3
                    style={{
                      fontSize: 28,
                      fontWeight: 800,
                      color: COLORS.textPrimary,
                      textAlign: "center",
                      margin: "0 0 16px",
                      fontFamily: "Outfit, sans-serif",
                    }}
                  >
                    RuBisCO
                  </h3>
                  <p style={{ margin: 0, fontSize: 15, color: COLORS.textSecondary, textAlign: "center", fontFamily: "Outfit, sans-serif", lineHeight: 1.6 }}>
                    Ribulose-1,5-bisphosphate carboxylase/oxygenase — the most abundant enzyme on Earth.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Rating buttons */}
          <div
            style={{
              opacity: fadeIn(flipStart + 35, flipStart + 55),
              transform: `translateY(${interpolate(sp(flipStart + 35), [0, 1], [20, 0])}px)`,
              display: "flex",
              gap: 12,
            }}
          >
            {ratings.map((r) => (
              <div
                key={r.label}
                style={{
                  flex: 1,
                  textAlign: "center",
                  padding: "12px 0",
                  borderRadius: 12,
                  background: `${r.color}18`,
                  border: `1px solid ${r.color}44`,
                  fontSize: 14,
                  fontWeight: 600,
                  color: r.color,
                  fontFamily: "Outfit, sans-serif",
                }}
              >
                {r.label}
              </div>
            ))}
          </div>

          {/* Deck info */}
          <div
            style={{
              opacity: fadeIn(40, 65),
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 13, color: COLORS.textMuted, fontFamily: "Outfit, sans-serif" }}>
              Card 8 of 24
            </span>
            <span style={{ fontSize: 13, color: COLORS.textMuted, fontFamily: "Outfit, sans-serif" }}>
              Biology Chapter 5
            </span>
            <span style={{ fontSize: 13, color: COLORS.sky, fontFamily: "Outfit, sans-serif", fontWeight: 600 }}>
              🤖 AI-Generated
            </span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
