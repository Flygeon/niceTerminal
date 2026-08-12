import { useEffect, useState } from "react";
import { TitleBar } from "./components/TitleBar";
import { TabBar } from "./components/TabBar";
import { TerminalView } from "./components/TerminalView";
import { StatusBar } from "./components/StatusBar";
import { SettingsPanel } from "./components/SettingsPanel";
import { openNewTab } from "./actions/tabs";
import { ensureTerminalEventBridge } from "./services/terminal";
import { useSessions } from "./stores/sessions";
import { useSettings } from "./stores/settings";

/**
 * Global keyboard shortcuts. When a modal (settings) is open, global
 * shortcuts are suspended — matching the design doc's 模态快捷键策略.
 */
function useGlobalShortcuts(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      // Let the terminal's own textarea and the search input handle their keys.
      const tag = target?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;
      if (!e.ctrlKey) return;
      switch (e.key.toLowerCase()) {
        case "t":
          e.preventDefault();
          void openNewTab();
          break;
        case "w":
          e.preventDefault();
          useSessions.getState().closeTab(useSessions.getState().activeId ?? "");
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [enabled]);
}

export default function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useGlobalShortcuts(!showSettings);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await useSettings.getState().init();
      await ensureTerminalEventBridge();
      if (cancelled) return;
      if (useSessions.getState().tabs.length === 0) {
        await openNewTab();
      }
    })().catch((err) => {
      if (!cancelled) setInitError(String(err));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const tabs = useSessions((s) => s.tabs);
  const activeId = useSessions((s) => s.activeId);

  return (
    <div className="app">
      <TitleBar />
      <TabBar />
      <div className="main">
        {initError && (
          <div className="init-error">
            <strong>启动失败</strong>
            <span>{initError}</span>
            <button onClick={() => setShowSettings(true)}>打开设置</button>
          </div>
        )}
        {!initError &&
          (tabs.length === 0 ? (
            <div className="empty-state">
              <p>没有活动会话</p>
              <button className="empty-new" onClick={() => void openNewTab()}>
                + 新建标签页
              </button>
            </div>
          ) : (
            <div className="panes">
              {tabs.map((tab) => (
                <div
                  key={tab.id}
                  className={`terminal-pane ${tab.id === activeId ? "active" : ""}`}
                >
                  <TerminalView tab={tab} />
                </div>
              ))}
            </div>
          ))}
      </div>
      <StatusBar onOpenSettings={() => setShowSettings(true)} />
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  );
}
