import type { TerminalController } from "../hooks/useTerminal";

/**
 * Registry of live terminal controllers keyed by sessionId. The command
 * palette and other app-level UI need to act on the *active* terminal even
 * though controllers live inside per-tab TerminalView instances.
 */
const controllers = new Map<string, TerminalController>();

export const terminalRegistry = {
  register(sessionId: string, controller: TerminalController): void {
    controllers.set(sessionId, controller);
  },
  unregister(sessionId: string): void {
    controllers.delete(sessionId);
  },
  get(sessionId: string): TerminalController | null {
    return controllers.get(sessionId) ?? null;
  },
};
