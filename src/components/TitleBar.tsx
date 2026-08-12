import { getCurrentWindow } from "@tauri-apps/api/window";

/**
 * Custom title bar. Window decorations are disabled in tauri.conf.json
 * (decorations: false), so the app draws its own. The `data-tauri-drag-region`
 * attribute makes the window draggable; the controls call the Tauri window API.
 */
export function TitleBar() {
  const appWindow = getCurrentWindow();

  return (
    <header className="titlebar" data-tauri-drag-region>
      <div className="titlebar-brand" data-tauri-drag-region>
        <span className="titlebar-mark">▮</span>
        <span className="titlebar-title">niceTerminal</span>
      </div>
      <div className="titlebar-controls">
        <button
          className="titlebar-btn"
          aria-label="Minimize"
          title="Minimize"
          onClick={() => void appWindow.minimize()}
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <line x1="0" y1="5" x2="10" y2="5" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>
        <button
          className="titlebar-btn"
          aria-label="Maximize"
          title="Maximize"
          onClick={() => void appWindow.toggleMaximize()}
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <rect
              x="0.5"
              y="0.5"
              width="9"
              height="9"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            />
          </svg>
        </button>
        <button
          className="titlebar-btn titlebar-btn-close"
          aria-label="Close"
          title="Close"
          onClick={() => void appWindow.close()}
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1.2" />
            <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </button>
      </div>
    </header>
  );
}
