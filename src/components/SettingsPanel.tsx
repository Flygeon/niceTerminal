import { PRESETS, PRESET_NAMES } from "../services/themeService";
import {
  useSettings,
  type StatusBarMode,
  type ThemeMode,
} from "../stores/settings";

const FONT_FAMILIES = [
  "JetBrains Mono",
  "Cascadia Code",
  "Consolas",
  "Fira Code",
  "Courier New",
];

const STATUS_BAR_MODES: { value: StatusBarMode; label: string; desc: string }[] =
  [
    { value: "full", label: "完整模式", desc: "cwd · shell · git · theme" },
    { value: "simple", label: "简洁模式", desc: "cwd · shell · theme" },
    { value: "minimal", label: "极简模式", desc: "shell · theme" },
  ];

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const settings = useSettings();

  const setMode = (mode: ThemeMode) => settings.setMode(mode);

  return (
    <div className="settings-backdrop" onClick={onClose}>
      <div
        className="settings-panel"
        role="dialog"
        aria-label="Settings"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="settings-header">
          <h2>设置</h2>
          <button className="settings-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <section className="settings-section">
          <h3>外观 · Appearance</h3>

          <div className="settings-row">
            <label className="settings-label">主题预设</label>
            <div className="theme-swatches">
              {PRESET_NAMES.map((name) => {
                const def = PRESETS[name];
                const active = settings.themeName === name;
                const colors = settings.mode === "dark" ? def.dark : def.light;
                return (
                  <button
                    key={name}
                    className={`theme-swatch ${active ? "theme-swatch-active" : ""}`}
                    title={def.label}
                    onClick={() => settings.setThemeName(name)}
                  >
                    <span
                      className="theme-swatch-dots"
                      style={{
                        background: colors.colors.primary,
                        borderColor: colors.colors.onSurface,
                      }}
                    />
                    {def.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="settings-row">
            <label className="settings-label">明暗模式</label>
            <div className="segmented">
              <button
                className={settings.mode === "light" ? "seg-active" : ""}
                onClick={() => setMode("light")}
              >
                浅色
              </button>
              <button
                className={settings.mode === "dark" ? "seg-active" : ""}
                onClick={() => setMode("dark")}
              >
                深色
              </button>
            </div>
          </div>

          <div className="settings-row">
            <label className="settings-label" htmlFor="font-size">
              字号 {settings.fontSize}px
            </label>
            <input
              id="font-size"
              type="range"
              min={10}
              max={28}
              step={1}
              value={settings.fontSize}
              onChange={(e) => settings.setFontSize(Number(e.target.value))}
            />
          </div>

          <div className="settings-row">
            <label className="settings-label" htmlFor="font-family">
              字体
            </label>
            <select
              id="font-family"
              className="settings-select"
              value={settings.fontFamily}
              onChange={(e) => settings.setFontFamily(e.target.value)}
            >
              {FONT_FAMILIES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="settings-section">
          <h3>状态栏 · Status Bar</h3>
          <div className="settings-row">
            <label className="settings-label">信息密度</label>
            <div className="segmented">
              {STATUS_BAR_MODES.map((m) => (
                <button
                  key={m.value}
                  className={settings.statusBarMode === m.value ? "seg-active" : ""}
                  onClick={() => settings.setStatusBarMode(m.value)}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <p className="settings-hint">
              {
                STATUS_BAR_MODES.find((m) => m.value === settings.statusBarMode)
                  ?.desc
              }
            </p>
          </div>
        </section>

        <section className="settings-section">
          <h3>Shell</h3>
          <div className="settings-row">
            <label className="settings-label" htmlFor="shell-override">
              默认 Shell 路径
            </label>
            <input
              id="shell-override"
              type="text"
              className="settings-input"
              placeholder="留空自动检测 (pwsh → powershell → cmd)"
              value={settings.shellOverride}
              onChange={(e) => settings.setShellOverride(e.target.value)}
            />
            <p className="settings-hint">
              例如 C:\Program Files\PowerShell\7\pwsh.exe。修改后新建的标签页生效。
            </p>
          </div>
        </section>

        <footer className="settings-footer">
          <span className="settings-hint">
            配置文件：config.json（tauri-plugin-store），改动即时生效。
          </span>
        </footer>
      </div>
    </div>
  );
}
