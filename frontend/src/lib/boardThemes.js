// Board Theme System
// Central config for chalkboard, whiteboard, and notebook theme variants.

export const BOARD_TYPES = [
  { id: 'chalkboard', label: 'Chalkboard', description: 'Classic chalk on board' },
  { id: 'whiteboard', label: 'Whiteboard', description: 'Markers on a clean surface' },
  { id: 'notebook', label: 'Notebook', description: 'Pencil on paper' },
];

export const BOARD_COLORS = {
  chalkboard: [
    { id: 'green', label: 'Green', hex: '#1c352d' },
    { id: 'black', label: 'Black', hex: '#1a1a1a' },
  ],
  notebook: [
    { id: 'yellow', label: 'Yellow', hex: '#fef9e7' },
    { id: 'white', label: 'White', hex: '#ffffff' },
  ],
};

export const CHALK_COLORS = [
  { id: 'white', label: 'White', hex: '#f8f8f8' },
  { id: 'yellow', label: 'Yellow', hex: '#fde68a' },
  { id: 'pink', label: 'Pink', hex: '#f9a8d4' },
  { id: 'multi', label: 'Multi', hex: 'linear-gradient(135deg,#f8f8f8,#fde68a,#f9a8d4,#93c5fd)' },
];

export const MARKER_COLORS = [
  { id: 'black', label: 'Black', hex: '#1a1a1a' },
  { id: 'blue', label: 'Blue', hex: '#2563eb' },
  { id: 'green', label: 'Green', hex: '#16a34a' },
  { id: 'red', label: 'Red', hex: '#dc2626' },
  { id: 'multi', label: 'Multi', hex: 'linear-gradient(135deg,#1a1a1a,#2563eb,#16a34a,#dc2626)' },
];

export const PENCIL_SHADES = [
  { id: 'spread', label: 'Spread', description: 'Lighter, wider strokes' },
  { id: 'concentrated', label: 'Concentrated', description: 'Darker, sharper lines' },
];

export const HANDWRITING_FONTS = [
  { id: 'calligraphy', label: 'Calligraphy', family: "'Caveat', cursive" },
  { id: 'normal', label: 'Normal', family: "'Kalam', cursive" },
  { id: 'chalk', label: 'Chalk', family: "'Kalam', cursive" },
];

export const DEFAULT_THEME = {
  board: 'chalkboard',
  boardColor: 'green',
  inkColor: 'white',
  pencilShade: 'spread',
  handwriting: 'normal',
};

export function getBoardType(themeConfig) {
  return themeConfig?.board || 'chalkboard';
}

// Maps a themeConfig object to a flat CSS custom-properties object.
export function resolveThemeVars(cfg) {
  const c = { ...DEFAULT_THEME, ...cfg };
  const type = getBoardType(c);

  if (type === 'chalkboard') return chalkboardVars(c);
  if (type === 'whiteboard') return whiteboardVars(c);
  return notebookVars(c);
}

// ─── Internal helpers ───────────────────────────────────────────────

