import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, GradientBg, DotGrid, Badge, FeatureCard } from "./shared";

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
          padding: "60px 200px",
        }}
      >
        {/* Header */}
        <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, opacity: fadeIn(0, 20) }}>
          <Badge color={COLORS.amber}>Quiz Mode</Badge>
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            <div style={{ fontSize: 13, color: COLORS.textMuted, fontFamily: "Outfit, sans-serif" }}>
              Question <span style={{ color: COLORS.textPrimary, fontWeight: 700 }}>3</span> / 10
            </div>
            <div
              style={{
                background: `${COLORS.amber}18`,
                border: `1px solid ${COLORS.amber}44`,
                borderRadius: 8,
                padding: "6px 14px",
                fontSize: 13,
                color: COLORS.amber,
                fontFamily: "Outfit, sans-serif",
                fontWeight: 600,
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
            height: 4,
            background: COLORS.bgCardAlt,
            borderRadius: 2,
            marginBottom: 36,
            opacity: fadeIn(0, 20),
          }}
        >
          <div style={{ width: "30%", height: "100%", background: `linear-gradient(90deg, ${COLORS.amber}, ${COLORS.sky})`, borderRadius: 2 }} />
        </div>

        {/* Question */}
        <div
          style={{
            width: "100%",
            opacity: fadeIn(10, 35),
            transform: `translateY(${slideIn(10)}px)`,
            marginBottom: 32,
          }}
        >
          <FeatureCard>
            <p style={{ fontSize: 11, fontWeight: 600, color: COLORS.textMuted, fontFamily: "Outfit, sans-serif", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
              Biology · Hard
            </p>
            <h3
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: COLORS.textPrimary,
                margin: 0,
                lineHeight: 1.4,
                fontFamily: "Outfit, sans-serif",
              }}
            >
              Which statement correctly describes the role of RuBisCO in the Calvin cycle?
            </h3>
          </FeatureCard>
        </div>

        {/* Options */}
        <div style={{ width: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {options.map((opt, i) => {
            const optOpacity = fadeIn(25 + i * 10, 45 + i * 10);
            const optY = interpolate(sp(25 + i * 10), [0, 1], [20, 0]);
            const isCorrect = opt.correct;
            const showResult = revealCorrect;

            let bgColor = COLORS.bgCard;
            let borderColor = COLORS.border;
            let textColor = COLORS.textPrimary;

            if (showResult) {
              if (isCorrect) {
                bgColor = `${COLORS.green}18`;
                borderColor = COLORS.green;
                textColor = COLORS.green;
              } else if (i === 1) {
                // Simulate user picked B (wrong)
                bgColor = `${COLORS.red}18`;
                borderColor = COLORS.red;
                textColor = COLORS.red;
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
                    borderRadius: 14,
                    padding: "16px 20px",
                    display: "flex",
                    gap: 14,
                    alignItems: "center",
                    cursor: "pointer",
                    transition: "none",
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: showResult
                        ? isCorrect
                          ? `${COLORS.green}33`
                          : i === 1
                          ? `${COLORS.red}33`
                          : COLORS.bgCardAlt
                        : COLORS.bgCardAlt,
                      border: `1px solid ${borderColor}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      fontWeight: 700,
                      color: textColor,
                      fontFamily: "Outfit, sans-serif",
                      flexShrink: 0,
                    }}
                  >
                    {showResult && isCorrect ? "✓" : showResult && i === 1 ? "✗" : opt.label}
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 15,
                      color: textColor,
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
            top: 80,
            right: 80,
            opacity: xpOpacity,
            transform: `translateY(${xpY}px) scale(${xpScale})`,
            background: `linear-gradient(135deg, ${COLORS.amber}cc, ${COLORS.sky}cc)`,
            borderRadius: 16,
            padding: "12px 24px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            boxShadow: `0 8px 32px rgba(245,158,11,0.3)`,
          }}
        >
          <span style={{ fontSize: 24 }}>⚡</span>
          <div>
            <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.8)", fontFamily: "Outfit, sans-serif" }}>Correct!</p>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#fff", fontFamily: "Outfit, sans-serif" }}>+50 XP</p>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
