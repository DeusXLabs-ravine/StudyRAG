import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, GradientBg, DotGrid, Badge, FeatureCard, IconCircle } from "./shared";

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
    { name: "Biology_Chapter_5.pdf", size: "2.4 MB", icon: "📄", color: COLORS.sky },
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
          alignItems: "center",
          justifyContent: "center",
          padding: "0 120px",
          gap: 80,
        }}
      >
        {/* Left: description */}
        <div style={{ flex: 1, maxWidth: 480 }}>
          <div
            style={{
              opacity: fadeIn(0, 20),
              transform: `translateY(${slideIn(0)}px)`,
              marginBottom: 20,
            }}
          >
            <Badge color={COLORS.sky}>Step 1</Badge>
          </div>
          <div
            style={{
              opacity: fadeIn(10, 35),
              transform: `translateY(${slideIn(10)}px)`,
              marginBottom: 20,
            }}
          >
            <h2
              style={{
                fontSize: 52,
                fontWeight: 800,
                color: COLORS.textPrimary,
                margin: 0,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                fontFamily: "Outfit, sans-serif",
              }}
            >
              Upload Your{" "}
              <span
                style={{
                  background: `linear-gradient(135deg, ${COLORS.sky}, ${COLORS.purple})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Study Materials
              </span>
            </h2>
          </div>
          <div style={{ opacity: fadeIn(30, 55), transform: `translateY(${slideIn(30)}px)` }}>
            <p
              style={{
                fontSize: 18,
                color: COLORS.textSecondary,
                lineHeight: 1.7,
                margin: 0,
                fontFamily: "Outfit, sans-serif",
              }}
            >
              Drop any PDF, Word document, or paste a URL. StudyRAG instantly processes and indexes
              your content for intelligent retrieval.
            </p>
          </div>

          {/* Source types */}
          <div
            style={{
              opacity: fadeIn(50, 75),
              transform: `translateY(${slideIn(50)}px)`,
              display: "flex",
              gap: 12,
              marginTop: 32,
              flexWrap: "wrap",
            }}
          >
            {["PDF", "DOCX", "URL", "Notes"].map((type) => (
              <div
                key={type}
                style={{
                  background: `${COLORS.sky}18`,
                  border: `1px solid ${COLORS.sky}44`,
                  borderRadius: 8,
                  padding: "6px 16px",
                  fontSize: 14,
                  fontWeight: 600,
                  color: COLORS.sky,
                  fontFamily: "Outfit, sans-serif",
                }}
              >
                {type}
              </div>
            ))}
          </div>
        </div>

        {/* Right: upload UI mock */}
        <div style={{ flex: 1, maxWidth: 560 }}>
          {/* Drop zone */}
          <div
            style={{
              opacity: fadeIn(5, 30),
              transform: `translateY(${slideIn(5)}px)`,
            }}
          >
            <FeatureCard
              style={{
                border: `2px dashed ${COLORS.sky}55`,
                borderRadius: 20,
                padding: 40,
                textAlign: "center",
                marginBottom: 20,
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}>☁️</div>
              <p
                style={{
                  color: COLORS.textSecondary,
                  fontSize: 16,
                  margin: "0 0 8px",
                  fontFamily: "Outfit, sans-serif",
                }}
              >
                Drag & drop files here
              </p>
              <p
                style={{
                  color: COLORS.textMuted,
                  fontSize: 13,
                  margin: 0,
                  fontFamily: "Outfit, sans-serif",
                }}
              >
                PDF, DOCX up to 50MB
              </p>
            </FeatureCard>
          </div>

          {/* File list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {files.map((file, i) => {
              const itemOpacity = fadeIn(30 + i * 15, 50 + i * 15);
              const itemY = slideIn(30 + i * 15);
              const isProcessing = i === 0;

              return (
                <div
                  key={file.name}
                  style={{
                    opacity: itemOpacity,
                    transform: `translateY(${itemY}px)`,
                  }}
                >
                  <FeatureCard style={{ padding: "14px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <IconCircle color={file.color} size={40}>
                        {file.icon}
                      </IconCircle>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            margin: "0 0 4px",
                            fontSize: 14,
                            fontWeight: 600,
                            color: COLORS.textPrimary,
                            fontFamily: "Outfit, sans-serif",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {file.name}
                        </p>
                        {isProcessing ? (
                          <div>
                            <div
                              style={{
                                height: 4,
                                background: COLORS.bgCardAlt,
                                borderRadius: 2,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  height: "100%",
                                  width: `${progress}%`,
                                  background: `linear-gradient(90deg, ${COLORS.sky}, ${COLORS.purple})`,
                                  borderRadius: 2,
                                  transition: "none",
                                }}
                              />
                            </div>
                            <p
                              style={{
                                margin: "4px 0 0",
                                fontSize: 12,
                                color: COLORS.sky,
                                fontFamily: "Outfit, sans-serif",
                              }}
                            >
                              Processing... {Math.round(progress)}%
                            </p>
                          </div>
                        ) : (
                          <p
                            style={{
                              margin: 0,
                              fontSize: 12,
                              color: COLORS.textMuted,
                              fontFamily: "Outfit, sans-serif",
                            }}
                          >
                            {file.size} · Ready
                          </p>
                        )}
                      </div>
                      {!isProcessing && (
                        <div
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            background: `${COLORS.green}22`,
                            border: `1px solid ${COLORS.green}55`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                            color: COLORS.green,
                          }}
                        >
                          ✓
                        </div>
                      )}
                    </div>
                  </FeatureCard>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
