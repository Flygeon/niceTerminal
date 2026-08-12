import { useSessions } from "../stores/sessions";

interface StatusBarProps {
  onOpenSettings: () => void;
}

export function StatusBar({ onOpenSettings }: StatusBarProps) {
  const tabs = useSessions((s) => s.tabs);
  const activeId = useSessions((s) => s.activeId);
  const activeTab = tabs.find((t) => t.id === activeId);

  return (
    <div className="status-bar">
      <div className="status-left">
        <div className="status-item">
          <span className="status-icon">💻</span>
          <span>{activeTab?.title || "无活动会话"}</span>
        </div>
        {activeTab && activeTab.cwd && (
          <div className="status-item">
            <span className="status-icon">📁</span>
            <span title={activeTab.cwd}>
              {activeTab.cwd.length > 40
                ? "..." + activeTab.cwd.slice(-37)
                : activeTab.cwd}
            </span>
          </div>
        )}
      </div>
      <div className="status-right">
        <div className="status-item">
          <span>{tabs.length} 个标签页</span>
        </div>
        <button className="status-btn" onClick={onOpenSettings}>
          ⚙️ 设置
        </button>
      </div>
    </div>
  );
}
