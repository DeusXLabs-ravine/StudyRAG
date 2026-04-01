import React from "react";

// Shared constants and components used across all scenes

export const COLORS = {
  // From frontend/src/index.css light theme
  bg: "#F8FAFC", // 210 40% 98%
  bgCard: "#FFFFFF",
  bgCardAlt: "#F1F5F9",
  primary: "#0EA5E9", // --primary: 221.2 83.2% 53.3% -> using the 500 hex
  primaryDark: "#0284C7",
  secondary: "#F1F5F9", // 210 40% 96.1%
  purple: "#8B5CF6",
  purpleLight: "#A78BFA",
  green: "#10B981",
  amber: "#F59E0B",
  red: "#EF4444",
  textPrimary: "#0F172A", // 222.2 84% 4.9%
  textSecondary: "#475569", // 215.4 16.3% 46.9%
  textMuted: "#94A3B8",
  border: "#E2E8F0", // 214.3 31.8% 91.4%
  borderLight: "#F1F5F9",
  
  // Chalkboard / Learning Board theme
  boardBg: "#1C352D",
  boardBorder: "#4A3423",
  boardLedge: "#5A4433",
  boardText: "#F8F8F8",
};

export const FONTS = {
  outfit: "'Outfit', sans-serif",
  kalam: "'Kalam', cursive",
};

export const SHADOWS = {
  sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
  lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
};

// Updated Gradient background to a lighter, cleaner look
export const GradientBg: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      background: `radial-gradient(circle at 0% 0%, rgba(14, 165, 233, 0.05) 0%, transparent 50%), radial-gradient(circle at 100% 100%, rgba(139, 92, 246, 0.05) 0%, transparent 50%), ${COLORS.bg}`,
    }}
  >
    {children}
  </div>
);

// Glowing dot pattern background (more subtle for light theme)
export const DotGrid: React.FC = () => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      backgroundImage: `radial-gradient(circle, rgba(148, 163, 184, 0.12) 1px, transparent 1px)`,
      backgroundSize: "40px 40px",
      pointerEvents: "none",
    }}
  />
);

// Section label badge
export const Badge: React.FC<{ color?: string; children: React.ReactNode }> = ({
  color = COLORS.primary,
  children,
}) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      background: `${color}10`,
      border: `1px solid ${color}33`,
      borderRadius: 100,
      padding: "6px 16px",
      fontSize: 14,
      fontWeight: 600,
      color,
      letterSpacing: "0.02em",
      boxShadow: SHADOWS.sm,
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
      borderRadius: 20,
      padding: "24px 28px",
      boxShadow: SHADOWS.md,
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
