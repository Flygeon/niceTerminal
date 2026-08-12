import { useEffect, useRef, useState } from "react";
import "@xterm/xterm/css/xterm.css";
import { useTerminal } from "../hooks/useTerminal";
import { openNewTab } from "../actions/tabs";
import { ContextMenu, type ContextMenuItem } from "./ContextMenu";
import type { Tab } from "../stores/sessions";

interface TerminalViewProps {
  tab: Tab;
  onOpenSettings: () => void;
}

export function TerminalView({ tab, onOpenSettings }: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [searchVisible, setSearchVisible] = useState(false);
  const controller = useTerminal(
    containerRef,
    tab.id,
    tab.sessionId,
    () => setSearchVisible(true),
  );

  const [toolbarExpanded, setToolbarExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus the terminal textarea so keystrokes land immediately.
  useEffect(() => {
    containerRef.current?.querySelector("textarea")?.focus();
  }, []);

  useEffect(() => {
    if (searchVisible && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchVisible]);

  useEffect(() => {
    if (!controller.current || !searchVisible) return;
    if (searchQuery.trim()) {
      controller.current.search(searchQuery);
    } else {
      controller.current.clearSearch();
    }
  }, [controller, searchQuery, searchVisible]);

  const handleSearchNext = () => {
    if (controller.current && searchQuery.trim()) {
      controller.current.searchNext(searchQuery);
    }
  };

  const handleSearchPrev = () => {
    if (controller.current && searchQuery.trim()) {
      controller.current.searchPrev(searchQuery);
    }
  };

  const handleSearchClose = () => {
    setSearchVisible(false);
    setSearchQuery("");
    controller.current?.clearSearch();
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        handleSearchPrev();
      } else {
        handleSearchNext();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleSearchClose();
    }
  };

  const ctrl = () => controller.current;

  const menuItems: ContextMenuItem[] = [
    { label: "复制", icon: "content_copy", shortcut: "Ctrl+Shift+C", action: () => ctrl()?.copy() },
    { label: "粘贴", icon: "content_paste", shortcut: "Ctrl+V", action: () => ctrl()?.paste() },
    { label: "全选", icon: "select_all", action: () => ctrl()?.term.selectAll() },
    { separator: true, label: "" },
    { label: "清屏", icon: "delete_sweep", action: () => ctrl()?.clear() },
    { label: "中断当前命令", icon: "stop", shortcut: "Ctrl+C", action: () => ctrl()?.interrupt() },
    { separator: true, label: "" },
    { label: "新建标签页", icon: "add", shortcut: "Ctrl+T", action: () => void openNewTab() },
    { label: "打开设置", icon: "settings", action: onOpenSettings },
  ];

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY });
  };

  return (
    <div className="terminal-view" onContextMenu={handleContextMenu}>
      <div className="terminal-container" ref={containerRef} />

      {menu && (
        <ContextMenu x={menu.x} y={menu.y} items={menuItems} onClose={() => setMenu(null)} />
      )}

      {toolbarExpanded ? (
        <div className="terminal-toolbar">
          <button onClick={() => controller.current?.copy()} title="复制 (Ctrl+Shift+C)">
            <span className="material-symbols-rounded ms-20">content_copy</span>
          </button>
          <button onClick={() => controller.current?.paste()} title="粘贴 (Ctrl+V)">
            <span className="material-symbols-rounded ms-20">content_paste</span>
          </button>
          <div className="toolbar-sep" />
          <button
            onClick={() => {
              setSearchVisible(true);
              requestAnimationFrame(() => searchInputRef.current?.focus());
            }}
            title="查找 (Ctrl+F)"
          >
            <span className="material-symbols-rounded ms-20">search</span>
          </button>
          <button onClick={() => controller.current?.clear()} title="清屏">
            <span className="material-symbols-rounded ms-20">delete_sweep</span>
          </button>
          <button onClick={() => controller.current?.interrupt()} title="中断 (Ctrl+C)">
            <span className="material-symbols-rounded ms-20">stop</span>
          </button>
          <div className="toolbar-sep" />
          <button onClick={() => setToolbarExpanded(false)} title="收起工具栏">
            <span className="material-symbols-rounded ms-20">more_vert</span>
          </button>
        </div>
      ) : (
        <button
          className="terminal-toolbar-min"
          onClick={() => setToolbarExpanded(true)}
          title="展开工具栏"
        >
          <span className="material-symbols-rounded">more_horiz</span>
        </button>
      )}

      {searchVisible && (
        <div className="terminal-search">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="查找..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
          <button onClick={handleSearchPrev} title="上一个 (Shift+Enter)">
            <span className="material-symbols-rounded ms-18">keyboard_arrow_up</span>
          </button>
          <button onClick={handleSearchNext} title="下一个 (Enter)">
            <span className="material-symbols-rounded ms-18">keyboard_arrow_down</span>
          </button>
          <button
            className="terminal-search-close"
            onClick={handleSearchClose}
            title="关闭 (Esc)"
          >
            <span className="material-symbols-rounded ms-18">close</span>
          </button>
        </div>
      )}
    </div>
  );
}
