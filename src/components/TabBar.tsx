import { useSessions } from "../stores/sessions";
import { openNewTab } from "../actions/tabs";

export function TabBar() {
  const tabs = useSessions((s) => s.tabs);
  const activeId = useSessions((s) => s.activeId);
  const activate = useSessions((s) => s.activate);
  const closeTab = useSessions((s) => s.closeTab);

  return (
    <div className="tab-bar" role="tablist">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tab"
          aria-selected={tab.id === activeId}
          className={`tab ${tab.id === activeId ? "active" : ""}`}
          onClick={() => activate(tab.id)}
        >
          <span className="tab-title">{tab.title}</span>
          <button
            className="tab-close"
            onClick={(e) => {
              e.stopPropagation();
              closeTab(tab.id);
            }}
            aria-label="关闭标签页"
          >
            <span className="material-symbols-rounded ms-16">close</span>
          </button>
        </div>
      ))}
      <button
        className="tab-new"
        onClick={() => void openNewTab()}
        aria-label="新建标签页"
      >
        <span className="material-symbols-rounded">add</span>
      </button>
    </div>
  );
}
