import type { ThemeMode } from "../stores/settings";

/**
 * Theme engine — Material Design 3 inspired token system.
 *
 * Every preset defines the M3 semantic tokens used by the UI. applyTheme()
 * writes them as CSS custom properties on <html>, and themes.css wires a
 * 300ms transition on color properties so switching never flashes.
 *
 * The 设计指南.md calls for 8 presets; we ship 5 curated ones for the
 * walking skeleton (material, gruvbox, dracula, nord, solarized), each in
 * light + dark. xterm.js gets its own mapping via getXtermTheme().
 */

export interface ThemePresetColors {
  background: string;
  surface: string;
  surfaceContainer: string;
  onSurface: string;
  onSurfaceVariant: string;
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  error: string;
  warning: string;
  info: string;
  border: string;
  selection: string;
}

export interface ThemePreset {
  name: string;
  label: string;
  colors: ThemePresetColors;
}

export interface ThemeDefinition {
  label: string;
  light: ThemePreset;
  dark: ThemePreset;
}

export const PRESETS: Record<string, ThemeDefinition> = {
  material: {
    label: "Material You",
    light: {
      name: "material",
      label: "Material You · Light",
      colors: {
        background: "#fdf7ff",
        surface: "#fef7ff",
        surfaceContainer: "#f3edf7",
        onSurface: "#1d1b20",
        onSurfaceVariant: "#49454f",
        primary: "#6750a4",
        onPrimary: "#ffffff",
        primaryContainer: "#eaddff",
        onPrimaryContainer: "#21005d",
        secondary: "#625b71",
        error: "#ba1a1a",
        warning: "#b8860b",
        info: "#00639b",
        border: "#e6e0e9",
        selection: "#cbc2f0",
      },
    },
    dark: {
      name: "material",
      label: "Material You · Dark",
      colors: {
        background: "#141218",
        surface: "#1d1b20",
        surfaceContainer: "#211f26",
        onSurface: "#e6e0e9",
        onSurfaceVariant: "#cac4d0",
        primary: "#d0bcff",
        onPrimary: "#381e72",
        primaryContainer: "#4f378b",
        onPrimaryContainer: "#eaddff",
        secondary: "#cdbddb",
        error: "#f2b8b5",
        warning: "#f9a825",
        info: "#73c2fb",
        border: "#2a2730",
        selection: "#6d5b8b",
      },
    },
  },
  gruvbox: {
    label: "Gruvbox",
    light: {
      name: "gruvbox",
      label: "Gruvbox · Light",
      colors: {
        background: "#fbf1c7",
        surface: "#ebdbb2",
        surfaceContainer: "#d5c4a1",
        onSurface: "#3c3836",
        onSurfaceVariant: "#665c54",
        primary: "#b57614",
        onPrimary: "#fbf1c7",
        primaryContainer: "#d79921",
        onPrimaryContainer: "#3c3836",
        secondary: "#076678",
        error: "#cc241d",
        warning: "#d65d0e",
        info: "#427b58",
        border: "#bdae93",
        selection: "#d5c4a1",
      },
    },
    dark: {
      name: "gruvbox",
      label: "Gruvbox · Dark",
      colors: {
        background: "#282828",
        surface: "#32302f",
        surfaceContainer: "#3c3836",
        onSurface: "#ebdbb2",
        onSurfaceVariant: "#a89984",
        primary: "#fabd2f",
        onPrimary: "#1d2021",
        primaryContainer: "#b57614",
        onPrimaryContainer: "#fbf1c7",
        secondary: "#83a598",
        error: "#fb4934",
        warning: "#fe8019",
        info: "#8ec07c",
        border: "#504945",
        selection: "#4d4238",
      },
    },
  },
  dracula: {
    label: "Dracula",
    light: {
      name: "dracula",
      label: "Dracula · Light",
      colors: {
        background: "#f8f8f2",
        surface: "#eaeaea",
        surfaceContainer: "#dcdce0",
        onSurface: "#282a36",
        onSurfaceVariant: "#5f6470",
        primary: "#7a4fb0",
        onPrimary: "#ffffff",
        primaryContainer: "#dec9f5",
        onPrimaryContainer: "#2a1f38",
        secondary: "#b84b9b",
        error: "#c62b3d",
        warning: "#8a6d00",
        info: "#007a9e",
        border: "#cfcfc4",
        selection: "#bd93f9",
      },
    },
    dark: {
      name: "dracula",
      label: "Dracula · Dark",
      colors: {
        background: "#282a36",
        surface: "#21222c",
        surfaceContainer: "#343746",
        onSurface: "#f8f8f2",
        onSurfaceVariant: "#b8bcc2",
        primary: "#bd93f9",
        onPrimary: "#1e1f29",
        primaryContainer: "#4d3d78",
        onPrimaryContainer: "#f8f8f2",
        secondary: "#ff79c6",
        error: "#ff5555",
        warning: "#f1fa8c",
        info: "#8be9fd",
        border: "#3d4051",
        selection: "#6272a4",
      },
    },
  },
  nord: {
    label: "Nord",
    light: {
      name: "nord",
      label: "Nord · Light",
      colors: {
        background: "#eceff4",
        surface: "#e5e9f0",
        surfaceContainer: "#d8dee9",
        onSurface: "#2e3440",
        onSurfaceVariant: "#4c566a",
        primary: "#5e81ac",
        onPrimary: "#eceff4",
        primaryContainer: "#d8dee9",
        onPrimaryContainer: "#2e3440",
        secondary: "#8fbcbb",
        error: "#bf616a",
        warning: "#d08770",
        info: "#5e81ac",
        border: "#c4c9d4",
        selection: "#88c0d0",
      },
    },
    dark: {
      name: "nord",
      label: "Nord · Dark",
      colors: {
        background: "#2e3440",
        surface: "#3b4252",
        surfaceContainer: "#434c5e",
        onSurface: "#eceff4",
        onSurfaceVariant: "#d8dee9",
        primary: "#88c0d0",
        onPrimary: "#2e3440",
        primaryContainer: "#5e81ac",
        onPrimaryContainer: "#eceff4",
        secondary: "#a3be8c",
        error: "#bf616a",
        warning: "#ebcb8b",
        info: "#81a1c1",
        border: "#4c566a",
        selection: "#5e81ac",
      },
    },
  },
  solarized: {
    label: "Solarized",
    light: {
      name: "solarized",
      label: "Solarized · Light",
      colors: {
        background: "#fdf6e3",
        surface: "#eee8d5",
        surfaceContainer: "#e2dcc3",
        onSurface: "#586e75",
        onSurfaceVariant: "#657b83",
        primary: "#268bd2",
        onPrimary: "#fdf6e3",
        primaryContainer: "#2aa198",
        onPrimaryContainer: "#073642",
        secondary: "#2aa198",
        error: "#dc322f",
        warning: "#b58900",
        info: "#6c71c4",
        border: "#d8d2bd",
        selection: "#eee8d5",
      },
    },
    dark: {
      name: "solarized",
      label: "Solarized · Dark",
      colors: {
        background: "#002b36",
        surface: "#073642",
        surfaceContainer: "#0e3c48",
        onSurface: "#839496",
        onSurfaceVariant: "#657b83",
        primary: "#268bd2",
        onPrimary: "#002b36",
        primaryContainer: "#2aa198",
        onPrimaryContainer: "#fdf6e3",
        secondary: "#2aa198",
        error: "#dc322f",
        warning: "#b58900",
        info: "#6c71c4",
        border: "#15404d",
        selection: "#073642",
      },
    },
  },
};

