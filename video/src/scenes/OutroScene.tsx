import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, GradientBg, DotGrid, Badge } from "./shared";

export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sp = (delay: number, cfg?: object) =>
    spring({ frame: frame - delay, fps, config: { damping: 200, ...cfg } });
  const fadeIn = (start: number, end: number) =>
    interpolate(frame, [start, end], [0, 1], { extrapolateRight: "clamp" });
  const slideIn = (delay: number) => interpolate(sp(delay), [0, 1], [40, 0]);

  const logoScale = spring({ frame, fps, config: { damping: 14, stiffness: 80 } });
  const glowPulse = interpolate(frame % 60, [0, 30, 60], [0.8, 1.2, 0.8]);

  const features = [
    { icon: "📄", label: "Document Upload" },
    { icon: "📖", label: "Learn Mode" },
    { icon: "💬", label: "AI Chat Tutor" },
    { icon: "🧠", label: "Adaptive Quizzes" },
    { icon: "🃏", label: "Flashcards" },
    { icon: "📊", label: "Analytics" },
    { icon: "🔬", label: "3D Simulations" },
    { icon: "🎯", label: "Exam Prep" },
  ];

  return (
    <AbsoluteFill>
      <GradientBg />
      <DotGrid />

      {/* Large central glow */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 800,
          height: 800,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(14,165,233,${0.08 * glowPulse}) 0%, rgba(139,92,246,${0.04 * glowPulse}) 40%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

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
        {/* Logo */}
        <div
          style={{
            transform: `scale(${logoScale})`,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: "50%",
              border: `2px solid ${COLORS.sky}44`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: `radial-gradient(circle, rgba(14,165,233,0.2) 0%, transparent 70%)`,
              boxShadow: `0 0 48px rgba(14,165,233,0.35)`,
              fontSize: 40,
            }}
          >
            🎓
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            opacity: fadeIn(15, 40),
            transform: `translateY(${slideIn(15)}px)`,
            textAlign: "center",
            marginBottom: 16,
          }}
        >
          <h1
            style={{
              fontSize: 80,
              fontWeight: 900,
              color: COLORS.textPrimary,
              margin: 0,
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
          </h1>
        </div>

        {/* Tagline */}
        <div
          style={{
            opacity: fadeIn(35, 60),
            transform: `translateY(${slideIn(35)}px)`,
            textAlign: "center",
            marginBottom: 48,
          }}
        >
          <p
            style={{
              fontSize: 22,
              color: COLORS.textSecondary,
              margin: 0,
              fontFamily: "Outfit, sans-serif",
              fontWeight: 400,
            }}
          >
            Your AI-powered learning companion
          </p>
        </div>

        {/* Feature pills grid */}
        <div
          style={{
            opacity: fadeIn(55, 80),
            transform: `translateY(${slideIn(55)}px)`,
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            justifyContent: "center",
            maxWidth: 700,
            marginBottom: 56,
          }}
        >
          {features.map((f, i) => (
            <div
              key={i}
              style={{
                background: COLORS.bgCard,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 100,
                padding: "8px 20px",
                fontSize: 14,
                color: COLORS.textSecondary,
                fontFamily: "Outfit, sans-serif",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>{f.icon}</span>
              <span>{f.label}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div
          style={{
            opacity: fadeIn(75, 100),
            transform: `scale(${sp(75, { damping: 14, stiffness: 200 })})`,
            marginBottom: 28,
          }}
        >
          <div
            style={{
              background: `linear-gradient(135deg, ${COLORS.sky}, ${COLORS.purple})`,
              borderRadius: 50,
              padding: "18px 56px",
              fontSize: 20,
              fontWeight: 700,
              color: "#fff",
              fontFamily: "Outfit, sans-serif",
              boxShadow: `0 10px 40px rgba(14,165,233,0.45)`,
              letterSpacing: "0.01em",
            }}
          >
            Start Learning Free — studyrag.co
          </div>
        </div>

        {/* Subtitle under CTA */}
        <div style={{ opacity: fadeIn(95, 120) }}>
          <p
            style={{
              fontSize: 14,
              color: COLORS.textMuted,
              fontFamily: "Outfit, sans-serif",
              margin: 0,
            }}
          >
            No credit card required · Works with any PDF or document
          </p>
        </div>
      </div>
    </AbsoluteFill>
  );
};
