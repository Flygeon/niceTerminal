import { getCurrentWindow } from "@tauri-apps/api/window";

const appWindow = getCurrentWindow();

export function TitleBar() {
  return (
    <div className="title-bar" data-tauri-drag-region>
      <div className="title-bar-left" data-tauri-drag-region>
        <div className="title-bar-logo">▣</div>
        <span className="title-bar-title">niceTerminal</span>
      </div>
      <div className="title-bar-center" data-tauri-drag-region />
      <div className="title-bar-actions">
        <button
          className="title-bar-btn minimize"
          onClick={() => void appWindow.minimize()}
          aria-label="最小化"
        >
          ―
        </button>
        <button
          className="title-bar-btn maximize"
          onClick={() => void appWindow.toggleMaximize()}
          aria-label="最大化"
        >
          ☐
        </button>
        <button
          className="title-bar-btn close"
          onClick={() => void appWindow.close()}
          aria-label="关闭"
        >
          ×
        </button>
      </div>
    </div>
  );
}
