import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, GradientBg, DotGrid, Badge, FeatureCard } from "./shared";

export const AnalyticsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sp = (delay: number) =>
    spring({ frame: frame - delay, fps, config: { damping: 200 } });
  const fadeIn = (start: number, end: number) =>
    interpolate(frame, [start, end], [0, 1], { extrapolateRight: "clamp" });
  const slideIn = (delay: number) => interpolate(sp(delay), [0, 1], [40, 0]);

  // Mastery score counting up
  const masteryScore = Math.round(
    interpolate(frame, [30, 90], [0, 87], { extrapolateRight: "clamp" })
  );

  // Bar chart data
  const topics = [
    { name: "Photosynthesis", score: 92, color: COLORS.green },
    { name: "Cell Division", score: 78, color: COLORS.sky },
    { name: "Genetics", score: 65, color: COLORS.purple },
    { name: "Evolution", score: 45, color: COLORS.amber },
  ];

  // Animate bars
  const barProgress = interpolate(frame, [50, 110], [0, 1], { extrapolateRight: "clamp" });

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
          padding: "60px 100px",
          gap: 48,
        }}
      >
        {/* Left: label + description */}
        <div style={{ width: 320 }}>
          <div style={{ opacity: fadeIn(0, 20), marginBottom: 20 }}>
            <Badge color={COLORS.purple}>Analytics</Badge>
          </div>
          <h2
            style={{
              opacity: fadeIn(10, 35),
              transform: `translateY(${slideIn(10)}px)`,
              fontSize: 52,
              fontWeight: 800,
              color: COLORS.textPrimary,
              margin: "0 0 20px",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              fontFamily: "Outfit, sans-serif",
            }}
          >
            Track Your{" "}
            <span style={{ background: `linear-gradient(135deg, ${COLORS.purple}, ${COLORS.sky})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Progress
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
            Real-time mastery tracking across every topic. Identify weak areas and focus your study time where it matters most.
          </p>

          {/* Quick stats */}
          <div style={{ opacity: fadeIn(50, 75), display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { icon: "🏆", label: "Overall Mastery", value: `${masteryScore}%`, color: COLORS.green },
              { icon: "🔥", label: "Study Streak", value: "12 days", color: COLORS.amber },
              { icon: "⚡", label: "XP Earned", value: "2,840", color: COLORS.sky },
            ].map(({ icon, label, value, color }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ fontSize: 20 }}>{icon}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 13, color: COLORS.textMuted, fontFamily: "Outfit, sans-serif" }}>{label}</p>
                </div>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color, fontFamily: "Outfit, sans-serif" }}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: charts */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Mastery score ring + label */}
          <div style={{ display: "flex", gap: 20 }}>
            {/* Score card */}
            <FeatureCard
              style={{
                opacity: fadeIn(15, 40),
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "28px 24px",
                background: `linear-gradient(135deg, ${COLORS.bgCard}, ${COLORS.bgCardAlt})`,
              }}
            >
              <p style={{ margin: "0 0 8px", fontSize: 11, color: COLORS.textMuted, fontFamily: "Outfit, sans-serif", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Mastery Score
              </p>
              <div
                style={{
                  fontSize: 72,
                  fontWeight: 900,
                  background: `linear-gradient(135deg, ${COLORS.green}, ${COLORS.sky})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  fontFamily: "Outfit, sans-serif",
                  lineHeight: 1,
                  marginBottom: 8,
                }}
              >
                {masteryScore}
                <span style={{ fontSize: 32 }}>%</span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: COLORS.green, fontFamily: "Outfit, sans-serif", fontWeight: 500 }}>
                ↑ 12% this week
              </p>
            </FeatureCard>

            {/* Streak card */}
            <FeatureCard
              style={{
                opacity: fadeIn(20, 45),
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "28px 24px",
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 8 }}>🔥</div>
              <p style={{ margin: "0 0 4px", fontSize: 36, fontWeight: 800, color: COLORS.amber, fontFamily: "Outfit, sans-serif" }}>12</p>
              <p style={{ margin: 0, fontSize: 13, color: COLORS.textMuted, fontFamily: "Outfit, sans-serif", textTransform: "uppercase", letterSpacing: "0.04em" }}>Day Streak</p>
            </FeatureCard>
          </div>

          {/* Topic breakdown bars */}
          <FeatureCard style={{ opacity: fadeIn(35, 60) }}>
            <p style={{ margin: "0 0 20px", fontSize: 14, fontWeight: 600, color: COLORS.textPrimary, fontFamily: "Outfit, sans-serif" }}>
              Topic Mastery Breakdown
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {topics.map((topic, i) => {
                const barDelay = 50 + i * 15;
                const barWidth = interpolate(frame, [barDelay, barDelay + 40], [0, topic.score], { extrapolateRight: "clamp" });

                return (
                  <div key={topic.name}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 13, color: COLORS.textSecondary, fontFamily: "Outfit, sans-serif" }}>
                        {topic.name}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: topic.color, fontFamily: "Outfit, sans-serif" }}>
                        {Math.round(barWidth)}%
                      </span>
                    </div>
                    <div style={{ height: 8, background: COLORS.bgCardAlt, borderRadius: 4, overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${barWidth}%`,
                          height: "100%",
                          background: topic.color,
                          borderRadius: 4,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </FeatureCard>

          {/* Weak areas */}
          <FeatureCard style={{ opacity: fadeIn(80, 105) }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 20 }}>🎯</span>
              <div>
                <p style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 600, color: COLORS.textPrimary, fontFamily: "Outfit, sans-serif" }}>
                  Recommended Focus
                </p>
                <p style={{ margin: 0, fontSize: 13, color: COLORS.textSecondary, fontFamily: "Outfit, sans-serif" }}>
                  Spend more time on <span style={{ color: COLORS.amber, fontWeight: 600 }}>Evolution</span> — only 45% mastery. StudyRAG has prepared 8 targeted exercises.
                </p>
              </div>
            </div>
          </FeatureCard>
        </div>
      </div>
    </AbsoluteFill>
  );
};
