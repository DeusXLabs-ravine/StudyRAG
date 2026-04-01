import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, GradientBg, DotGrid, Badge, FeatureCard, SHADOWS } from "./shared";

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
        {/* Sidebar - App-like Sidebar */}
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
            <Badge color={COLORS.primary}>AI Tutor Assistant</Badge>
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
            gap: 16
          }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: COLORS.textMuted, margin: 0, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Knowledge Sources
            </h3>
            {[
              { icon: "📄", name: "Biology_Ch5.pdf", size: "2.4MB" },
              { icon: "🌐", name: "Photosynthesis Web", size: "Ext" },
              { icon: "🧪", name: "Lab_Report_04.docx", size: "1.1MB" },
            ].map((doc, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0" }}>
                <span style={{ fontSize: 20 }}>{doc.icon}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: COLORS.textPrimary }}>{doc.name}</p>
                  <p style={{ margin: 0, fontSize: 11, color: COLORS.textMuted }}>{doc.size}</p>
                </div>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.green }} />
              </div>
            ))}

            <div style={{ marginTop: "auto", background: COLORS.bgCardAlt, borderRadius: 12, padding: 12 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: COLORS.primary, textTransform: "uppercase", marginBottom: 8 }}>AI Mode</p>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: COLORS.primary, boxShadow: `0 0 8px ${COLORS.primary}` }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.textSecondary }}>Context-Aware</span>
                </div>
            </div>
          </div>
        </div>

        {/* Chat Interface */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#fff", borderRadius: 24, boxShadow: SHADOWS.lg, border: `1px solid ${COLORS.border}`, overflow: "hidden" }}>
          {/* Chat Header */}
          <div style={{ padding: "16px 24px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ 
                width: 44, 
                height: 44, 
                borderRadius: "50%", 
                background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.purple})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                boxShadow: `0 4px 12px ${COLORS.primary}33`
            }}>🤖</div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: COLORS.textPrimary, margin: 0 }}>StudyRAG AI Tutor</h2>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS.green }} />
                <span style={{ fontSize: 12, color: COLORS.textMuted }}>Active Learning Enabled</span>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, padding: "32px", display: "flex", flexDirection: "column", gap: 24 }}>
            {messages.map((msg, i) => {
              const isAi = msg.role === "ai";
              const opacity = fadeIn(msg.appearAt, msg.appearAt + 15);
              const y = slideIn(msg.appearAt);

              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: isAi ? "flex-start" : "flex-end",
                    opacity,
                    transform: `translateY(${y}px)`,
                  }}
                >
                  <div
                    style={{
                      maxWidth: "85%",
                      padding: "16px 20px",
                      borderRadius: isAi ? "24px 24px 24px 4px" : "24px 24px 4px 24px",
                      background: isAi ? COLORS.secondary : COLORS.primary,
                      color: isAi ? COLORS.textPrimary : "#fff",
                      boxShadow: SHADOWS.sm,
                      fontSize: 15,
                      lineHeight: 1.6,
                      fontFamily: "Outfit, sans-serif",
                    }}
                  >
                    {isAi && (
                        <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ padding: "4px 10px", background: "#fff", borderRadius: 100, fontSize: 11, fontWeight: 700, color: COLORS.primary, boxShadow: SHADOWS.sm, border: `1px solid ${COLORS.border}` }}>
                                📎 Biology_Ch5.pdf · p.142
                            </div>
                        </div>
                    )}
                    {isAi ? (
                        <>
                            {msg.text.slice(0, Math.floor(interpolate(frame, [msg.appearAt + 5, msg.appearAt + 60], [0, msg.text.length], { extrapolateRight: "clamp" })))}
                            {frame < msg.appearAt + 60 && (
                                <span style={{ display: "inline-block", width: 2, height: 16, background: COLORS.primary, marginLeft: 2, opacity: Math.round(frame / 6) % 2, verticalAlign: "middle" }} />
                            )}
                        </>
                    ) : msg.text}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input Area */}
          <div style={{ padding: "24px", borderTop: `1px solid ${COLORS.border}`, background: COLORS.bg }}>
            <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 100, padding: "14px 24px", display: "flex", alignItems: "center", gap: 16, boxShadow: SHADOWS.md }}>
               <span style={{ color: COLORS.textMuted, fontSize: 15 }}>Ask a follow-up about carbon fixation...</span>
               <div style={{ marginLeft: "auto", width: 36, height: 36, borderRadius: "50%", background: COLORS.primary, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: `0 4px 12px ${COLORS.primary}44` }}>↑</div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
