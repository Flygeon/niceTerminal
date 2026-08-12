import type { TerminalOutputEvent } from "../types/terminal";

export type OutputListener = (
  sessionId: string,
  data: string,
  meta: TerminalOutputEvent,
) => void;

/**
 * Event Stream Manager — the "rendering throttle" layer of the design doc.
 *
 * Raw PTY frames arrive from Rust potentially faster than the UI can paint.
 * This manager coalesces per-session output into a single buffer and flushes
 * it once per animation frame (≈60fps), so xterm.js is never written to more
 * than once per frame per session.
 */
export class EventStreamManager {
  private listeners = new Set<OutputListener>();
  private pending = new Map<string, string>();
  private meta = new Map<string, TerminalOutputEvent>();
  private rafId: number | null = null;

  subscribe(listener: OutputListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  push(event: TerminalOutputEvent): void {
    if (!event.data) return;
    const current = this.pending.get(event.sessionId) ?? "";
    this.pending.set(event.sessionId, current + event.data);
    this.meta.set(event.sessionId, event);
    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    if (this.rafId !== null) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.flush();
    });
  }

  private flush(): void {
    if (this.pending.size === 0) return;
    for (const [sessionId, data] of this.pending) {
      const meta = this.meta.get(sessionId);
      if (!meta) continue;
      for (const listener of this.listeners) {
        listener(sessionId, data, meta);
      }
    }
    this.pending.clear();
    this.meta.clear();
  }

  detach(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.listeners.clear();
    this.pending.clear();
    this.meta.clear();
  }
}

/** App-wide singleton; all TerminalViews subscribe through it. */
export const eventStream = new EventStreamManager();
