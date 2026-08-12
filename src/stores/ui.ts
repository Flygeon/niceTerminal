import { create } from "zustand";

/**
 * App-level UI state (command palette visibility). Kept separate from
 * settings/sessions so any component can open the palette without prop
 * drilling — the terminal key handler opens it via this store.
 */
interface UiState {
  paletteOpen: boolean;
  openPalette: () => void;
  closePalette: () => void;
}

export const useUi = create<UiState>((set) => ({
  paletteOpen: false,
  openPalette: () => set({ paletteOpen: true }),
  closePalette: () => set({ paletteOpen: false }),
}));
