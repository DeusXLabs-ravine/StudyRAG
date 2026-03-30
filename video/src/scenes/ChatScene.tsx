import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, GradientBg, DotGrid, Badge, FeatureCard } from "./shared";

type Message = {
  role: "user" | "ai";
  text: string;
  citation?: string;
  appearAt: number;
};

export const ChatScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sp = (delay: number) =>
    spring({ frame: frame - delay, fps, config: { damping: 200 } });
  const fadeIn = (start: number, end: number) =>
    interpolate(frame, [start, end], [0, 1], { extrapolateRight: "clamp" });
  const slideIn = (delay: number) => interpolate(sp(delay), [0, 1], [40, 0]);

  const messages: Message[] = [
    {
      role: "user",
      text: "What is the role of RuBisCO in the Calvin cycle?",
      appearAt: 20,
    },
    {
      role: "ai",
      text: "RuBisCO (Ribulose-1,5-bisphosphate carboxylase/oxygenase) is the primary enzyme in the Calvin cycle responsible for carbon fixation. It catalyzes the reaction between CO₂ and RuBP to form two molecules of 3-phosphoglycerate.",
      citation: "Biology_Chapter_5.pdf · p.142",
      appearAt: 50,
    },
    {
      role: "user",
      text: "How many ATP molecules does one cycle consume?",
      appearAt: 90,
    },
    {
      role: "ai",
      text: "Each turn of the Calvin cycle consumes 3 ATP and 2 NADPH. To produce one molecule of G3P (glyceraldehyde-3-phosphate), the cycle must turn 3 times, consuming 9 ATP and 6 NADPH total.",
      citation: "Biology_Chapter_5.pdf · p.148",
      appearAt: 110,
    },
  ];

  // Typewriter for last AI message
  const lastAiMsg = messages[messages.length - 1];
  const aiCharCount = Math.floor(
    interpolate(frame, [lastAiMsg.appearAt + 5, lastAiMsg.appearAt + 70], [0, lastAiMsg.text.length], {
      extrapolateRight: "clamp",
    })
  );

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
          padding: "60px 120px",
          gap: 80,
        }}
      >
        {/* Left: label */}
        <div style={{ width: 320 }}>
          <div style={{ opacity: fadeIn(0, 20), transform: `translateY(${slideIn(0)}px)`, marginBottom: 20 }}>
            <Badge color={COLORS.purple}>Chat Mode</Badge>
          </div>
          <h2
            style={{
              opacity: fadeIn(10, 35),
              fontSize: 52,
              fontWeight: 800,
              color: COLORS.textPrimary,
              margin: "0 0 20px",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              fontFamily: "Outfit, sans-serif",
            }}
          >
            Ask Your{" "}
            <span style={{ background: `linear-gradient(135deg, ${COLORS.purple}, ${COLORS.sky})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              AI Tutor
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
            Get instant, context-aware answers with direct citations from your documents. No hallucinations — every answer is grounded in your study materials.
          </p>

          {/* Features */}
          <div style={{ opacity: fadeIn(55, 80), display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { icon: "🔗", label: "Source Citations" },
              { icon: "🔍", label: "Web Search Mode" },
              { icon: "🧮", label: "Math & Formula Support" },
              { icon: "🎙️", label: "Voice Input" },
            ].map(({ icon, label }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>{icon}</span>
                <span style={{ fontSize: 15, color: COLORS.textSecondary, fontFamily: "Outfit, sans-serif" }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: chat UI */}
        <div style={{ flex: 1, maxWidth: 640 }}>
          <FeatureCard style={{ borderRadius: 20, padding: 0, overflow: "hidden", height: 520 }}>
            {/* Chat header */}
            <div
              style={{
                padding: "16px 24px",
                borderBottom: `1px solid ${COLORS.border}`,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${COLORS.sky}, ${COLORS.purple})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                🤖
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: COLORS.textPrimary, fontFamily: "Outfit, sans-serif" }}>AI Tutor</p>
                <p style={{ margin: 0, fontSize: 12, color: COLORS.green, fontFamily: "Outfit, sans-serif" }}>● Online</p>
              </div>
              <div style={{ marginLeft: "auto", fontSize: 12, color: COLORS.textMuted, fontFamily: "Outfit, sans-serif" }}>
                Biology_Chapter_5.pdf
              </div>
            </div>

            {/* Messages */}
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16, overflowY: "hidden" }}>
              {messages.map((msg, i) => {
                const isLast = i === messages.length - 1;
                const msgOpacity = fadeIn(msg.appearAt, msg.appearAt + 15);
                const msgY = interpolate(
                  spring({ frame: frame - msg.appearAt, fps, config: { damping: 200 } }),
                  [0, 1],
                  [20, 0]
                );

                const isUser = msg.role === "user";

                return (
                  <div
                    key={i}
                    style={{
                      opacity: msgOpacity,
                      transform: `translateY(${msgY}px)`,
                      display: "flex",
                      justifyContent: isUser ? "flex-end" : "flex-start",
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "80%",
                        background: isUser
                          ? `linear-gradient(135deg, ${COLORS.sky}cc, ${COLORS.purple}cc)`
                          : COLORS.bgCardAlt,
                        border: isUser ? "none" : `1px solid ${COLORS.border}`,
                        borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                        padding: "12px 16px",
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontSize: 14,
                          color: isUser ? "#fff" : COLORS.textPrimary,
                          lineHeight: 1.6,
                          fontFamily: "Outfit, sans-serif",
                        }}
                      >
                        {isLast && !isUser ? msg.text.slice(0, aiCharCount) : msg.text}
                        {isLast && !isUser && aiCharCount < msg.text.length && (
                          <span style={{ display: "inline-block", width: 2, height: 14, background: COLORS.sky, marginLeft: 2, opacity: Math.round(frame / 8) % 2, verticalAlign: "middle" }} />
                        )}
                      </p>
                      {msg.citation && !isUser && (
                        <div
                          style={{
                            marginTop: 8,
                            padding: "4px 10px",
                            background: `${COLORS.sky}18`,
                            border: `1px solid ${COLORS.sky}33`,
                            borderRadius: 6,
                            fontSize: 11,
                            color: COLORS.sky,
                            fontFamily: "Outfit, sans-serif",
                          }}
                        >
                          📎 {msg.citation}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input bar */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                padding: "12px 20px",
                borderTop: `1px solid ${COLORS.border}`,
                display: "flex",
                gap: 12,
                alignItems: "center",
                background: COLORS.bgCard,
              }}
            >
              <div
                style={{
                  flex: 1,
                  background: COLORS.bgCardAlt,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 10,
                  padding: "10px 16px",
                  fontSize: 13,
                  color: COLORS.textMuted,
                  fontFamily: "Outfit, sans-serif",
                }}
              >
                Ask anything about your documents...
              </div>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: `linear-gradient(135deg, ${COLORS.sky}, ${COLORS.purple})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                }}
              >
                ↑
              </div>
            </div>
          </FeatureCard>
        </div>
      </div>
    </AbsoluteFill>
  );
};
