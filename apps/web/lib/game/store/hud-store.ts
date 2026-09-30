import { create } from "zustand";

export type PanelTabId =
  | "seeds"
  | "shop"
  | "progress"
  | "missions"
  | "workshop"
  | "orders"
  | "wonders"
  | "neighbors";

export const DEFAULT_PANEL_TAB: PanelTabId = "seeds";

type HudStoreState = {
  openTab: PanelTabId | null;
  lastTab: PanelTabId;
  openPanel: (tab: PanelTabId) => void;
  closePanel: () => void;
  togglePanel: (tab?: PanelTabId) => void;
};

// Which side-panel tab the HUD is showing. `lastTab` remembers the player's
// place so reopening the panel from the rail returns them there instead of
// resetting to seeds.
export const useHudStore = create<HudStoreState>((set, get) => ({
  openTab: null,
  lastTab: DEFAULT_PANEL_TAB,
  openPanel: (tab) => set({ openTab: tab, lastTab: tab }),
  closePanel: () => set({ openTab: null }),
  togglePanel: (tab) => {
    const { openTab, lastTab } = get();
    const target = tab ?? lastTab;
    if (openTab === target) {
      set({ openTab: null });
      return;
    }
    set({ openTab: target, lastTab: target });
  },
}));
