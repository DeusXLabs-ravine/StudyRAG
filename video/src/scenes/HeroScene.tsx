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
  const glowPulse = interpolate(frame % 60, [0, 30, 60], [0.4, 0.7, 0.4]);

  const features = ["📄 Upload Any Document", "🤖 AI-Powered Learning", "📊 Track Progress", "🎯 Adaptive Quizzes"];

  return (
    <AbsoluteFill>
      <GradientBg />
      <DotGrid />

      {/* Central glow */}
      <div
        style={{
          position: "absolute",
          top: "45%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 800,
          height: 800,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(14,165,233,${0.08 * glowPulse}) 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      {/* Logo Container */}
      <div
        style={{
          position: "absolute",
          top: "22%",
          left: "50%",
          transform: `translateX(-50%) scale(${ringScale})`,
          opacity: ringOpacity,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
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
          paddingTop: 120,
        }}
      >
        {/* Badge */}
        <div style={{ opacity: badgeOpacity, transform: `translateY(${badgeY}px)`, marginBottom: 24 }}>
          <Badge color={COLORS.primary}>Adaptive Learning Reimagined</Badge>
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
              fontSize: 100,
              fontWeight: 900,
              color: COLORS.textPrimary,
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
          </span>
        </div>

        {/* Subtitle */}
        <div
          style={{
            opacity: subtitleOpacity,
            transform: `translateY(${subtitleY}px)`,
            textAlign: "center",
            maxWidth: 720,
            marginBottom: 48,
          }}
        >
          <p
            style={{
              fontSize: 26,
              color: COLORS.textSecondary,
              lineHeight: 1.5,
              margin: 0,
              fontFamily: "Outfit, sans-serif",
              fontWeight: 400,
            }}
          >
            The world's first <span style={{ color: COLORS.primary, fontWeight: 600 }}>Adaptive RAG</span> study platform.
            Upload documents and start learning with AI.
          </p>
        </div>

        {/* CTA Button */}
        <div
          style={{
            opacity: ctaOpacity,
            transform: `scale(${ctaScale})`,
            marginBottom: 60,
          }}
        >
          <div
            style={{
              background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.purple})`,
              borderRadius: 16,
              padding: "18px 48px",
              fontSize: 22,
              fontWeight: 700,
              color: "#fff",
              fontFamily: "Outfit, sans-serif",
              boxShadow: `0 12px 40px rgba(14,165,233,0.3)`,
              letterSpacing: "0.01em",
            }}
          >
            Get Started Free
          </div>
        </div>

        {/* Feature pills */}
        <div
          style={{
            opacity: pillsOpacity,
            transform: `translateY(${pillsY}px)`,
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {features.map((f, i) => (
            <div
              key={i}
              style={{
                background: COLORS.bgCard,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 100,
                padding: "10px 24px",
                fontSize: 16,
                color: COLORS.textSecondary,
                fontFamily: "Outfit, sans-serif",
                fontWeight: 500,
                boxShadow: SHADOWS.sm,
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
