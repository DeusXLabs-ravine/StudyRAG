import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, GradientBg, DotGrid, Badge, FeatureCard, SHADOWS } from "./shared";

export const UploadScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sp = (delay: number, config?: object) =>
    spring({ frame: frame - delay, fps, config: { damping: 200, ...config } });

  const fadeIn = (start: number, end: number) =>
    interpolate(frame, [start, end], [0, 1], { extrapolateRight: "clamp" });

  const slideIn = (delay: number) => interpolate(sp(delay), [0, 1], [40, 0]);

  // Simulate upload progress bar
  const progress = interpolate(frame, [60, 120], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // File items stagger
  const files = [
    { name: "Biology_Chapter_5.pdf", size: "2.4 MB", icon: "📄", color: COLORS.primary },
    { name: "Chemistry_Notes.docx", size: "1.1 MB", icon: "📝", color: COLORS.purple },
    { name: "Physics_Textbook.pdf", size: "8.7 MB", icon: "📘", color: COLORS.green },
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
        {/* Left: Info & Sidebar */}
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
            <Badge color={COLORS.primary}>Step 1: Upload</Badge>
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
              Upload Status
            </h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {files.map((file, i) => {
                const itemOpacity = fadeIn(30 + i * 15, 50 + i * 15);
                const isProcessing = i === 0;

                return (
                  <div key={file.name} style={{ 
                    opacity: itemOpacity, 
                    display: "flex", 
                    alignItems: "center", 
                    gap: 12, 
                    padding: "12px 16px", 
                    background: isProcessing ? `${COLORS.primary}08` : COLORS.bgCardAlt, 
                    borderRadius: 16,
                    border: isProcessing ? `1px solid ${COLORS.primary}33` : `1px solid transparent`
                  }}>
                    <div style={{ fontSize: 24 }}>{file.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: COLORS.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</p>
                      <p style={{ margin: 0, fontSize: 11, color: isProcessing ? COLORS.primary : COLORS.textMuted, fontWeight: 600 }}>
                        {isProcessing ? `Processing ${Math.round(progress)}%` : "Ready to study"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: "auto", background: `linear-gradient(135deg, ${COLORS.primary}10, ${COLORS.purple}10)`, borderRadius: 16, padding: 16, border: `1px dashed ${COLORS.primary}33` }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: COLORS.primary, marginBottom: 4 }}>⚡ AI Engine</p>
                <p style={{ margin: 0, fontSize: 11, color: COLORS.textSecondary }}>Extracting concepts, formulas, and visual diagrams...</p>
            </div>
          </div>
        </div>

        {/* Right: Main Content Area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 32, justifyContent: "center" }}>
          <div style={{ opacity: fadeIn(10, 35), transform: `translateY(${slideIn(10)}px)` }}>
            <h2
              style={{
                fontSize: 64,
                fontWeight: 900,
                color: COLORS.textPrimary,
                margin: "0 0 20px",
                lineHeight: 1.1,
                letterSpacing: "-0.04em",
                fontFamily: "Outfit, sans-serif",
              }}
            >
              Bring Your Own{" "}
              <span
                style={{
                  background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.purple})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Knowledge
              </span>
            </h2>
            <p
              style={{
                fontSize: 22,
                color: COLORS.textSecondary,
                lineHeight: 1.6,
                margin: 0,
                maxWidth: 640,
                fontFamily: "Outfit, sans-serif",
                fontWeight: 400,
              }}
            >
              Drop any PDF, document, or URL. StudyRAG instantly creates an 
              <span style={{ color: COLORS.primary, fontWeight: 600 }}> adaptive learning path</span> for you.
            </p>
          </div>

          {/* Upload Box mockup */}
          <div
            style={{
              opacity: fadeIn(25, 50),
              transform: `translateY(${slideIn(25)}px)`,
            }}
          >
            <div
              style={{
                background: "#fff",
                border: `3px dashed ${COLORS.primary}44`,
                borderRadius: 32,
                padding: "60px 40px",
                textAlign: "center",
                boxShadow: SHADOWS.lg,
                position: "relative",
                overflow: "hidden"
              }}
            >
              <div style={{ 
                width: 100, 
                height: 100, 
                borderRadius: "50%", 
                background: `${COLORS.primary}10`, 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                fontSize: 48,
                margin: "0 auto 24px",
                color: COLORS.primary
              }}>
                ☁️
              </div>
              <h3 style={{ fontSize: 24, fontWeight: 800, color: COLORS.textPrimary, margin: "0 0 8px" }}>
                Select Study Materials
              </h3>
              <p style={{ fontSize: 16, color: COLORS.textMuted, margin: 0 }}>
                Drop files here or click to browse (PDF, DOCX, TXT)
              </p>

              {/* Progress bar overlay for the demo */}
              {frame > 60 && (
                  <div style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: 8,
                      background: COLORS.bgCardAlt,
                      overflow: "hidden"
                  }}>
                      <div style={{
                          width: `${progress}%`,
                          height: "100%",
                          background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.purple})`,
                          borderRadius: "0 4px 4px 0"
                      }} />
                  </div>
              )}
            </div>
          </div>

          {/* Supported Types */}
          <div style={{ display: "flex", gap: 16, opacity: fadeIn(50, 75) }}>
            {["PDF Documents", "Text Files", "Web URLs", "Lecture Notes"].map((type, i) => (
              <div key={i} style={{ 
                padding: "10px 20px", 
                background: COLORS.bgCardAlt, 
                borderRadius: 100, 
                fontSize: 14, 
                fontWeight: 600, 
                color: COLORS.textSecondary,
                border: `1px solid ${COLORS.border}`
              }}>
                {type}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
