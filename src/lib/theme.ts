export const THEMES = [
  { id: "default", label: "System (Auto)", emoji: "🎨" },
  { id: "light", label: "Light", emoji: "☀️" },
  { id: "dark", label: "Dark", emoji: "🌑" },
  { id: "neon", label: "Neon", emoji: "⚡" },
  { id: "comfort", label: "Eye Comfort", emoji: "🌙" },
  { id: "kawaii", label: "Kawaii", emoji: "🎀" },
  { id: "formal", label: "Formal", emoji: "💼" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

// Per-theme palette for the animated 3D background (Background3D.tsx) — kept
// here alongside the theme list so the two stay in sync.
export const THEME_3D_PALETTES: Record<
  ThemeId,
  { colors: string[]; sparkle: string; light1: string; light2: string; glowIntensity: number }
> = {
  default: {
    colors: ["#6366f1", "#8b5cf6", "#38bdf8", "#a78bfa", "#4f46e5", "#22d3ee", "#c084fc", "#818cf8"],
    sparkle: "#a5b4fc",
    light1: "#8b5cf6",
    light2: "#22d3ee",
    glowIntensity: 0.7,
  },
  light: {
    colors: ["#818cf8", "#a5b4fc", "#7dd3fc", "#c4b5fd", "#93c5fd", "#67e8f9", "#ddd6fe", "#a78bfa"],
    sparkle: "#c7d2fe",
    light1: "#a5b4fc",
    light2: "#7dd3fc",
    glowIntensity: 0.35,
  },
  dark: {
    colors: ["#6366f1", "#8b5cf6", "#38bdf8", "#a78bfa", "#4f46e5", "#22d3ee", "#c084fc", "#818cf8"],
    sparkle: "#a5b4fc",
    light1: "#8b5cf6",
    light2: "#22d3ee",
    glowIntensity: 0.8,
  },
  neon: {
    colors: ["#ff2ee0", "#7c3aff", "#00f0ff", "#ff6ec7", "#a855f7", "#22d3ee", "#f0abfc", "#c026d3"],
    sparkle: "#ff2ee0",
    light1: "#ff2ee0",
    light2: "#00f0ff",
    glowIntensity: 1.1,
  },
  comfort: {
    colors: ["#b45309", "#a16207", "#78716c", "#c2410c", "#92400e", "#a8a29e", "#d97706", "#78350f"],
    sparkle: "#d6d3d1",
    light1: "#b45309",
    light2: "#78716c",
    glowIntensity: 0.25,
  },
  kawaii: {
    colors: ["#ff6ec7", "#c77dff", "#7de2d1", "#ffafcc", "#e0aaff", "#bde0fe", "#ffc8dd", "#cdb4db"],
    sparkle: "#ffc8dd",
    light1: "#ff6ec7",
    light2: "#7de2d1",
    glowIntensity: 0.6,
  },
  formal: {
    colors: ["#1e3a8a", "#334155", "#0f766e", "#1e40af", "#475569", "#0e7490", "#312e81", "#3f3f46"],
    sparkle: "#94a3b8",
    light1: "#1e3a8a",
    light2: "#0f766e",
    glowIntensity: 0.3,
  },
};

export const THEME_STORAGE_KEY = "jobpilot:app-theme";
export const THEME_EVENT = "jobpilot:theme-changed";

export function getAppTheme(): ThemeId {
  if (typeof window === "undefined") return "default";
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return (THEMES.find((t) => t.id === stored)?.id ?? "default") as ThemeId;
}

export function setAppTheme(theme: ThemeId) {
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  document.documentElement.setAttribute("data-app-theme", theme);
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: theme }));
}
