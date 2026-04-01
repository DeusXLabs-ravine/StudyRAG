import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Img,
  staticFile,
} from "remotion";
import { COLORS, GradientBg, DotGrid, Badge, SHADOWS } from "./shared";

export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sp = (delay: number, cfg?: object) =>
    spring({ frame: frame - delay, fps, config: { damping: 200, ...cfg } });
  const fadeIn = (start: number, end: number) =>
    interpolate(frame, [start, end], [0, 1], { extrapolateRight: "clamp" });
  const slideIn = (delay: number) => interpolate(sp(delay), [0, 1], [40, 0]);

  const logoScale = spring({ frame, fps, config: { damping: 14, stiffness: 80 } });
  const glowPulse = interpolate(frame % 60, [0, 30, 60], [0.6, 0.9, 0.6]);

  const features = [
    { icon: "📄", label: "Smart Upload" },
    { icon: "📖", label: "Adaptive Learning" },
    { icon: "💬", label: "AI Tutor" },
    { icon: "🧠", label: "Spaced Repetition" },
    { icon: "🃏", label: "Flashcards" },
    { icon: "📊", label: "Analytics" },
    { icon: "🔬", label: "Simulations" },
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
          width: 1000,
          height: 1000,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(14,165,233,${0.1 * glowPulse}) 0%, rgba(139,92,246,${0.05 * glowPulse}) 40%, transparent 70%)`,
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
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 140,
              height: 140,
              borderRadius: 32,
              background: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: SHADOWS.lg,
              border: `1px solid ${COLORS.border}`,
              padding: 24,
            }}
          >
            <Img 
                src={staticFile("/images/logo.png")} 
                style={{ 
                width: "100%", 
                height: "100%", 
                objectFit: "contain" 
                }} 
            />
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            opacity: fadeIn(15, 40),
            transform: `translateY(${slideIn(15)}px)`,
            textAlign: "center",
            marginBottom: 20,
          }}
        >
          <h1
            style={{
              fontSize: 100,
              fontWeight: 900,
              color: COLORS.textPrimary,
              margin: 0,
              lineHeight: 1,
              letterSpacing: "-0.04em",
              fontFamily: "Outfit, sans-serif",
            }}
          >
            Study
            <span
              style={{
                background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.purple})`,
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
            marginBottom: 60,
          }}
        >
          <p
            style={{
              fontSize: 28,
              color: COLORS.textSecondary,
              margin: 0,
              fontFamily: "Outfit, sans-serif",
              fontWeight: 500,
            }}
          >
            Your Personal <span style={{ color: COLORS.primary, fontWeight: 700 }}>Adaptive Learning</span> Companion
          </p>
        </div>

        {/* Feature pills grid */}
        <div
          style={{
            opacity: fadeIn(55, 80),
            transform: `translateY(${slideIn(55)}px)`,
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            justifyContent: "center",
            maxWidth: 800,
            marginBottom: 80,
          }}
        >
          {features.map((f, i) => (
            <div
              key={i}
              style={{
                background: "#fff",
                border: `1px solid ${COLORS.border}`,
                borderRadius: 100,
                padding: "10px 24px",
                fontSize: 16,
                color: COLORS.textSecondary,
                fontFamily: "Outfit, sans-serif",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 10,
                boxShadow: SHADOWS.sm,
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
            marginBottom: 32,
          }}
        >
          <div
            style={{
              background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.purple})`,
              borderRadius: 20,
              padding: "20px 64px",
              fontSize: 24,
              fontWeight: 800,
              color: "#fff",
              fontFamily: "Outfit, sans-serif",
              boxShadow: `0 15px 45px rgba(14,165,233,0.35)`,
              letterSpacing: "0.01em",
            }}
          >
            Join the StudyRAG community
          </div>
        </div>

        {/* Subtitle under CTA */}
        <div style={{ opacity: fadeIn(95, 120) }}>
          <p
            style={{
              fontSize: 16,
              color: COLORS.textMuted,
              fontFamily: "Outfit, sans-serif",
              margin: 0,
              fontWeight: 500,
            }}
          >
            studyrag.co — Adaptive Learning Reimagined
          </p>
        </div>
      </div>
    </AbsoluteFill>
  );
};
