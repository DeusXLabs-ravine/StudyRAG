import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
} from "remotion";
import { COLORS, GradientBg, DotGrid, Badge } from "./shared";

export const HeroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo ring pulse
  const ringScale = spring({ frame, fps, config: { damping: 14, stiffness: 80 } });
  const ringOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  // Badge entrance
  const badgeY = interpolate(
    spring({ frame: frame - 5, fps, config: { damping: 200 } }),
    [0, 1],
    [30, 0]
  );
  const badgeOpacity = interpolate(frame, [5, 25], [0, 1], { extrapolateRight: "clamp" });

  // Title word by word
  const titleOpacity = interpolate(frame, [20, 45], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(
    spring({ frame: frame - 20, fps, config: { damping: 200 } }),
    [0, 1],
    [40, 0]
  );

  // Subtitle
  const subtitleOpacity = interpolate(frame, [45, 70], [0, 1], { extrapolateRight: "clamp" });
  const subtitleY = interpolate(
    spring({ frame: frame - 45, fps, config: { damping: 200 } }),
    [0, 1],
    [30, 0]
  );

  // CTA button
  const ctaOpacity = interpolate(frame, [65, 90], [0, 1], { extrapolateRight: "clamp" });
  const ctaScale = spring({ frame: frame - 65, fps, config: { damping: 16, stiffness: 180 } });

  // Feature pills
  const pillsOpacity = interpolate(frame, [85, 110], [0, 1], { extrapolateRight: "clamp" });
  const pillsY = interpolate(
    spring({ frame: frame - 85, fps, config: { damping: 200 } }),
    [0, 1],
    [20, 0]
  );

  // Animated glow pulse
  const glowPulse = interpolate(frame % 60, [0, 30, 60], [0.7, 1, 0.7]);

  const features = ["📄 Upload Any Document", "🤖 AI-Powered Learning", "📊 Track Progress", "🎯 Adaptive Quizzes"];

  return (
    <AbsoluteFill>
      <GradientBg />
      <DotGrid />

      {/* Central glow */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(14,165,233,${0.06 * glowPulse}) 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      {/* Logo circle */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: `translate(-50%, -50%) scale(${ringScale})`,
          opacity: ringOpacity,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 0,
          marginTop: -60,
        }}
      >
        {/* Outer ring */}
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: "50%",
            border: `2px solid ${COLORS.sky}44`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: `radial-gradient(circle, rgba(14,165,233,0.15) 0%, transparent 70%)`,
            boxShadow: `0 0 40px rgba(14,165,233,0.3)`,
            marginBottom: 32,
          }}
        >
          <span style={{ fontSize: 44 }}>🎓</span>
        </div>
      </div>

      {/* Content stack */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 0,
        }}
      >
        {/* Badge */}
        <div style={{ opacity: badgeOpacity, transform: `translateY(${badgeY}px)`, marginBottom: 24 }}>
          <Badge color={COLORS.sky}>AI-Powered Study Platform</Badge>
        </div>

        {/* Main title */}
        <div
          style={{
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            textAlign: "center",
            marginBottom: 20,
          }}
        >
          <span
            style={{
              fontSize: 88,
              fontWeight: 800,
              color: COLORS.textPrimary,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              fontFamily: "Outfit, sans-serif",
            }}
          >
            Study
            <span
              style={{
                background: `linear-gradient(135deg, ${COLORS.sky}, ${COLORS.purple})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              RAG
            </span>
          </span>
        </div>

        {/* Subtitle */}
        <div
          style={{
            opacity: subtitleOpacity,
            transform: `translateY(${subtitleY}px)`,
            textAlign: "center",
            maxWidth: 640,
            marginBottom: 40,
          }}
        >
          <p
            style={{
              fontSize: 24,
              color: COLORS.textSecondary,
              lineHeight: 1.6,
              margin: 0,
              fontFamily: "Outfit, sans-serif",
              fontWeight: 400,
            }}
          >
            Transform any document into an interactive learning experience with{" "}
            <span style={{ color: COLORS.skyLight, fontWeight: 600 }}>AI-powered</span> quizzes,
            flashcards, and personalized tutoring.
          </p>
        </div>

        {/* CTA Button */}
        <div
          style={{
            opacity: ctaOpacity,
            transform: `scale(${ctaScale})`,
            marginBottom: 48,
          }}
        >
          <div
            style={{
              background: `linear-gradient(135deg, ${COLORS.sky}, ${COLORS.purple})`,
              borderRadius: 50,
              padding: "16px 40px",
              fontSize: 18,
              fontWeight: 700,
              color: "#fff",
              fontFamily: "Outfit, sans-serif",
              boxShadow: `0 8px 32px rgba(14,165,233,0.4)`,
              letterSpacing: "0.01em",
            }}
          >
            studyrag.co →
          </div>
        </div>

        {/* Feature pills */}
        <div
          style={{
            opacity: pillsOpacity,
            transform: `translateY(${pillsY}px)`,
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {features.map((f, i) => (
            <div
              key={i}
              style={{
                background: `${COLORS.bgCard}`,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 100,
                padding: "8px 20px",
                fontSize: 14,
                color: COLORS.textSecondary,
                fontFamily: "Outfit, sans-serif",
                fontWeight: 500,
              }}
            >
              {f}
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
