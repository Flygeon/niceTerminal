import { useMemo } from "react";
import { useSessions } from "../stores/sessions";
import { useSettings, type StatusBarMode } from "../stores/settings";

type ItemId = "cwd" | "shell" | "git" | "theme";

const MODE_ITEMS: Record<StatusBarMode, ItemId[]> = {
  full: ["cwd", "shell", "git", "theme"],
  simple: ["cwd", "shell", "theme"],
  minimal: ["shell", "theme"],
};

/**
 * Status bar with the three density presets from the design doc
 * (完整 / 简洁 / 极简). Each module is independently registered so the
 * per-module toggles can be wired to settings later.
 */
export function StatusBar({ onOpenSettings }: { onOpenSettings: () => void }) {
  const statusBarMode = useSettings((s) => s.statusBarMode);
  const mode = useSettings((s) => s.mode);
  const setMode = useSettings((s) => s.setMode);

  const activeTab = useSessions((s) =>
    s.tabs.find((t) => t.id === s.activeId),
  );

  const items = useMemo(() => MODE_ITEMS[statusBarMode], [statusBarMode]);

  const renderItem = (id: ItemId) => {
    switch (id) {
      case "cwd":
        return <span className="sb-item">{activeTab?.cwd ?? "—"}</span>;
      case "shell":
        return (
          <span className="sb-item sb-item-shell">
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path
                d="M1 2 L4 5 L1 8 M5 8 L9 8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
            {activeTab?.shell ?? "—"}
          </span>
        );
      case "git":
        // Git branch detection is a Phase-2 follow-up; show a placeholder.
        return <span className="sb-item sb-item-dim">git —</span>;
      case "theme":
        return (
          <button
            className="sb-item sb-action"
            title={`Switch to ${mode === "dark" ? "light" : "dark"} mode`}
            onClick={() => setMode(mode === "dark" ? "light" : "dark")}
          >
            {mode === "dark" ? "☾" : "☀"}
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <footer className="statusbar">
      <div className="statusbar-left">
        {items.map((id) => (
          <span key={id}>{renderItem(id)}</span>
        ))}
      </div>
      <div className="statusbar-right">
        <span className="sb-item sb-item-dim">Windows · ConPTY</span>
        <button
          className="sb-item sb-action"
          title="Settings"
          onClick={onOpenSettings}
        >
          ⚙
        </button>
      </div>
    </footer>
  );
}
