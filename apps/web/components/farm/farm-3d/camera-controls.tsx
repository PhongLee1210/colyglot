"use client";

import { useEffect, useRef } from "react";

import { useThree } from "@react-three/fiber";

import {
  CAMERA_AZIMUTH_DEG,
  cameraViewHeight,
  clampPan,
  panFromScreenDelta,
  type FarmExtents,
} from "@/lib/game/3d/positioning";
import { useCameraStore } from "@/lib/game/store/camera-store";

export const TAP_MAX_DRAG_PX = 6;
export const TAP_MAX_MS = 500;

const MAX_ZOOM_STEP = 1.25;
const WHEEL_SENSITIVITY = 0.0022;

// Canvas input → camera-store targets: one-finger/mouse drag pans 1:1
// with the finger (map-style), wheel and pinch zoom multiplicatively
// with a per-event cap so discrete mouse wheels don't lurch. Pan is
// clamped against the farm bounds on every write; touch-action is
// already none on the canvas element itself.
export function FarmCameraControls({ farm }: { farm: FarmExtents }) {
  const gl = useThree((state) => state.gl);
  const size = useThree((state) => state.size);
  const zoomBy = useCameraStore((state) => state.zoomBy);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchDistance = useRef<number | null>(null);

  useEffect(() => {
    const canvas = gl.domElement;
    const aspect = size.width / Math.max(size.height, 1);

    function applyPan(deltaX: number, deltaY: number) {
      const zoom = useCameraStore.getState().zoom;
      const viewHeight = cameraViewHeight(size.width, size.height, farm) / zoom;
      const delta = panFromScreenDelta(deltaX, deltaY, {
        viewHeight,
        canvasHeight: size.height,
        azimuthDeg: CAMERA_AZIMUTH_DEG,
      });
      const { pan } = useCameraStore.getState();
      useCameraStore
        .getState()
        .setPan(
          clampPan(
            [pan[0] + delta[0], pan[1] + delta[1]],
            farm,
            viewHeight,
            aspect
          )
        );
    }

    function pinchFactor(distance: number): number {
      if (pinchDistance.current === null) return 1;
      const factor = distance / pinchDistance.current;
      return Math.min(MAX_ZOOM_STEP, Math.max(1 / MAX_ZOOM_STEP, factor));
    }

    function onPointerDown(event: PointerEvent) {
      canvas.setPointerCapture?.(event.pointerId);
      pointers.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });
      if (pointers.current.size === 2) {
        const [a, b] = [...pointers.current.values()];
        pinchDistance.current = Math.hypot(a.x - b.x, a.y - b.y);
      }
    }

    function onPointerMove(event: PointerEvent) {
      const previous = pointers.current.get(event.pointerId);
      if (!previous) return;
      const current = { x: event.clientX, y: event.clientY };
      pointers.current.set(event.pointerId, current);

      if (pointers.current.size >= 2) {
        const [a, b] = [...pointers.current.values()];
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        const factor = pinchFactor(distance);
        if (factor !== 1) {
          zoomBy(factor);
          pinchDistance.current = distance;
        }
        return;
      }
      applyPan(current.x - previous.x, current.y - previous.y);
    }

    function onPointerUp(event: PointerEvent) {
      pointers.current.delete(event.pointerId);
      if (pointers.current.size < 2) pinchDistance.current = null;
    }

    function onWheel(event: WheelEvent) {
      event.preventDefault();
      const exponent = Math.max(
        -Math.log(MAX_ZOOM_STEP),
        Math.min(Math.log(MAX_ZOOM_STEP), -event.deltaY * WHEEL_SENSITIVITY)
      );
      zoomBy(Math.exp(exponent));
    }

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);
    };
  }, [gl, size.width, size.height, farm, zoomBy]);

  return null;
}
