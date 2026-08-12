import { useEffect, useRef, useState } from "react";
import { useTerminal } from "../hooks/useTerminal";
import type { Tab } from "../stores/sessions";

interface TerminalViewProps {
  tab: Tab;
}

export function TerminalView({ tab }: TerminalViewProps) {
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
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  const handleCopy = () => {
    controller.current?.copy();
  };

  const handlePaste = () => {
    controller.current?.paste();
  };

  const handleClear = () => {
    controller.current?.clear();
  };

  const handleInterrupt = () => {
    controller.current?.interrupt();
  };

  const handleSearchClick = () => {
    setSearchVisible(true);
  };

  return (
    <div className="terminal-view">
      <div className="terminal-container" ref={containerRef} />

      {toolbarExpanded ? (
        <div className="terminal-toolbar">
          <button onClick={handleCopy} title="复制 (Ctrl+Shift+C)">
            📋
          </button>
          <button onClick={handlePaste} title="粘贴 (Ctrl+V)">
            📥
          </button>
          <div className="toolbar-sep" />
          <button onClick={handleSearchClick} title="查找 (Ctrl+F)">
            🔍
          </button>
          <button onClick={handleClear} title="清屏">
            🗑️
          </button>
          <button onClick={handleInterrupt} title="中断 (Ctrl+C)">
            ⏹
          </button>
          <div className="toolbar-sep" />
          <button onClick={() => setToolbarExpanded(false)} title="收起">
            ⋯
          </button>
        </div>
      ) : (
        <button
          className="terminal-toolbar-min"
          onClick={() => setToolbarExpanded(true)}
          title="展开工具栏"
        >
          ⋯
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
            ▲
          </button>
          <button onClick={handleSearchNext} title="下一个 (Enter)">
            ▼
          </button>
          <button
            className="terminal-search-close"
            onClick={handleSearchClose}
            title="关闭 (Esc)"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
