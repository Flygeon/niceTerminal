import { useSettings } from "../stores/settings";
import { SCHEMES } from "../services/scheme";

interface SettingsPanelProps {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const settings = useSettings();

  const handleModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    void settings.update({ mode: e.target.value as "light" | "dark" });
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 8 && value <= 32) {
      void settings.update({ fontSize: value });
    }
  };

  const handleFontFamilyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    void settings.update({ fontFamily: e.target.value });
  };

  const handleLineHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 1.0 && value <= 2.5) {
      void settings.update({ lineHeight: value });
    }
  };

  const handleCursorStyleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    void settings.update({ cursorStyle: e.target.value as "block" | "underline" | "bar" });
  };

  const handleCursorBlinkChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    void settings.update({ cursorBlink: e.target.value === "true" });
  };

  const handleShellChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    void settings.update({ shell: e.target.value });
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2 className="settings-title">设置</h2>
          <button className="settings-close" onClick={onClose} aria-label="关闭">
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        <div className="settings-content">
          {/* 外观 */}
          <div className="settings-group">
            <h3 className="settings-group-title">外观</h3>
            <div className="settings-row">
              <label className="settings-label">明暗模式</label>
              <div className="settings-control">
                <select
                  className="settings-select"
                  value={settings.mode}
                  onChange={handleModeChange}
                >
                  <option value="dark">深色</option>
                  <option value="light">浅色</option>
                </select>
              </div>
            </div>
          </div>

          {/* 配色 · Material You */}
          <div className="settings-group">
            <h3 className="settings-group-title">配色 · Material You</h3>
            <div className="settings-row">
              <label className="settings-label">主题色</label>
              <div className="settings-control">
                <div className="scheme-swatches">
                  {SCHEMES.map((s) => (
                    <button
                      key={s.key}
                      className={`scheme-swatch ${
                        settings.scheme === s.key ? "scheme-swatch-active" : ""
                      }`}
                      style={{ backgroundColor: s.seed }}
                      title={s.label}
                      aria-label={s.label}
                      onClick={() => void settings.update({ scheme: s.key })}
                    />
                  ))}
                </div>
              </div>
            </div>
            <p className="settings-hint">
              跟随 Material You 动态配色：选择种子色，自动生成 MD3 色调阶梯。
            </p>
          </div>

          {/* 字体 */}
          <div className="settings-group">
            <h3 className="settings-group-title">字体</h3>
            <div className="settings-row">
              <label className="settings-label">字体族</label>
              <div className="settings-control">
                <input
                  type="text"
                  className="settings-select"
                  style={{ width: "240px" }}
                  value={settings.fontFamily}
                  onChange={handleFontFamilyChange}
                  placeholder="JetBrains Mono, Consolas"
                />
              </div>
            </div>
            <div className="settings-row">
              <label className="settings-label">字号</label>
              <div className="settings-control">
                <input
                  type="number"
                  className="settings-number"
                  min="8"
                  max="32"
                  value={settings.fontSize}
                  onChange={handleFontSizeChange}
                />
              </div>
            </div>
            <div className="settings-row">
              <label className="settings-label">行高</label>
              <div className="settings-control">
                <input
                  type="number"
                  className="settings-number"
                  min="1.0"
                  max="2.5"
                  step="0.1"
                  value={settings.lineHeight}
                  onChange={handleLineHeightChange}
                />
              </div>
            </div>
          </div>

          {/* 光标 */}
          <div className="settings-group">
            <h3 className="settings-group-title">光标</h3>
            <div className="settings-row">
              <label className="settings-label">光标样式</label>
              <div className="settings-control">
                <select
                  className="settings-select"
                  value={settings.cursorStyle}
                  onChange={handleCursorStyleChange}
                >
                  <option value="block">方块</option>
                  <option value="underline">下划线</option>
                  <option value="bar">竖线</option>
                </select>
              </div>
            </div>
            <div className="settings-row">
              <label className="settings-label">光标闪烁</label>
              <div className="settings-control">
                <select
                  className="settings-select"
                  value={settings.cursorBlink.toString()}
                  onChange={handleCursorBlinkChange}
                >
                  <option value="true">开启</option>
                  <option value="false">关闭</option>
                </select>
              </div>
            </div>
          </div>

          {/* Shell */}
          <div className="settings-group">
            <h3 className="settings-group-title">Shell</h3>
            <div className="settings-row">
              <label className="settings-label">默认 Shell</label>
              <div className="settings-control">
                <input
                  type="text"
                  className="settings-select"
                  style={{ width: "240px" }}
                  value={settings.shell}
                  onChange={handleShellChange}
                  placeholder="留空使用系统默认"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
