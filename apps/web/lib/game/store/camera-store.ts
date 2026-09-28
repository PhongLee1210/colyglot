import { create } from "zustand";

import { CAMERA_ZOOM_MAX, CAMERA_ZOOM_MIN } from "@/lib/game/3d/positioning";

type CameraStoreState = {
  pan: [x: number, z: number];
  zoom: number;
  panBy: (delta: [number, number]) => void;
  setPan: (pan: [number, number]) => void;
  zoomBy: (factor: number) => void;
  reset: () => void;
};

// Camera framing targets for the 3D farm viewport. Pan is stored raw and
// the writer (FarmCameraControls) clamps it against the farm bounds, so
// farm growth after an expand simply widens the allowed range.
export const useCameraStore = create<CameraStoreState>((set) => ({
  pan: [0, 0],
  zoom: 1,
  panBy: (delta) =>
    set((state) => ({
      pan: [state.pan[0] + delta[0], state.pan[1] + delta[1]],
    })),
  setPan: (pan) => set({ pan }),
  zoomBy: (factor) =>
    set((state) => ({
      zoom: Math.min(
        CAMERA_ZOOM_MAX,
        Math.max(CAMERA_ZOOM_MIN, state.zoom * factor)
      ),
    })),
  reset: () => set({ pan: [0, 0], zoom: 1 }),
}));
