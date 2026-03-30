import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, GradientBg, DotGrid, Badge, FeatureCard, IconCircle } from "./shared";

export const LearnScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sp = (delay: number) =>
    spring({ frame: frame - delay, fps, config: { damping: 200 } });

  const fadeIn = (start: number, end: number) =>
    interpolate(frame, [start, end], [0, 1], { extrapolateRight: "clamp" });

  const slideIn = (delay: number) => interpolate(sp(delay), [0, 1], [40, 0]);

  // Typewriter for lesson content
  const fullText =
    "Photosynthesis is the process by which plants convert sunlight, water, and carbon dioxide into glucose and oxygen. This fundamental biological process occurs in the chloroplasts...";
  const charCount = Math.floor(
    interpolate(frame, [40, 130], [0, fullText.length], { extrapolateRight: "clamp" })
  );
  const displayText = fullText.slice(0, charCount);

  const lessons = [
    { title: "Introduction to Photosynthesis", done: true },
    { title: "Light Reactions", done: true },
    { title: "Calvin Cycle", done: false, active: true },
    { title: "Factors Affecting Rate", done: false },
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
          gap: 40,
        }}
      >
        {/* Left sidebar */}
        <div
          style={{
            width: 280,
            display: "flex",
            flexDirection: "column",
            gap: 16,
            opacity: fadeIn(0, 25),
            transform: `translateX(${interpolate(sp(0), [0, 1], [-30, 0])}px)`,
          }}
        >
          <div style={{ marginBottom: 8 }}>
            <Badge color={COLORS.green}>Learn Mode</Badge>
          </div>
          <h3
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: COLORS.textSecondary,
              margin: "0 0 8px",
              fontFamily: "Outfit, sans-serif",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Lessons
          </h3>
          {lessons.map((lesson, i) => {
            const isActive = lesson.active;
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: isActive ? `${COLORS.sky}18` : "transparent",
                  border: isActive ? `1px solid ${COLORS.sky}44` : "1px solid transparent",
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: lesson.done
                      ? COLORS.green
                      : isActive
                      ? COLORS.sky
                      : COLORS.bgCardAlt,
                    border: `1px solid ${
                      lesson.done ? COLORS.green : isActive ? COLORS.sky : COLORS.border
                    }`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    color: "#fff",
                    flexShrink: 0,
                  }}
                >
                  {lesson.done ? "✓" : i + 1}
                </div>
                <span
                  style={{
                    fontSize: 13,
                    color: isActive ? COLORS.textPrimary : COLORS.textSecondary,
                    fontFamily: "Outfit, sans-serif",
                    fontWeight: isActive ? 600 : 400,
                  }}
                >
                  {lesson.title}
                </span>
              </div>
            );
          })}

          {/* Progress */}
          <FeatureCard style={{ marginTop: "auto" }}>
            <p style={{ margin: "0 0 8px", fontSize: 12, color: COLORS.textMuted, fontFamily: "Outfit, sans-serif", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Progress
            </p>
            <p style={{ margin: "0 0 10px", fontSize: 24, fontWeight: 700, color: COLORS.textPrimary, fontFamily: "Outfit, sans-serif" }}>
              75%
            </p>
            <div style={{ height: 6, background: COLORS.bgCardAlt, borderRadius: 3 }}>
              <div style={{ width: "75%", height: "100%", background: `linear-gradient(90deg, ${COLORS.sky}, ${COLORS.purple})`, borderRadius: 3 }} />
            </div>
          </FeatureCard>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              opacity: fadeIn(10, 35),
              transform: `translateY(${slideIn(10)}px)`,
            }}
          >
            <FeatureCard>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <Badge color={COLORS.purple}>Biology · Chapter 5</Badge>
                  <h2
                    style={{
                      fontSize: 32,
                      fontWeight: 700,
                      color: COLORS.textPrimary,
                      margin: "12px 0 0",
                      fontFamily: "Outfit, sans-serif",
                    }}
                  >
                    Calvin Cycle
                  </h2>
                </div>
                <div
                  style={{
                    background: `${COLORS.sky}18`,
                    border: `1px solid ${COLORS.sky}33`,
                    borderRadius: 8,
                    padding: "6px 14px",
                    fontSize: 13,
                    color: COLORS.sky,
                    fontFamily: "Outfit, sans-serif",
                    fontWeight: 500,
                  }}
                >
                  📖 8 min read
                </div>
              </div>

              {/* Typewriter content */}
              <p
                style={{
                  fontSize: 16,
                  color: COLORS.textSecondary,
                  lineHeight: 1.8,
                  fontFamily: "Outfit, sans-serif",
                  minHeight: 80,
                }}
              >
                {displayText}
                {charCount < fullText.length && (
                  <span
                    style={{
                      display: "inline-block",
                      width: 2,
                      height: 18,
                      background: COLORS.sky,
                      marginLeft: 2,
                      opacity: Math.round(frame / 8) % 2,
                      verticalAlign: "middle",
                    }}
                  />
                )}
              </p>
            </FeatureCard>
          </div>

          {/* Key points */}
          <div
            style={{
              opacity: fadeIn(50, 75),
              transform: `translateY(${slideIn(50)}px)`,
            }}
          >
            <FeatureCard>
              <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, color: COLORS.textPrimary, fontFamily: "Outfit, sans-serif" }}>
                ✨ Key Concepts
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  "CO₂ fixation via RuBisCO enzyme",
                  "3 turns produce 1 G3P molecule",
                  "Requires 9 ATP and 6 NADPH per cycle",
                ].map((point, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: `linear-gradient(135deg, ${COLORS.sky}, ${COLORS.purple})`,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: 15, color: COLORS.textSecondary, fontFamily: "Outfit, sans-serif" }}>
                      {point}
                    </span>
                  </div>
                ))}
              </div>
            </FeatureCard>
          </div>

          {/* AI Tutor bubble */}
          <div
            style={{
              opacity: fadeIn(90, 115),
              transform: `translateY(${slideIn(90)}px)`,
            }}
          >
            <div
              style={{
                background: `linear-gradient(135deg, ${COLORS.sky}15, ${COLORS.purple}15)`,
                border: `1px solid ${COLORS.sky}33`,
                borderRadius: 14,
                padding: "14px 20px",
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <span style={{ fontSize: 28 }}>🤖</span>
              <div>
                <p style={{ margin: "0 0 4px", fontSize: 12, color: COLORS.sky, fontFamily: "Outfit, sans-serif", fontWeight: 600 }}>
                  AI Tutor
                </p>
                <p style={{ margin: 0, fontSize: 14, color: COLORS.textSecondary, fontFamily: "Outfit, sans-serif" }}>
                  Ready to check your understanding? Let's do a quick quiz on what you just learned!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
