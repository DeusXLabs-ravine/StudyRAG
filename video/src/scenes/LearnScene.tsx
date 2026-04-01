import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, GradientBg, DotGrid, Badge, FeatureCard, SHADOWS, FONTS } from "./shared";

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
    interpolate(frame, [45, 135], [0, fullText.length], { extrapolateRight: "clamp" })
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
          gap: 48,
        }}
      >
        {/* Left sidebar - App-like Sidebar */}
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
            <Badge color={COLORS.primary}>Lesson View</Badge>
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
            gap: 12
          }}>
            <h3
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: COLORS.textMuted,
                margin: "0 0 8px",
                fontFamily: "Outfit, sans-serif",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              Curriculum
            </h3>
            {lessons.map((lesson, i) => {
              const isActive = lesson.active;
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "12px 16px",
                    borderRadius: 12,
                    background: isActive ? `${COLORS.primary}10` : "transparent",
                    border: isActive ? `1px solid ${COLORS.primary}33` : "1px solid transparent",
                    transition: "all 0.3s ease",
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: lesson.done
                        ? COLORS.green
                        : isActive
                        ? COLORS.primary
                        : COLORS.bgCardAlt,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      color: "#fff",
                      flexShrink: 0,
                      boxShadow: isActive ? `0 0 12px ${COLORS.primary}44` : "none",
                    }}
                  >
                    {lesson.done ? "✓" : i + 1}
                  </div>
                  <span
                    style={{
                      fontSize: 15,
                      color: isActive ? COLORS.textPrimary : COLORS.textSecondary,
                      fontFamily: "Outfit, sans-serif",
                      fontWeight: isActive ? 600 : 500,
                    }}
                  >
                    {lesson.title}
                  </span>
                </div>
              );
            })}

            <div style={{ marginTop: "auto", paddingTop: 24, borderTop: `1px solid ${COLORS.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: 14, color: COLORS.textSecondary, fontWeight: 500 }}>Progress</span>
                <span style={{ fontSize: 14, color: COLORS.primary, fontWeight: 700 }}>75%</span>
              </div>
              <div style={{ height: 10, background: COLORS.bgCardAlt, borderRadius: 5, overflow: "hidden" }}>
                <div style={{ width: "75%", height: "100%", background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.purple})`, borderRadius: 5 }} />
              </div>
            </div>
          </div>
        </div>

        {/* Main content - THE CHALKBOARD */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              flex: 1,
              opacity: fadeIn(10, 35),
              transform: `translateY(${slideIn(10)}px)`,
              position: "relative",
            }}
          >
            {/* Board Frame */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: COLORS.boardBg,
                border: `14px solid ${COLORS.boardBorder}`,
                borderRadius: 4,
                boxShadow: `inset 0 0 100px rgba(0,0,0,0.5), 0 15px 40px rgba(0,0,0,0.3)`,
                display: "flex",
                flexDirection: "column",
                padding: 48,
                overflow: "hidden",
              }}
            >
              {/* Board Texture Overlay */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  opacity: 0.04,
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                  pointerEvents: "none",
                }}
              />

              {/* Ledge */}
              <div
                style={{
                  position: "absolute",
                  bottom: -18,
                  left: -14,
                  right: -14,
                  height: 24,
                  background: COLORS.boardLedge,
                  borderRadius: "0 0 8px 8px",
                  boxShadow: "0 4px 10px rgba(0,0,0,0.4)",
                }}
              />

              {/* Board Content */}
              <div style={{ position: "relative", zIndex: 1 }}>
                <h2
                  style={{
                    fontSize: 48,
                    fontWeight: 700,
                    color: "#fff",
                    margin: "0 0 32px",
                    fontFamily: FONTS.kalam,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    borderBottom: "2px dashed rgba(255,255,255,0.2)",
                    paddingBottom: 16,
                  }}
                >
                  Calvin Cycle
                </h2>

                <p
                  style={{
                    fontSize: 28,
                    color: COLORS.boardText,
                    lineHeight: 1.6,
                    fontFamily: FONTS.kalam,
                    textShadow: "0 0 2px rgba(255,255,255,0.3)",
                  }}
                >
                  {displayText}
                  {charCount < fullText.length && (
                    <span
                      style={{
                        display: "inline-block",
                        width: 3,
                        height: 32,
                        background: "#fff",
                        marginLeft: 4,
                        opacity: Math.round(frame / 6) % 2,
                        verticalAlign: "middle",
                      }}
                    />
                  )}
                </p>

                {/* Markers / Chalks on ledge */}
                <div style={{ position: "absolute", bottom: -30, right: 20, display: "flex", gap: 12 }}>
                  <div style={{ width: 14, height: 40, background: "#fff", borderRadius: 4, transform: "rotate(-15deg)", boxShadow: "2px 2px 4px rgba(0,0,0,0.2)" }} />
                  <div style={{ width: 14, height: 40, background: COLORS.primary, borderRadius: 4, transform: "rotate(10deg)", boxShadow: "2px 2px 4px rgba(0,0,0,0.2)" }} />
                  <div style={{ width: 60, height: 20, background: "#333", border: "1px solid #444", borderRadius: 2, transform: "rotate(-5deg)", boxShadow: "2px 2px 4px rgba(0,0,0,0.2)" }} />
                </div>
              </div>
            </div>
          </div>

          {/* AI Tutor floating message - Match app style */}
          <div
            style={{
              opacity: fadeIn(100, 125),
              transform: `translateY(${slideIn(100)}px)`,
            }}
          >
            <div
              style={{
                background: "#fff",
                border: `1px solid ${COLORS.border}`,
                borderRadius: 20,
                padding: "20px 24px",
                display: "flex",
                alignItems: "center",
                gap: 18,
                boxShadow: SHADOWS.lg,
              }}
            >
              <div style={{ 
                width: 50, 
                height: 50, 
                borderRadius: "50%", 
                background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.purple})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 26
              }}>
                🤖
              </div>
              <div>
                <p style={{ margin: "0 0 4px", fontSize: 14, color: COLORS.primary, fontFamily: "Outfit, sans-serif", fontWeight: 700 }}>
                  AI Tutor Assistant
                </p>
                <p style={{ margin: 0, fontSize: 16, color: COLORS.textSecondary, fontFamily: "Outfit, sans-serif", fontWeight: 500 }}>
                  Great progress! Would you like to try an interactive simulation for this cycle?
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
