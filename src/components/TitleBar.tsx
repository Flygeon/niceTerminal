import { getCurrentWindow } from "@tauri-apps/api/window";

export function TitleBar() {
  const appWindow = getCurrentWindow();

  return (
    <div className="title-bar" data-tauri-drag-region>
      <div className="title-bar-left" data-tauri-drag-region>
        <span className="title-bar-logo">
          <span className="material-symbols-rounded ms-20">terminal</span>
        </span>
        <span className="title-bar-title">niceTerminal</span>
      </div>
      <div className="title-bar-center" data-tauri-drag-region />
      <div className="title-bar-actions">
        <button
          className="title-bar-btn minimize"
          onClick={() => void appWindow.minimize()}
          aria-label="最小化"
        >
          <span className="material-symbols-rounded ms-16">minimize</span>
        </button>
        <button
          className="title-bar-btn maximize"
          onClick={() => void appWindow.toggleMaximize()}
          aria-label="最大化"
        >
          <span className="material-symbols-rounded ms-16">crop_square</span>
        </button>
        <button
          className="title-bar-btn close"
          onClick={() => void appWindow.close()}
          aria-label="关闭"
        >
          <span className="material-symbols-rounded ms-18">close</span>
        </button>
      </div>
    </div>
  );
}
