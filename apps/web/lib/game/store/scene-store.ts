import { create } from "zustand";

type SceneStoreState = {
  sceneReady: boolean;
  markSceneReady: () => void;
};

// Bridges the 3D canvas (dynamically imported, suspense-gated) to the DOM
// loading overlay: the reporter inside the asset Suspense boundary fires
// once every GLB-dependent child has mounted.
export const useSceneStore = create<SceneStoreState>((set) => ({
  sceneReady: false,
  markSceneReady: () => set({ sceneReady: true }),
}));