export const PRESET_NAMES = Object.keys(PRESETS);

export function getTheme(
  name: string,
  mode: ThemeMode,
): ThemePreset {
  const def = PRESETS[name] ?? PRESETS.material;
  return def[mode];
}

/** Write the active theme's tokens as CSS variables on <html>. */
export function applyTheme(themeName: string, mode: ThemeMode): void {
  const theme = getTheme(themeName, mode);
  const root = document.documentElement;
  const c = theme.colors;
  const vars: Record<string, string> = {
    "--bg": c.background,
    "--surface": c.surface,
    "--surface-container": c.surfaceContainer,
    "--on-surface": c.onSurface,
    "--on-surface-variant": c.onSurfaceVariant,
    "--primary": c.primary,
    "--on-primary": c.onPrimary,
    "--primary-container": c.primaryContainer,
    "--on-primary-container": c.onPrimaryContainer,
    "--secondary": c.secondary,
    "--error": c.error,
    "--warning": c.warning,
    "--info": c.info,
    "--border": c.border,
    "--selection": c.selection,
  };
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
  root.dataset.theme = themeName;
  root.dataset.mode = mode;
}

/**
 * Map the active preset's semantic tokens onto xterm.js's ANSI palette.
 * The base 16 colors keep a sane terminal identity per theme; the
 * foreground/background/cursor follow the M3 tokens.
 */
export function getXtermTheme(
  themeName: string,
  mode: ThemeMode,
): Record<string, string> {
  const theme = getTheme(themeName, mode);
  const c = theme.colors;
  const scheme =
    mode === "dark"
      ? {
          black: "#1d1b20",
          red: "#f2b8b5",
          green: "#9cf0c4",
          yellow: "#f9a825",
          blue: "#d0bcff",
          magenta: "#cdbddb",
          cyan: "#73c2fb",
          white: "#e6e0e9",
          brightBlack: "#49454f",
          brightRed: "#ffb4ab",
          brightGreen: "#c9f2d8",
          brightYellow: "#ffe49e",
          brightBlue: "#eaddff",
          brightMagenta: "#e8d5f8",
          brightCyan: "#c2e7ff",
          brightWhite: "#f5eff7",
        }
      : {
          black: "#49454f",
          red: "#ba1a1a",
          green: "#387908",
          yellow: "#b8860b",
          blue: "#6750a4",
          magenta: "#7b50be",
          cyan: "#00639b",
          white: "#1d1b20",
          brightBlack: "#79747e",
          brightRed: "#f05e5e",
          brightGreen: "#5ba92e",
          brightYellow: "#d69a14",
          brightBlue: "#8a6bd8",
          brightMagenta: "#9b7bd8",
          brightCyan: "#1d8fce",
          brightWhite: "#49454f",
        };
  return {
    ...scheme,
    background: c.background,
    foreground: c.onSurface,
    cursor: c.primary,
    cursorAccent: c.onPrimary,
    selectionBackground: c.selection,
  };
}
