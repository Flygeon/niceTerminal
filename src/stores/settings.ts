import { create } from "zustand";
import { getConfig, setConfig } from "../services/config";
import { applyTheme } from "../services/themeService";

export type ThemeMode = "light" | "dark";
export type StatusBarMode = "full" | "simple" | "minimal";

const CONFIG_PREFIX = "settings";

interface SettingsState {
  initialized: boolean;
  themeName: string;
  mode: ThemeMode;
  fontFamily: string;
  fontSize: number;
  statusBarMode: StatusBarMode;
  shellOverride: string;
  init: () => Promise<void>;
  setThemeName: (name: string) => void;
  setMode: (mode: ThemeMode) => void;
  setFontFamily: (family: string) => void;
  setFontSize: (size: number) => void;
  setStatusBarMode: (mode: StatusBarMode) => void;
  setShellOverride: (shell: string) => void;
}

async function persist<T>(key: string, value: T): Promise<void> {
  await setConfig(`${CONFIG_PREFIX}.${key}`, value);
}

export const useSettings = create<SettingsState>((set, get) => ({
  initialized: false,
  themeName: "material",
  mode: "dark",
  fontFamily: "JetBrains Mono",
  fontSize: 14,
  statusBarMode: "full",
  shellOverride: "",

  init: async () => {
    const [themeName, mode, fontFamily, fontSize, statusBarMode, shellOverride] =
      await Promise.all([
        getConfig("settings.themeName", "material"),
        getConfig<ThemeMode>("settings.mode", "dark"),
        getConfig("settings.fontFamily", "JetBrains Mono"),
        getConfig("settings.fontSize", 14),
        getConfig<StatusBarMode>("settings.statusBarMode", "full"),
        getConfig("settings.shellOverride", ""),
      ]);
    set({
      themeName,
      mode,
      fontFamily,
      fontSize,
      statusBarMode,
      shellOverride,
      initialized: true,
    });
    applyTheme(get().themeName, get().mode);
  },

  setThemeName: (themeName) => {
    set({ themeName });
    void persist("themeName", themeName);
    applyTheme(get().themeName, get().mode);
  },

  setMode: (mode) => {
    set({ mode });
    void persist("mode", mode);
    applyTheme(get().themeName, mode);
  },

  setFontFamily: (fontFamily) => {
    set({ fontFamily });
    void persist("fontFamily", fontFamily);
  },

  setFontSize: (fontSize) => {
    const clamped = Math.min(28, Math.max(10, fontSize));
    set({ fontSize: clamped });
    void persist("fontSize", clamped);
  },

  setStatusBarMode: (statusBarMode) => {
    set({ statusBarMode });
    void persist("statusBarMode", statusBarMode);
  },

  setShellOverride: (shellOverride) => {
    set({ shellOverride });
    void persist("shellOverride", shellOverride);
  },
}));