function chalkboardVars(c) {
  const boardBg = c.boardColor === 'black' ? '#1a1a1a' : '#1c352d';
  const gradientCenter = c.boardColor === 'black'
    ? 'rgba(255,255,255,0.03)'
    : 'rgba(255,255,255,0.05)';

  const ink = resolveChalkInk(c.inkColor);

  return {
    '--board-bg': boardBg,
    '--board-bg-image': `radial-gradient(circle at center, ${gradientCenter} 0%, transparent 100%)`,
    '--board-border-width': '12px',
    '--board-border-color': '#4a3423',
    '--board-border-radius': '2px',
    '--board-shadow': `inset 0 0 100px rgba(0,0,0,0.5), 0 0 0 2px #3a281a, 0 10px 30px rgba(0,0,0,0.4), 0 20px 50px rgba(0,0,0,0.3)`,
    '--board-padding': '3rem',
    '--board-padding-mobile': '1rem',

    '--ledge-bg': '#5a4433',
    '--ledge-display': 'block',

    '--text-color': ink.text,
    '--text-shadow': `0 0 1px ${ink.glow}, 0 0 3px ${ink.glowWeak}`,
    '--heading-color': '#ffffff',
    '--heading-decoration': `underline decoration-dotted ${ink.decoColor} underline-offset-8`,
    '--highlight-color': ink.text,

    '--code-bg': 'rgba(255,255,255,0.1)',
    '--code-color': '#ffffff',
    '--code-border': '1px solid rgba(255,255,255,0.2)',

    '--font-family': "'Kalam', cursive",
    '--font-size-base': '1.25rem',

    '--dust-opacity': '0.03',

    '--tray-display': 'flex',
    '--tray-item-1-bg': ink.tray1,
    '--tray-item-2-bg': ink.tray2,

    '--label-bg': 'rgba(255,255,255,0.1)',
    '--label-color': '#ffffff',
    '--label-border': '1px solid rgba(255,255,255,0.2)',

    '--divider-color': 'rgba(255,255,255,0.1)',

    '--notebook-lines-display': 'none',
    '--notebook-margin-display': 'none',
    '--notebook-spiral-display': 'none',

    '--header-border-color': 'rgba(255,255,255,0.1)',
  };
}

function whiteboardVars(c) {
  const ink = resolveMarkerInk(c.inkColor);

  return {
    '--board-bg': '#f8f9fa',
    '--board-bg-image': 'none',
    '--board-border-width': '3px',
    '--board-border-color': '#d1d5db',
    '--board-border-radius': '12px',
    '--board-shadow': '0 4px 20px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)',
    '--board-padding': '3rem',
    '--board-padding-mobile': '1rem',

    '--ledge-bg': '#e5e7eb',
    '--ledge-display': 'block',

    '--text-color': ink.text,
    '--text-shadow': 'none',
    '--heading-color': ink.heading,
    '--heading-decoration': `underline decoration-2 ${ink.decoColor} underline-offset-8`,
    '--highlight-color': ink.text,

    '--code-bg': '#f3f4f6',
    '--code-color': '#1f2937',
    '--code-border': '1px solid #e5e7eb',

    '--font-family': "'Kalam', cursive",
    '--font-size-base': '1.25rem',

    '--dust-opacity': '0',

    '--tray-display': 'flex',
    '--tray-item-1-bg': ink.marker,
    '--tray-item-2-bg': ink.marker2,

    '--label-bg': 'rgba(0,0,0,0.05)',
    '--label-color': ink.text,
    '--label-border': `1px solid ${ink.decoColor}`,

    '--divider-color': '#e5e7eb',

    '--notebook-lines-display': 'none',
    '--notebook-margin-display': 'none',
    '--notebook-spiral-display': 'none',

    '--header-border-color': '#e5e7eb',
  };
}

function notebookVars(c) {
  const isYellow = c.boardColor === 'yellow';
  const bgColor = isYellow ? '#fef9e7' : '#ffffff';
  const lineColor = isYellow ? '#e6d5a8' : '#d1d5db';
  const marginColor = isYellow ? '#f4a0a0' : '#f4a0a0';
  const isDark = c.pencilShade === 'concentrated';
  const textColor = isDark ? '#1a1a1a' : '#4a4a4a';
  const headingColor = isDark ? '#111111' : '#333333';

  const font = HANDWRITING_FONTS.find(f => f.id === c.handwriting)?.family || "'Kalam', cursive";

  return {
    '--board-bg': bgColor,
    '--board-bg-image': 'none',
    '--board-border-width': '1px',
    '--board-border-color': lineColor,
    '--board-border-radius': '4px',
    '--board-shadow': '0 2px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)',
    '--board-padding': '3rem 3rem 3rem 4.5rem',
    '--board-padding-mobile': '1rem 1rem 1rem 2.5rem',

    '--ledge-bg': 'transparent',
    '--ledge-display': 'none',

    '--text-color': textColor,
    '--text-shadow': 'none',
    '--heading-color': headingColor,
    '--heading-decoration': `underline decoration-1 ${lineColor} underline-offset-4`,
    '--highlight-color': isYellow ? '#b45309' : '#2563eb',

    '--code-bg': isYellow ? '#fef3c7' : '#f3f4f6',
    '--code-color': '#1f2937',
    '--code-border': `1px solid ${lineColor}`,

    '--font-family': font,
    '--font-size-base': '1.15rem',

    '--dust-opacity': '0',

    '--tray-display': 'none',
    '--tray-item-1-bg': 'transparent',
    '--tray-item-2-bg': 'transparent',

    '--label-bg': isYellow ? 'rgba(180,83,9,0.08)' : 'rgba(37,99,235,0.08)',
    '--label-color': isYellow ? '#92400e' : '#1e40af',
    '--label-border': `1px solid ${lineColor}`,

    '--divider-color': lineColor,

    '--notebook-lines-display': 'block',
    '--notebook-margin-display': 'block',
    '--notebook-spiral-display': 'flex',

    '--notebook-line-color': lineColor,
    '--notebook-margin-color': marginColor,

    '--header-border-color': lineColor,
  };
}

