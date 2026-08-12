import { create } from "zustand";
import { getConfig, setConfig } from "../services/config";
import { applyTheme } from "../services/themeService";
import { applyScheme } from "../services/scheme";

export type ThemeMode = "light" | "dark";
export type StatusBarMode = "full" | "simple" | "minimal";

const CONFIG_PREFIX = "settings";

interface SettingsState {
  initialized: boolean;
  theme: string;
  scheme: string;
  mode: ThemeMode;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  cursorStyle: "block" | "underline" | "bar";
  cursorBlink: boolean;
  shell: string;
  init: () => Promise<void>;
  update: (partial: Partial<Omit<SettingsState, "initialized" | "init" | "update">>) => Promise<void>;
}

async function persist<T>(key: string, value: T): Promise<void> {
  await setConfig(`${CONFIG_PREFIX}.${key}`, value);
}

export const useSettings = create<SettingsState>((set, get) => ({
  initialized: false,
  theme: "material",
  scheme: "violet",
  mode: "dark",
  fontFamily: "JetBrains Mono, Consolas, monospace",
  fontSize: 14,
  lineHeight: 1.2,
  cursorStyle: "block",
  cursorBlink: true,
  shell: "",

  init: async () => {
    const [theme, scheme, mode, fontFamily, fontSize, lineHeight, cursorStyle, cursorBlink, shell] =
      await Promise.all([
        getConfig("settings.theme", "material"),
        getConfig("settings.scheme", "violet"),
        getConfig<ThemeMode>("settings.mode", "dark"),
        getConfig("settings.fontFamily", "JetBrains Mono, Consolas, monospace"),
        getConfig("settings.fontSize", 14),
        getConfig("settings.lineHeight", 1.2),
        getConfig<"block" | "underline" | "bar">("settings.cursorStyle", "block"),
        getConfig("settings.cursorBlink", true),
        getConfig("settings.shell", ""),
      ]);
    set({
      theme,
      scheme,
      mode,
      fontFamily,
      fontSize,
      lineHeight,
      cursorStyle,
      cursorBlink,
      shell,
      initialized: true,
    });
    document.documentElement.setAttribute("data-mode", mode);
    applyTheme(theme, mode);
    applyScheme(scheme, mode);
  },

  update: async (partial) => {
    const updated = { ...get(), ...partial };
    set(partial);

    // Persist each changed key
    for (const [key, value] of Object.entries(partial)) {
      await persist(key, value);
    }

    // Update data-mode attribute if mode changed
    if (partial.mode !== undefined) {
      document.documentElement.setAttribute("data-mode", partial.mode);
    }

    // Re-apply theme + accent scheme if any of theme/scheme/mode changed
    if (
      partial.theme !== undefined ||
      partial.scheme !== undefined ||
      partial.mode !== undefined
    ) {
      applyTheme(updated.theme, updated.mode);
      applyScheme(updated.scheme, updated.mode);
    }
  },
}));
