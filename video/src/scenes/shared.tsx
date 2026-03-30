import React from "react";

// Shared constants and components used across all scenes

export const COLORS = {
  bg: "#0a0f1e",
  bgCard: "#0f1729",
  bgCardAlt: "#141d35",
  sky: "#0EA5E9",
  skyLight: "#38bdf8",
  skyDark: "#0284c7",
  purple: "#8B5CF6",
  purpleLight: "#a78bfa",
  green: "#22c55e",
  amber: "#f59e0b",
  red: "#ef4444",
  textPrimary: "#f1f5f9",
  textSecondary: "#94a3b8",
  textMuted: "#64748b",
  border: "#1e2d4a",
  borderLight: "#243456",
};

export const FONTS = {
  outfit: "'Outfit', sans-serif",
};

// Gradient background used on most scenes
export const GradientBg: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      background: `radial-gradient(ellipse 120% 80% at 50% -10%, rgba(14,165,233,0.12) 0%, transparent 60%), radial-gradient(ellipse 80% 60% at 80% 100%, rgba(139,92,246,0.10) 0%, transparent 50%), ${COLORS.bg}`,
    }}
  >
    {children}
  </div>
);

// Glowing dot pattern background
export const DotGrid: React.FC = () => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      backgroundImage: `radial-gradient(circle, rgba(148,163,184,0.07) 1px, transparent 1px)`,
      backgroundSize: "40px 40px",
      pointerEvents: "none",
    }}
  />
);

// Section label badge
export const Badge: React.FC<{ color?: string; children: React.ReactNode }> = ({
  color = COLORS.sky,
  children,
}) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      background: `${color}22`,
      border: `1px solid ${color}55`,
      borderRadius: 100,
      padding: "4px 14px",
      fontSize: 13,
      fontWeight: 600,
      color,
      letterSpacing: "0.04em",
      textTransform: "uppercase",
    }}
  >
    {children}
  </div>
);

// Feature card shell
export const FeatureCard: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ children, style }) => (
  <div
    style={{
      background: COLORS.bgCard,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 16,
      padding: "24px 28px",
      ...style,
    }}
  >
    {children}
  </div>
);

// Icon circle
export const IconCircle: React.FC<{ color: string; children: React.ReactNode; size?: number }> = ({
  color,
  children,
  size = 48,
}) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: `${color}22`,
      border: `1px solid ${color}55`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: size * 0.44,
      flexShrink: 0,
    }}
  >
    {children}
  </div>
);
