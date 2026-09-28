import { create } from "zustand";

import type { FarmWorldSnapshot } from "@/lib/game/types";

type FarmStoreState = {
  snapshot: FarmWorldSnapshot | null;
  hydrate: (snapshot: FarmWorldSnapshot) => void;
};

export const useFarmStore = create<FarmStoreState>((set) => ({
  snapshot: null,
  hydrate: (snapshot) => set({ snapshot }),
}));
