import { useEffect, useMemo, useRef, useState } from "react";
import { openNewTab } from "../actions/tabs";
import { terminalRegistry } from "../services/terminalRegistry";
import { useSessions } from "../stores/sessions";
import { useSettings } from "../stores/settings";
import { useUi } from "../stores/ui";

interface PaletteCommand {
  id: string;
  label: string;
  icon: string;
  action: () => void;
}

interface CommandPaletteProps {
  onOpenSettings: () => void;
}

export function CommandPalette({ onOpenSettings }: CommandPaletteProps) {
  const paletteOpen = useUi((s) => s.paletteOpen);
  const closePalette = useUi((s) => s.closePalette);
  const tabs = useSessions((s) => s.tabs);
  const activeId = useSessions((s) => s.activeId);
  const mode = useSettings((s) => s.mode);
  const setMode = useSettings((s) => s.update);

  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeTab = tabs.find((t) => t.id === activeId);
  const ctrl = activeTab ? terminalRegistry.get(activeTab.sessionId) : null;

  useEffect(() => {
    if (paletteOpen) {
      setQuery("");
      setIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [paletteOpen]);

  const commands = useMemo<PaletteCommand[]>(() => {
    const list: PaletteCommand[] = [
      {
        id: "new-tab",
        label: "新建标签页",
        icon: "add",
        action: () => void openNewTab(),
      },
      {
        id: "close-tab",
        label: "关闭当前标签页",
        icon: "close",
        action: () => {
          if (activeId) useSessions.getState().closeTab(activeId);
        },
      },
      {
        id: "clear",
        label: "清屏",
        icon: "delete_sweep",
        action: () => ctrl?.clear(),
      },
      {
        id: "interrupt",
        label: "中断当前命令 (Ctrl+C)",
        icon: "stop",
        action: () => ctrl?.interrupt(),
      },
      {
        id: "copy",
        label: "复制",
        icon: "content_copy",
        action: () => ctrl?.copy(),
      },
      {
        id: "paste",
        label: "粘贴",
        icon: "content_paste",
        action: () => ctrl?.paste(),
      },
      {
        id: "select-all",
        label: "全选",
        icon: "select_all",
        action: () => ctrl?.term.selectAll(),
      },
      {
        id: "toggle-mode",
        label: mode === "dark" ? "切换到浅色模式" : "切换到深色模式",
        icon: mode === "dark" ? "light_mode" : "dark_mode",
        action: () => void setMode({ mode: mode === "dark" ? "light" : "dark" }),
      },
      {
        id: "settings",
        label: "打开设置",
        icon: "settings",
        action: onOpenSettings,
      },
    ];
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, mode, ctrl, onOpenSettings]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => c.label.toLowerCase().includes(q));
  }, [commands, query]);

  if (!paletteOpen) return null;

  const run = (cmd: PaletteCommand) => {
    closePalette();
    cmd.action();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const cmd = filtered[index];
      if (cmd) run(cmd);
    } else if (e.key === "Escape") {
      e.preventDefault();
      closePalette();
    }
  };

  return (
    <div className="palette-overlay" onClick={closePalette}>
      <div className="palette-panel" onClick={(e) => e.stopPropagation()}>
        <div className="palette-input-wrap">
          <span className="material-symbols-rounded ms-20">search</span>
          <input
            ref={inputRef}
            className="palette-input"
            placeholder="输入命令…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
          <span className="palette-esc-hint">Esc 关闭</span>
        </div>
        <div className="palette-list">
          {filtered.length === 0 ? (
            <div className="palette-empty">无匹配命令</div>
          ) : (
            filtered.map((cmd, i) => (
              <button
                key={cmd.id}
                className={`palette-item ${i === index ? "palette-item-active" : ""}`}
                onMouseEnter={() => setIndex(i)}
                onClick={() => run(cmd)}
              >
                <span className="material-symbols-rounded ms-20">{cmd.icon}</span>
                <span className="palette-item-label">{cmd.label}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
