import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { eventStream } from "./eventStream";
import type {
  NewSessionRequest,
  SessionInfo,
  ShellInfo,
  TerminalExitEvent,
  TerminalOutputEvent,
} from "../types/terminal";

let bridgePromise: Promise<void> | null = null;

const exitListeners = new Set<(e: TerminalExitEvent) => void>();

export async function createSession(
  req: NewSessionRequest,
): Promise<SessionInfo> {
  return invoke<SessionInfo>("new_session", { request: req });
}

export function writeToSession(
  sessionId: string,
  data: string,
): Promise<void> {
  return invoke("write_to_session", { id: sessionId, data });
}

export function resizeSession(
  sessionId: string,
  cols: number,
  rows: number,
): Promise<void> {
  return invoke("resize_session", { id: sessionId, cols, rows });
}

export function closeSession(sessionId: string): Promise<void> {
  return invoke("close_session", { id: sessionId });
}

export function listSessions(): Promise<SessionInfo[]> {
  return invoke<SessionInfo[]>("list_sessions");
}

export function resolveShell(
  shellOverride?: string,
): Promise<ShellInfo> {
  return invoke<ShellInfo>("resolve_shell", { shellOverride });
}

/**
 * Register the Rust→frontend event bridge once. All output frames fan out to
 * the shared EventStreamManager; exit events fan out to local subscribers.
 */
export function ensureTerminalEventBridge(): Promise<void> {
  if (!bridgePromise) {
    bridgePromise = (async () => {
      await listen<TerminalOutputEvent>("terminal:output", (e) => {
        eventStream.push(e.payload);
      });
      await listen<TerminalExitEvent>("terminal:exit", (e) => {
        for (const listener of exitListeners) listener(e.payload);
      });
    })().catch((err) => {
      bridgePromise = null; // allow retry
      throw err;
    });
  }
  return bridgePromise;
}

export function onSessionExit(
  listener: (e: TerminalExitEvent) => void,
): () => void {
  exitListeners.add(listener);
  return () => exitListeners.delete(listener);
}
