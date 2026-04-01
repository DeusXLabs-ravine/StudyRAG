import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, GradientBg, DotGrid, Badge, FeatureCard, SHADOWS } from "./shared";

export const QuizScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sp = (delay: number) =>
    spring({ frame: frame - delay, fps, config: { damping: 200 } });
  const fadeIn = (start: number, end: number) =>
    interpolate(frame, [start, end], [0, 1], { extrapolateRight: "clamp" });
  const slideIn = (delay: number) => interpolate(sp(delay), [0, 1], [40, 0]);

  const options = [
    { label: "A", text: "RuBisCO catalyzes the fixation of CO₂ onto RuBP", correct: true },
    { label: "B", text: "ATP synthase produces glucose directly from sunlight" },
    { label: "C", text: "Oxygen is consumed during the light reactions" },
    { label: "D", text: "G3P is converted to ATP in the stroma" },
  ];

  // Animate the "correct" reveal
  const revealCorrect = frame > 100;
  const correctScale = spring({ frame: frame - 100, fps, config: { damping: 16, stiffness: 200 } });

  // XP gain popup
  const xpOpacity = fadeIn(110, 125);
  const xpY = interpolate(sp(110), [0, 1], [20, 0]);
  const xpScale = spring({ frame: frame - 110, fps, config: { damping: 16, stiffness: 180 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <DotGrid />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px 180px",
        }}
      >
        {/* Header */}
        <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, opacity: fadeIn(0, 20) }}>
          <Badge color={COLORS.amber}>Adaptive Quiz</Badge>
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            <div style={{ fontSize: 14, color: COLORS.textSecondary, fontWeight: 600, fontFamily: "Outfit, sans-serif" }}>
              Question <span style={{ color: COLORS.primary, fontWeight: 800 }}>3</span> / 10
            </div>
            <div
              style={{
                background: "#fff",
                border: `1px solid ${COLORS.amber}44`,
                borderRadius: 12,
                padding: "8px 16px",
                fontSize: 14,
                color: COLORS.amber,
                fontFamily: "Outfit, sans-serif",
                fontWeight: 700,
                boxShadow: SHADOWS.sm
              }}
            >
              ⏱ 01:42
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div
          style={{
            width: "100%",
            height: 10,
            background: COLORS.bgCardAlt,
            borderRadius: 5,
            marginBottom: 48,
            opacity: fadeIn(0, 20),
            overflow: "hidden",
            boxShadow: "inset 0 1px 2px rgba(0,0,0,0.1)"
          }}
        >
          <div style={{ width: "30%", height: "100%", background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.amber})`, borderRadius: 5 }} />
        </div>

        {/* Question */}
        <div
          style={{
            width: "100%",
            opacity: fadeIn(10, 35),
            transform: `translateY(${slideIn(10)}px)`,
            marginBottom: 40,
          }}
        >
          <div style={{ 
            background: "#fff", 
            borderRadius: 24, 
            padding: "32px 40px", 
            boxShadow: SHADOWS.lg,
            border: `1px solid ${COLORS.border}`,
            position: "relative"
          }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: COLORS.textMuted, fontFamily: "Outfit, sans-serif", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>
              Biology · Advanced Level
            </p>
            <h3
              style={{
                fontSize: 26,
                fontWeight: 800,
                color: COLORS.textPrimary,
                margin: 0,
                lineHeight: 1.4,
                fontFamily: "Outfit, sans-serif",
              }}
            >
              Which statement correctly describes the role of RuBisCO in the Calvin cycle?
            </h3>
          </div>
        </div>

        {/* Options */}
        <div style={{ width: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {options.map((opt, i) => {
            const optOpacity = fadeIn(25 + i * 10, 45 + i * 10);
            const optY = interpolate(sp(25 + i * 10), [0, 1], [20, 0]);
            const isCorrect = opt.correct;
            const showResult = revealCorrect;

            let bgColor = "#fff";
            let borderColor = COLORS.border;
            let textColor = COLORS.textPrimary;
            let shadow = SHADOWS.md;

            if (showResult) {
              if (isCorrect) {
                bgColor = `${COLORS.green}10`;
                borderColor = COLORS.green;
                textColor = COLORS.green;
                shadow = `0 4px 14px ${COLORS.green}33`;
              } else if (i === 1) {
                bgColor = `${COLORS.red}10`;
                borderColor = COLORS.red;
                textColor = COLORS.red;
                shadow = "none";
              }
            }

            return (
              <div
                key={opt.label}
                style={{
                  opacity: optOpacity,
                  transform: `translateY(${optY}px) scale(${isCorrect && showResult ? correctScale : 1})`,
                }}
              >
                <div
                  style={{
                    background: bgColor,
                    border: `2px solid ${borderColor}`,
                    borderRadius: 18,
                    padding: "20px 24px",
                    display: "flex",
                    gap: 18,
                    alignItems: "center",
                    boxShadow: shadow,
                    transition: "all 0.3s ease",
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: showResult
                        ? isCorrect
                          ? COLORS.green
                          : i === 1
                          ? COLORS.red
                          : COLORS.bgCardAlt
                        : COLORS.bgCardAlt,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
                      fontWeight: 800,
                      color: showResult && (isCorrect || i === 1) ? "#fff" : COLORS.textSecondary,
                      fontFamily: "Outfit, sans-serif",
                      flexShrink: 0,
                    }}
                  >
                    {showResult && isCorrect ? "✓" : showResult && i === 1 ? "✗" : opt.label}
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 16,
                      color: textColor,
                      fontWeight: 500,
                      fontFamily: "Outfit, sans-serif",
                      lineHeight: 1.4,
                    }}
                  >
                    {opt.text}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* XP toast */}
        <div
          style={{
            position: "absolute",
            top: 100,
            right: 100,
            opacity: xpOpacity,
            transform: `translateY(${xpY}px) scale(${xpScale})`,
            background: `linear-gradient(135deg, ${COLORS.amber}, ${COLORS.primary})`,
            borderRadius: 20,
            padding: "16px 28px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            boxShadow: `0 12px 32px ${COLORS.amber}44`,
          }}
        >
          <span style={{ fontSize: 28 }}>⚡</span>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.9)", fontFamily: "Outfit, sans-serif", textTransform: "uppercase" }}>Mastered!</p>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 900, color: "#fff", fontFamily: "Outfit, sans-serif" }}>+120 XP</p>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
