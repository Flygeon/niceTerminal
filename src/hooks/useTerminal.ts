import { useEffect, useRef, type RefObject } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { SearchAddon } from "@xterm/addon-search";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  closeSession,
  onSessionExit,
  resizeSession,
  writeToSession,
} from "../services/terminal";
import { eventStream } from "../services/eventStream";
import { schemeXtermTheme } from "../services/scheme";
import { terminalRegistry } from "../services/terminalRegistry";
import { useSessions } from "../stores/sessions";
import { useSettings } from "../stores/settings";
import { useUi } from "../stores/ui";

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
      theme: schemeXtermTheme(settings.scheme, settings.mode),
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
    term.loadAddon(new WebLinksAddon((event, uri) => {
      event.preventDefault();
      void openUrl(uri);
    }));
    term.open(el);
    fit.fit();

    // NOTE: deliberately no WebglAddon. The default DOM renderer handles the
    // search addon's match decorations reliably; WebGL + decorations had a
    // rendering glitch that grayed out the terminal while typing in search.
    // If GPU-accelerated rendering is needed later, gate it behind "no active
    // search" rather than enabling it unconditionally.

    let disposed = false;

    /** Theme-aware match decorations — colors follow the active MD3 scheme. */
    const searchDecorations = (): {
      matchBackground: string;
      matchBorder: string;
      matchOverviewRuler: string;
      activeMatchBackground: string;
      activeMatchBorder: string;
      activeMatchColorOverviewRuler: string;
    } => {
      const root = getComputedStyle(document.documentElement);
      const read = (name: string) => root.getPropertyValue(name).trim();
      const primary = read("--md-sys-color-primary") || "#6750a4";
      const secondaryContainer =
        read("--md-sys-color-secondary-container") ||
        read("--md-sys-color-primary-container") ||
        "#e9ddff";
      return {
        matchBackground: secondaryContainer,
        matchBorder: secondaryContainer,
        matchOverviewRuler: primary,
        activeMatchBackground: primary,
        activeMatchBorder: primary,
        activeMatchColorOverviewRuler: primary,
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
        try {
          if (!query.trim()) {
            search.clearDecorations();
            return;
          }
          search.findNext(query, {
            incremental: true,
            decorations: searchDecorations(),
          });
        } catch (err) {
          console.warn("[terminal] search failed:", err);
        }
      },
      searchNext: (query) => {
        if (disposed) return;
        try {
          if (!query.trim()) {
            search.clearDecorations();
            return;
          }
          search.findNext(query, {
            incremental: true,
            decorations: searchDecorations(),
          });
        } catch (err) {
          console.warn("[terminal] searchNext failed:", err);
        }
      },
      searchPrev: (query) => {
        if (disposed) return;
        try {
          if (!query.trim()) {
            search.clearDecorations();
            return;
          }
          search.findPrevious(query, { decorations: searchDecorations() });
        } catch (err) {
          console.warn("[terminal] searchPrev failed:", err);
        }
      },
      clearSearch: () => {
        if (disposed) return;
        try {
          search.clearDecorations();
        } catch (err) {
          console.warn("[terminal] clearSearch failed:", err);
        }
      },
    };
    controllerRef.current = controller;
    terminalRegistry.register(sessionId, controller);

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

    // Best-effort cwd tracking: parse `cd`-style commands from the input so
    // the status bar shows the live directory and window history restores it.
    let cwd =
      useSessions.getState().tabs.find((t) => t.id === tabId)?.cwd ?? "";
    let cmdLine = "";

    const resolveWindowsPath = (base: string, target: string): string => {
      const isAbs =
        /^[a-zA-Z]:[\\/]/.test(target) || target.startsWith("\\\\");
      const combined = isAbs
        ? target
        : (base.replace(/[\\/]+$/, "") || "C:\\") + "\\" + target;
      const unc = combined.startsWith("\\\\");
      const parts = combined.split(/[\\/]+/).filter(Boolean);
      const out: string[] = [];
      for (const part of parts) {
        if (part === ".") continue;
        if (part === "..") {
          if (out.length > 1) out.pop();
          else if (!/^[a-zA-Z]:$/.test(out[0] ?? "")) out.pop();
        } else {
          out.push(part);
        }
      }
      let res = out.join("\\");
      if (/^[a-zA-Z]:$/.test(out[0] ?? "")) {
        res = out[0] + (out.length > 1 ? "\\" + out.slice(1).join("\\") : "\\");
      } else if (unc) {
        res = "\\\\" + res;
      }
      return res.replace(/[\\/]+$/, "") || "C:\\";
    };

    const stripQuotes = (s: string): string => {
      if (
        (s.startsWith('"') && s.endsWith('"')) ||
        (s.startsWith("'") && s.endsWith("'"))
      ) {
        return s.slice(1, -1);
      }
      return s;
    };

    const handleCdLine = (line: string) => {
      const m = line.trim().match(/^(?:cd|sl|set-location)\s+(.+)$/i);
      if (!m) return;
      const target = stripQuotes(m[1].trim());
      if (!target) return;
      try {
        const resolved = resolveWindowsPath(cwd, target);
        cwd = resolved;
        useSessions.getState().rename(tabId, { cwd: resolved });
      } catch {
        // ignore malformed paths
      }
    };

    const feedCwdTracker = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n") {
          handleCdLine(cmdLine);
          cmdLine = "";
        } else if (ch === "\x03" || ch === "\x1b") {
          cmdLine = "";
        } else if (ch === "\x7f" || ch === "\x08") {
          cmdLine = cmdLine.slice(0, -1);
        } else if (ch >= " ") {
          cmdLine += ch;
        }
      }
    };

    // Keyboard input → PTY.
    const dataDisposable = term.onData((data) => {
      if (!disposed) void writeToSession(sessionId, data);
      feedCwdTracker(data);
    });

    // Ctrl+Shift+C copy, Ctrl+V paste, Ctrl+F open search.
    // attachCustomKeyEventHandler returns void (no disposable); the handler
    // dies with the terminal on dispose().
    term.attachCustomKeyEventHandler((ev) => {
      if (ev.type !== "keydown") return true;
      if (ev.ctrlKey && ev.key.toLowerCase() === "k") {
        useUi.getState().openPalette();
        return false;
      }
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
      if (state.scheme !== prev.scheme || state.mode !== prev.mode) {
        term.options.theme = schemeXtermTheme(state.scheme, state.mode);
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
      terminalRegistry.unregister(sessionId);
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
