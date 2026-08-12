import { createSession } from "../services/terminal";
import { useSessions } from "../stores/sessions";

/**
 * Open a new backend PTY session and register it as a tab. The session is
 * created *before* the tab so TerminalView always mounts with a live
 * sessionId to wire its event subscriptions to.
 */
export async function openNewTab(): Promise<void> {
  try {
    const info = await createSession({ cols: 80, rows: 24 });
    useSessions.getState().addTab({
      sessionId: info.id,
      title: info.shell,
      cwd: info.cwd,
      shell: info.shell,
    });
  } catch (err) {
    console.error("[tabs] failed to open session:", err);
  }
}

export function closeActiveTab(): void {
  const { activeId } = useSessions.getState();
  if (activeId) useSessions.getState().closeTab(activeId);
}
