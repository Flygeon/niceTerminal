import { useEffect, type RefObject } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebglAddon } from "@xterm/addon-webgl";
import {
  closeSession,
  onSessionExit,
  resizeSession,
  writeToSession,
} from "../services/terminal";
import { eventStream } from "../services/eventStream";
import { getXtermTheme } from "../services/themeService";
import { useSessions } from "../stores/sessions";
import { useSettings } from "../stores/settings";

/**
 * Owns one xterm.js instance for a single session, wired into the shared
 * EventStreamManager and the Tauri command layer. The instance lives for as
 * long as the tab is mounted (hidden panes stay mounted, so sessions survive
 * tab switches).
 */
export function useTerminal(
  containerRef: RefObject<HTMLDivElement | null>,
  tabId: string,
  sessionId: string,
): void {
  // Create the terminal + subscriptions once per (container, tab, session).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const settings = useSettings.getState();
    const term = new Terminal({
      scrollback: 10000,
      fontFamily: settings.fontFamily,
      fontSize: settings.fontSize,
      theme: getXtermTheme(settings.themeName, settings.mode),
      cursorBlink: true,
      convertEol: false,
      allowTransparency: false,
      drawBoldTextInBrightColors: true,
    });

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(el);
    fit.fit();

    try {
      term.loadAddon(new WebglAddon());
    } catch (err) {
      console.warn("[terminal] WebGL renderer unavailable, using canvas:", err);
    }

    let disposed = false;

    // Output frames → xterm, coalesced at ≤60fps by the EventStreamManager.
    const unsubOutput = eventStream.subscribe((sid, data) => {
      if (!disposed && sid === sessionId) term.write(data);
    });

    // Exit → close the tab (session cleanup happens via closeSession below).
    const unsubExit = onSessionExit((e) => {
      if (!disposed && e.sessionId === sessionId) {
        useSessions.getState().closeTab(tabId);
      }
    });

    // Keyboard input → PTY.
    const dataDisposable = term.onData((data) => {
      if (!disposed) void writeToSession(sessionId, data);
    });

    // Ctrl+Shift+C copies the selection; Ctrl+V pastes.
    // attachCustomKeyEventHandler returns void (no disposable); the handler
    // dies with the terminal on dispose().
    term.attachCustomKeyEventHandler((ev) => {
      if (ev.type !== "keydown") return true;
      if (ev.ctrlKey && ev.shiftKey && ev.key.toLowerCase() === "c") {
        const selection = term.getSelection();
        if (selection) void navigator.clipboard.writeText(selection);
        return false;
      }
      if (ev.ctrlKey && ev.key.toLowerCase() === "v") {
        void navigator.clipboard
          .readText()
          .then((text) => {
            if (!disposed && text) void writeToSession(sessionId, text);
          })
          .catch(() => {});
        return false;
      }
      return true;
    });

    // Keep the PTY size in sync with the container.
    const sendSize = () => {
      if (disposed) return;
      fit.fit();
      const { cols, rows } = term;
      if (cols > 0 && rows > 0) void resizeSession(sessionId, cols, rows);
    };
    const observer = new ResizeObserver(() => sendSize());
    observer.observe(el);
    // Give the layout a tick to settle before the initial fit.
    requestAnimationFrame(sendSize);

    // Live re-theming / font updates from the settings store.
    const unsubSettings = useSettings.subscribe((state, prev) => {
      if (disposed) return;
      let needsFit = false;
      if (state.fontFamily !== prev.fontFamily) {
        term.options.fontFamily = state.fontFamily;
        needsFit = true;
      }
      if (state.fontSize !== prev.fontSize) {
        term.options.fontSize = state.fontSize;
        needsFit = true;
      }
      if (state.themeName !== prev.themeName || state.mode !== prev.mode) {
        term.options.theme = getXtermTheme(state.themeName, state.mode);
      }
      if (needsFit) {
        fit.fit();
        const { cols, rows } = term;
        if (cols > 0 && rows > 0) void resizeSession(sessionId, cols, rows);
      }
    });

    return () => {
      disposed = true;
      unsubOutput();
      unsubExit();
      unsubSettings();
      dataDisposable.dispose();
      observer.disconnect();
      term.dispose();
      void closeSession(sessionId);
    };
  }, [containerRef, tabId, sessionId]);
}
