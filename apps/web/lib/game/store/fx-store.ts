import { create } from "zustand";

import type { AnimalClipName } from "@/lib/game/3d/animal-clips";
import type { CropStage } from "@/lib/game/core/crops";

export type HarvestFxEntry = {
  key: string;
  bedId: string;
  slotIndex: number;
  hanzi: string;
  stage: CropStage;
  startedAt: number;
};

export type HarvestFxInput = Omit<HarvestFxEntry, "startedAt">;

export type CoinOrigin = { key: string; amount: number };

export type CoinFlight = {
  id: number;
  x: number;
  y: number;
  amount: number;
};

type FxState = {
  // 0 under prefers-reduced-motion: every transition collapses instantly.
  motionScale: number;
  harvests: HarvestFxEntry[];
  // World-space plot origins awaiting projection by the in-canvas host.
  coinOrigins: CoinOrigin[];
  coinFlights: CoinFlight[];
  reaction: { clip: AnimalClipName; id: number } | null;
  setMotionScale: (scale: number) => void;
  celebrateHarvest: (entries: HarvestFxInput[], goldAwarded: number) => void;
  react: (clip: AnimalClipName) => void;
  takeCoinOrigins: () => CoinOrigin[];
  addCoinFlights: (flights: CoinFlight[]) => void;
  settleCoinFlight: (id: number) => void;
  reapHarvests: (now: number, durationMs: number) => void;
};

let reactionSeq = 0;

// Transient animation state only (Golden Rule #1): the farm store stays
// the sole source of gameplay truth, and every entry here self-destructs
// once its animation window passes. Ghost entries deliberately carry no
// positions — the 3D layer derives geometry from bed/slot so the store
// never duplicates layout knowledge.
export const useFxStore = create<FxState>((set, get) => ({
  motionScale: 1,
  harvests: [],
  coinOrigins: [],
  coinFlights: [],
  reaction: null,
  setMotionScale: (scale) => set({ motionScale: scale }),
  celebrateHarvest: (entries, goldAwarded) => {
    const { motionScale } = get();
    if (motionScale <= 0) return;
    if (entries.length === 0) return;
    const startedAt = performance.now();
    const perPlot = Math.max(1, Math.round(goldAwarded / entries.length));
    set({
      harvests: entries.map((entry) => ({ ...entry, startedAt })),
      coinOrigins: entries.map((entry) => ({
        key: entry.key,
        amount: perPlot,
      })),
      reaction: { clip: "cheer", id: ++reactionSeq },
    });
  },
  react: (clip) => {
    if (get().motionScale <= 0) return;
    set({ reaction: { clip, id: ++reactionSeq } });
  },
  takeCoinOrigins: () => {
    const origins = get().coinOrigins;
    if (origins.length > 0) set({ coinOrigins: [] });
    return origins;
  },
  addCoinFlights: (flights) =>
    set((state) => ({ coinFlights: [...state.coinFlights, ...flights] })),
  settleCoinFlight: (id) =>
    set((state) => ({
      coinFlights: state.coinFlights.filter((flight) => flight.id !== id),
    })),
  reapHarvests: (now, durationMs) => {
    const harvests = get().harvests;
    if (harvests.length === 0) return;
    set({
      harvests: harvests.filter((entry) => now - entry.startedAt < durationMs),
    });
  },
}));