// ─── Ink resolvers ──────────────────────────────────────────────────

function resolveChalkInk(inkColor) {
  const map = {
    white: {
      text: '#f8f8f8',
      glow: 'rgba(255,255,255,0.3)',
      glowWeak: 'rgba(255,255,255,0.1)',
      decoColor: 'rgba(255,255,255,0.3)',
      tray1: 'rgba(255,255,255,0.9)',
      tray2: 'rgba(219,234,254,0.8)',
    },
    yellow: {
      text: '#fde68a',
      glow: 'rgba(253,230,138,0.3)',
      glowWeak: 'rgba(253,230,138,0.1)',
      decoColor: 'rgba(253,230,138,0.3)',
      tray1: 'rgba(253,230,138,0.9)',
      tray2: 'rgba(255,255,255,0.8)',
    },
    pink: {
      text: '#f9a8d4',
      glow: 'rgba(249,168,212,0.3)',
      glowWeak: 'rgba(249,168,212,0.1)',
      decoColor: 'rgba(249,168,212,0.3)',
      tray1: 'rgba(249,168,212,0.9)',
      tray2: 'rgba(255,255,255,0.8)',
    },
    multi: {
      text: '#f8f8f8',
      glow: 'rgba(255,255,255,0.3)',
      glowWeak: 'rgba(255,255,255,0.1)',
      decoColor: 'rgba(255,255,255,0.3)',
      tray1: 'rgba(253,230,138,0.9)',
      tray2: 'rgba(249,168,212,0.8)',
    },
  };
  return map[inkColor] || map.white;
}

function resolveMarkerInk(inkColor) {
  const map = {
    black: {
      text: '#1f2937',
      heading: '#111827',
      decoColor: '#d1d5db',
      marker: '#1f2937',
      marker2: '#6b7280',
    },
    blue: {
      text: '#1e40af',
      heading: '#1e3a8a',
      decoColor: '#93c5fd',
      marker: '#2563eb',
      marker2: '#60a5fa',
    },
    green: {
      text: '#166534',
      heading: '#14532d',
      decoColor: '#86efac',
      marker: '#16a34a',
      marker2: '#4ade80',
    },
    red: {
      text: '#991b1b',
      heading: '#7f1d1d',
      decoColor: '#fca5a5',
      marker: '#dc2626',
      marker2: '#f87171',
    },
    multi: {
      text: '#1f2937',
      heading: '#111827',
      decoColor: '#d1d5db',
      marker: '#2563eb',
      marker2: '#dc2626',
    },
  };
  return map[inkColor] || map.black;
}

// ─── Theme parser helper ────────────────────────────────────────────

export function parseThemeSetting(raw) {
  if (!raw) return { ...DEFAULT_THEME };
  try {
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_THEME, ...parsed };
  } catch {
    return { ...DEFAULT_THEME };
  }
}
