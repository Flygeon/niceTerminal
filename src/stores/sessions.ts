import { create } from "zustand";

export interface Tab {
  id: string;
  sessionId: string;
  title: string;
  cwd?: string;
  shell?: string;
}

interface SessionsState {
  tabs: Tab[];
  activeId: string | null;
  addTab: (tab: Omit<Tab, "id">) => string;
  closeTab: (id: string) => void;
  activate: (id: string) => void;
  rename: (id: string, patch: Partial<Omit<Tab, "id">>) => void;
}

export const useSessions = create<SessionsState>((set) => ({
  tabs: [],
  activeId: null,

  addTab: (tab) => {
    const id = crypto.randomUUID();
    set((s) => {
      const tabs = [...s.tabs, { ...tab, id }];
      return { tabs, activeId: id };
    });
    return id;
  },

  closeTab: (id) =>
    set((s) => {
      const tabs = s.tabs.filter((t) => t.id !== id);
      const activeId =
        s.activeId === id ? (tabs[tabs.length - 1]?.id ?? null) : s.activeId;
      return { tabs, activeId };
    }),

  activate: (id) => set({ activeId: id }),

  rename: (id, patch) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    })),
}));

/** Tab title derived from shell + cwd, e.g. "pwsh · ~/code". */
export function tabLabel(tab: Tab): string {
  const cwd = tab.cwd ? ` · ${basename(tab.cwd)}` : "";
  return `${tab.shell ?? "shell"}${cwd}`;
}

function basename(path: string): string {
  const trimmed = path.replace(/[\\/]+$/, "");
  const parts = trimmed.split(/[\\/]/);
  return parts[parts.length - 1] || path;
}
