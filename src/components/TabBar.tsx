import type { MouseEvent } from "react";
import { openNewTab } from "../actions/tabs";
import { useSessions, tabLabel } from "../stores/sessions";

export function TabBar() {
  const tabs = useSessions((s) => s.tabs);
  const activeId = useSessions((s) => s.activeId);
  const { activate, closeTab } = useSessions.getState();

  const handleMiddleClick = (e: MouseEvent<HTMLDivElement>, id: string) => {
    if (e.button === 1) closeTab(id);
  };

  return (
    <div className="tabbar">
      <button
        className="tabbar-new"
        title="New tab (Ctrl+T)"
        onClick={() => void openNewTab()}
      >
        <svg width="12" height="12" viewBox="0 0 12 12">
          <line x1="6" y1="1" x2="6" y2="11" stroke="currentColor" strokeWidth="1.4" />
          <line x1="1" y1="6" x2="11" y2="6" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      </button>

      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`tab ${tab.id === activeId ? "tab-active" : ""}`}
          onClick={() => activate(tab.id)}
          onMouseDown={(e) => handleMiddleClick(e, tab.id)}
          title={tab.title}
        >
          <span className="tab-label">{tabLabel(tab)}</span>
          <button
            className="tab-close"
            aria-label="Close tab (Ctrl+W)"
            onClick={(e) => {
              e.stopPropagation();
              closeTab(tab.id);
            }}
          >
            <svg width="8" height="8" viewBox="0 0 8 8">
              <line x1="0.5" y1="0.5" x2="7.5" y2="7.5" stroke="currentColor" strokeWidth="1.2" />
              <line x1="7.5" y1="0.5" x2="0.5" y2="7.5" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </button>
        </div>
      ))}

      {tabs.length === 0 && <span className="tabbar-empty">No sessions</span>}
    </div>
  );
}
