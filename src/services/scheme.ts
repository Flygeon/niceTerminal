import type { ThemeMode } from "../stores/settings";

/**
 * Material You ("monet") dynamic-color scheme picker.
 *
 * The static MD3 tokens in md3-tokens.css use a fixed purple primary. These
 * schemes let the user pick an accent seed; the tonal palette is derived from
 * it (like Android's Material You) and written as inline CSS variables, which
 * override the stylesheet for the primary/secondary/tertiary families. The
 * neutral surfaces, outline and error colors stay shared.
 */

export interface Scheme {
  key: string;
  label: string;
  seed: string; // hex
}

export const SCHEMES: Scheme[] = [
  { key: "violet", label: "紫罗兰", seed: "#6750a4" },
  { key: "blue", label: "靛蓝", seed: "#3b5b9e" },
  { key: "teal", label: "青碧", seed: "#00796b" },
  { key: "green", label: "森林绿", seed: "#3a7d2c" },
  { key: "orange", label: "琥珀橙", seed: "#b26500" },
  { key: "pink", label: "蔷薇粉", seed: "#c0476f" },
];

/* --- tiny HSL helpers --- */

function hexToHsl(hex: string): [number, number, number] {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, Math.round(l * 100)];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  const sn = s / 100;
  const ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const mm = ln - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to = (v: number) =>
    Math.round((v + mm) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

/** Tonal keypoints derived from a seed, following MD3's tone ladder. */
function buildTokens(seed: string, mode: ThemeMode): Record<string, string> {
  const [h, s] = hexToHsl(seed);
  const isDark = mode === "dark";
  const p = (t: number) => hslToHex(h, s, t);
  const sec = (t: number) => hslToHex(h, Math.max(8, Math.round(s * 0.45)), t);
  const ter = (t: number) => hslToHex(h + 55, Math.round(s * 0.8), t);

  // Light mode uses tone-40 primary, tone-90 containers; dark uses the
  // tone-80 primary, tone-30 containers (the classic MD3 mapping).
  return {
    "--md-sys-color-primary": isDark ? p(80) : p(40),
    "--md-sys-color-on-primary": isDark ? p(20) : "#ffffff",
    "--md-sys-color-primary-container": isDark ? p(30) : p(90),
    "--md-sys-color-on-primary-container": isDark ? p(90) : p(10),

    "--md-sys-color-secondary": isDark ? sec(80) : sec(40),
    "--md-sys-color-on-secondary": isDark ? sec(20) : "#ffffff",
    "--md-sys-color-secondary-container": isDark ? sec(30) : sec(90),
    "--md-sys-color-on-secondary-container": isDark ? sec(90) : sec(10),

    "--md-sys-color-tertiary": isDark ? ter(80) : ter(40),
    "--md-sys-color-on-tertiary": isDark ? ter(20) : "#ffffff",
    "--md-sys-color-tertiary-container": isDark ? ter(30) : ter(90),
    "--md-sys-color-on-tertiary-container": isDark ? ter(90) : ter(10),
  };
}

/** Apply a scheme's accent palette to the app chrome (overrides MD3 tokens). */
export function applyScheme(schemeKey: string, mode: ThemeMode): void {
  const scheme = SCHEMES.find((s) => s.key === schemeKey) ?? SCHEMES[0];
  const root = document.documentElement;
  const tokens = buildTokens(scheme.seed, mode);
  for (const [key, value] of Object.entries(tokens)) {
    root.style.setProperty(key, value);
  }
}

/**
 * xterm.js palette for the "whole window follows Material You" look.
 * Background/foreground/cursor/selection come from the applied MD3 CSS
 * tokens; the ANSI 16 are derived from the scheme seed (hue-shifted tonal
 * steps), so the terminal and the chrome speak one color language.
 */
export function schemeXtermTheme(
  schemeKey: string,
  mode: ThemeMode,
): Record<string, string> {
  const scheme = SCHEMES.find((s) => s.key === schemeKey) ?? SCHEMES[0];
  const [h, sSeed] = hexToHsl(scheme.seed);
  const sat = Math.min(sSeed, 62);
  const isDark = mode === "dark";
  const tone = (offset: number, l: number) => hslToHex(h + offset, sat, l);
  const normalL = isDark ? 65 : 42;
  const brightL = isDark ? 82 : 58;

  const root = getComputedStyle(document.documentElement);
  const css = (name: string, fallback: string) =>
    root.getPropertyValue(name).trim() || fallback;

  return {
    black: tone(0, 8),
    red: tone(0, normalL),
    green: tone(130, normalL),
    yellow: tone(55, normalL),
    blue: tone(245, normalL),
    magenta: tone(300, normalL),
    cyan: tone(185, normalL),
    white: tone(0, isDark ? 88 : 82),
    brightBlack: tone(0, 28),
    brightRed: tone(0, brightL),
    brightGreen: tone(130, brightL),
    brightYellow: tone(55, brightL),
    brightBlue: tone(245, brightL),
    brightMagenta: tone(300, brightL),
    brightCyan: tone(185, brightL),
    brightWhite: tone(0, isDark ? 95 : 90),
    background: css("--md-sys-color-surface", isDark ? "#1c1b1f" : "#fef7ff"),
    foreground: css("--md-sys-color-on-surface", isDark ? "#e6e1e5" : "#1c1b1f"),
    cursor: css("--md-sys-color-primary", isDark ? "#cfbcff" : "#6750a4"),
    cursorAccent: css("--md-sys-color-on-primary", isDark ? "#381e72" : "#ffffff"),
    selectionBackground: css(
      "--md-sys-color-primary-container",
      isDark ? "#4f378a" : "#e9ddff",
    ),
  };
}
