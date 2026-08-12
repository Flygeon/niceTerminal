import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import "@xterm/xterm/css/xterm.css";
import type { Tab } from "../stores/sessions";
import { useTerminal, type TerminalController } from "../hooks/useTerminal";

/**
 * A single tab's terminal plus the §7.5 quick-action toolbar (copy / paste /
 * find / clear / interrupt, hideable) and the in-terminal search bar (Ctrl+F).
 * Everything is per-pane so hidden tabs keep their own toolbar/search state.
 */
export function TerminalView({ tab }: { tab: Tab }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [toolbarOpen, setToolbarOpen] = useState(true);

  const controllerRef = useTerminal(containerRef, tab.id, tab.sessionId, () => {
    setSearchOpen(true);
    requestAnimationFrame(() => searchInputRef.current?.focus());
  });

  useEffect(() => {
    containerRef.current?.querySelector("textarea")?.focus();
  }, []);

  const ctrl = (): TerminalController | null => controllerRef.current;

  const openSearch = () => {
    setSearchOpen(true);
    requestAnimationFrame(() => searchInputRef.current?.focus());
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setQuery("");
    ctrl()?.clearSearch();
  };

  const handleSearchKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) ctrl()?.searchPrev(query);
      else ctrl()?.searchNext(query);
    } else if (e.key === "Escape") {
      closeSearch();
    }
  };

  return (
    <div className="terminal-view">
      <div className="terminal-container" ref={containerRef} />

      {searchOpen && (
        <div className="terminal-search">
          <input
            ref={searchInputRef}
            value={query}
            placeholder="查找…  ⏎ 下一个 · ⇧⏎ 上一个 · Esc 关闭"
            spellCheck={false}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value) ctrl()?.searchNext(e.target.value);
              else ctrl()?.clearSearch();
            }}
            onKeyDown={handleSearchKey}
          />
          <button
            title="上一个 (Shift+Enter)"
            onClick={() => ctrl()?.searchPrev(query)}
          >
            ▲
          </button>
          <button title="下一个 (Enter)" onClick={() => ctrl()?.searchNext(query)}>
            ▼
          </button>
          <button className="terminal-search-close" title="关闭 (Esc)" onClick={closeSearch}>
            ✕
          </button>
        </div>
      )}

      {toolbarOpen ? (
        <div className="terminal-toolbar">
          <button title="复制 (Ctrl+Shift+C)" onClick={() => ctrl()?.copy()}>
            📋
          </button>
          <button title="粘贴 (Ctrl+V)" onClick={() => ctrl()?.paste()}>
            📥
          </button>
          <button title="查找 (Ctrl+F)" onClick={openSearch}>
            🔍
          </button>
          <button title="清屏" onClick={() => ctrl()?.clear()}>
            🗑️
          </button>
          <button title="中断当前命令 (Ctrl+C)" onClick={() => ctrl()?.interrupt()}>
            ⏹
          </button>
          <span className="toolbar-sep" />
          <button title="隐藏工具栏" onClick={() => setToolbarOpen(false)}>
            ≫
          </button>
        </div>
      ) : (
        <button
          className="terminal-toolbar-min"
          title="显示工具栏"
          onClick={() => setToolbarOpen(true)}
        >
          ⋯
        </button>
      )}
    </div>
  );
}
