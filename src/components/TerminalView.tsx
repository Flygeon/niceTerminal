import { useEffect, useRef } from "react";
import "@xterm/xterm/css/xterm.css";
import type { Tab } from "../stores/sessions";
import { useTerminal } from "../hooks/useTerminal";

export function TerminalView({ tab }: { tab: Tab }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useTerminal(containerRef, tab.id, tab.sessionId);

  useEffect(() => {
    // Focus the xterm textarea when this pane becomes active.
    containerRef.current?.querySelector("textarea")?.focus();
  }, []);

  return <div className="terminal-container" ref={containerRef} />;
}
