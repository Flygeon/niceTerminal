import { getConfig, setConfig } from "./config";
import { createSession } from "./terminal";
import { useSessions } from "../stores/sessions";
import { openNewTab } from "../actions/tabs";

/**
 * Window history: the set of open tabs (shell + working directory) is
 * persisted to config and restored on the next launch, so the app comes back
 * to the same workspace the user left. Only the shell + cwd are saved — PTY
 * output and session ids are ephemeral and never persisted.
 */

export interface HistoryTab {
  shell: string;
  cwd?: string;
}

export interface WindowHistory {
  tabs: HistoryTab[];
  activeIndex: number;
}

const HISTORY_KEY = "window.history";

/** Save the current tabs + active tab to config. */
export function persistWindowHistory(): Promise<void> {
  const { tabs, activeId } = useSessions.getState();
  const activeIndex = tabs.findIndex((t) => t.id === activeId);
  const history: WindowHistory = {
    tabs: tabs.map((t) => ({ shell: t.shell ?? "", cwd: t.cwd })),
    activeIndex: activeIndex < 0 ? 0 : activeIndex,
  };
  return setConfig(HISTORY_KEY, history);
}

export async function loadWindowHistory(): Promise<WindowHistory | null> {
  const h = await getConfig<WindowHistory | null>(HISTORY_KEY, null);
  if (h && Array.isArray(h.tabs) && h.tabs.length > 0) {
    return h;
  }
  return null;
}

/** Re-open the saved tabs, restoring the previous active tab. */
export async function restoreSessionHistory(): Promise<void> {
  const history = await loadWindowHistory();
  if (!history || history.tabs.length === 0) {
    await openNewTab();
    return;
  }

  const ids: string[] = [];
  for (const t of history.tabs) {
    try {
      const info = await createSession({
        cols: 80,
        rows: 24,
        cwd: t.cwd,
        shell: t.shell || undefined,
      });
      const id = useSessions.getState().addTab({
        sessionId: info.id,
        title: info.shell,
        cwd: info.cwd,
        shell: info.shell,
      });
      ids.push(id);
    } catch (err) {
      console.warn("[history] failed to restore a tab:", err);
    }
  }

  if (ids.length === 0) {
    await openNewTab();
    return;
  }

  const active =
    ids[Math.min(Math.max(history.activeIndex, 0), ids.length - 1)];
  useSessions.getState().activate(active);
}
