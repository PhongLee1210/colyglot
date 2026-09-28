import { create } from "zustand";

export type PlotSelection = {
  key: string;
  bedId: string;
  slotIndex: number;
};

type SelectionStoreState = {
  plot: PlotSelection | null;
  selectPlot: (selection: PlotSelection) => void;
  clearSelection: () => void;
};

// Which farm plot the player tapped. Shared between the 3D highlight
// (inside the Canvas) and the DOM info card so neither side has to
// prop-drill across the renderer boundary.
export const useSelectionStore = create<SelectionStoreState>((set) => ({
  plot: null,
  selectPlot: (plot) => set({ plot }),
  clearSelection: () => set({ plot: null }),
}));
