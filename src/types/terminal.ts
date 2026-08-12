/** Event emitted from Rust for every output frame of a PTY session. */
export interface TerminalOutputEvent {
  sessionId: string;
  data: string;
  frameId: number;
  isTruncated: boolean;
  totalBytes: number;
}

export type ExitReason = "eof" | "truncated" | "killed";

export interface TerminalExitEvent {
  sessionId: string;
  reason: ExitReason;
}

export interface SessionInfo {
  id: string;
  shell: string;
  shellPath: string;
  cwd: string;
  startedAt: number;
}

export interface ShellInfo {
  name: string;
  path: string;
  args: string[];
}

export interface NewSessionRequest {
  cols: number;
  rows: number;
  cwd?: string;
  shell?: string;
}
