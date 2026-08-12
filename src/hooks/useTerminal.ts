import { useEffect, useRef, type RefObject } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { SearchAddon } from "@xterm/addon-search";
import { WebglAddon } from "@xterm/addon-webgl";
import {
  closeSession,
  onSessionExit,
  resizeSession,
  writeToSession,
} from "../services/terminal";
import { eventStream } from "../services/eventStream";
import { getTheme, getXtermTheme } from "../services/themeService";
import { useSessions } from "../stores/sessions";
import { useSettings } from "../stores/settings";

/** Actions the surrounding UI can invoke on a live terminal instance. */
export interface TerminalController {
  term: Terminal;
  fit: () => void;
  copy: () => void;
  paste: () => void;
  clear: () => void;
  interrupt: () => void;
  search: (query: string) => void;
  searchNext: (query: string) => void;
  searchPrev: (query: string) => void;
  clearSearch: () => void;
}

/**
 * Owns one xterm.js instance for a single session, wired into the shared
 * EventStreamManager and the Tauri command layer. The instance lives for as
 * long as the tab is mounted (hidden panes stay mounted, so sessions survive
 * tab switches). Returns a ref to a `TerminalController` so the component can
 * render toolbar/search UI that acts on the terminal.
 */
export function useTerminal(
  containerRef: RefObject<HTMLDivElement | null>,
  tabId: string,
  sessionId: string,
  onRequestSearch: () => void,
): RefObject<TerminalController | null> {
  const controllerRef = useRef<TerminalController | null>(null);
  const onRequestSearchRef = useRef(onRequestSearch);
  onRequestSearchRef.current = onRequestSearch;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const settings = useSettings.getState();
    const term = new Terminal({
      scrollback: 10000,
      fontFamily: settings.fontFamily,
      fontSize: settings.fontSize,
      lineHeight: settings.lineHeight,
      theme: getXtermTheme(settings.theme, settings.mode),
      cursorStyle: settings.cursorStyle,
      cursorBlink: settings.cursorBlink,
      convertEol: false,
      allowTransparency: false,
      drawBoldTextInBrightColors: true,
    });

    const fit = new FitAddon();
    const search = new SearchAddon();
    term.loadAddon(fit);
    term.loadAddon(search);
    term.open(el);
    fit.fit();

    try {
      term.loadAddon(new WebglAddon());
    } catch (err) {
      console.warn("[terminal] WebGL renderer unavailable, using canvas:", err);
    }

    let disposed = false;

    /** Theme-aware match decorations (addon-search `decorations` option). */
    const searchDecorations = (): {
      matchBackground: string;
      matchBorder: string;
      matchOverviewRuler: string;
      activeMatchBackground: string;
      activeMatchBorder: string;
      activeMatchColorOverviewRuler: string;
    } => {
      const s = useSettings.getState();
      const colors = getTheme(s.theme, s.mode).colors;
      return {
        matchBackground: colors.selection,
        matchBorder: colors.selection,
        matchOverviewRuler: colors.selection,
        activeMatchBackground: colors.primary,
        activeMatchBorder: colors.primary,
        activeMatchColorOverviewRuler: colors.primary,
      };
    };

    const controller: TerminalController = {
      term,
      fit: () => fit.fit(),
      copy: () => {
        const selection = term.getSelection();
        if (selection) void navigator.clipboard.writeText(selection);
      },
      paste: () => {
        void navigator.clipboard
          .readText()
          .then((text) => {
            if (!disposed && text) void writeToSession(sessionId, text);
          })
          .catch(() => {});
      },
      clear: () => term.clear(),
      interrupt: () => {
        if (!disposed) void writeToSession(sessionId, "\x03");
      },
      search: (query) => {
        if (disposed) return;
        if (!query.trim()) {
          search.clearDecorations();
          return;
        }
        search.findNext(query, {
          incremental: true,
          decorations: searchDecorations(),
        });
      },
      searchNext: (query) => {
        if (disposed) return;
        if (!query.trim()) {
          search.clearDecorations();
          return;
        }
        search.findNext(query, {
          incremental: true,
          decorations: searchDecorations(),
        });
      },
      searchPrev: (query) => {
        if (disposed) return;
        if (!query.trim()) {
          search.clearDecorations();
          return;
        }
        search.findPrevious(query, { decorations: searchDecorations() });
      },
      clearSearch: () => {
        if (!disposed) search.clearDecorations();
      },
    };
    controllerRef.current = controller;

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

    // Ctrl+Shift+C copy, Ctrl+V paste, Ctrl+F open search.
    // attachCustomKeyEventHandler returns void (no disposable); the handler
    // dies with the terminal on dispose().
    term.attachCustomKeyEventHandler((ev) => {
      if (ev.type !== "keydown") return true;
      if (ev.ctrlKey && ev.shiftKey && ev.key.toLowerCase() === "c") {
        controller.copy();
        return false;
      }
      if (ev.ctrlKey && ev.key.toLowerCase() === "v") {
        controller.paste();
        return false;
      }
      if (ev.ctrlKey && ev.key.toLowerCase() === "f") {
        onRequestSearchRef.current();
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
      if (state.theme !== prev.theme || state.mode !== prev.mode) {
        term.options.theme = getXtermTheme(state.theme, state.mode);
      }
      if (state.cursorStyle !== prev.cursorStyle) {
        term.options.cursorStyle = state.cursorStyle;
      }
      if (state.cursorBlink !== prev.cursorBlink) {
        term.options.cursorBlink = state.cursorBlink;
      }
      if (needsFit) {
        fit.fit();
        const { cols, rows } = term;
        if (cols > 0 && rows > 0) void resizeSession(sessionId, cols, rows);
      }
    });

    return () => {
      disposed = true;
      controllerRef.current = null;
      unsubOutput();
      unsubExit();
      unsubSettings();
      dataDisposable.dispose();
      search.dispose();
      observer.disconnect();
      term.dispose();
      void closeSession(sessionId);
    };
  }, [containerRef, tabId, sessionId]);

  return controllerRef;
}
