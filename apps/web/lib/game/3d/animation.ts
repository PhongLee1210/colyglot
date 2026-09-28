import type { CropStage } from "@/lib/game/core/crops";

export type Easing = (p: number) => number;

export function clamp01(p: number): number {
  return p < 0 ? 0 : p > 1 ? 1 : p;
}

export const easeInCubic: Easing = (p) => p * p * p;

export const easeOutCubic: Easing = (p) => 1 - Math.pow(1 - p, 3);

export const easeOutQuad: Easing = (p) => 1 - (1 - p) * (1 - p);

// Milliseconds, matching the concept's game-feel calibration.
export const FX_DURATIONS = {
  plant: 420,
  harvest: 800,
  stageShift: 400,
  expansion: 300,
  coinFlight: 1150,
  coinStagger: 65,
} as const;

// Reduced motion collapses every transition to its terminal state, so a
// single `progress` call keeps useFrame branches and DOM hosts honest.
export function fxProgress(
  ageMs: number,
  durationMs: number,
  motionScale: number
): number {
  if (motionScale <= 0) return 1;
  return clamp01(ageMs / Math.max(durationMs, 1));
}

// Scale 0 → 1 with a back-out bulge peaking just over 1.2 mid-flight —
// the Lantern Picnic spawn overshoot, applied to growth from nothing.
export function popInScale(p: number): number {
  const c1 = 2.6;
  const c3 = c1 + 1;
  const q = clamp01(p) - 1;
  return 1 + c3 * q * q * q + c1 * q * q;
}

// Harvest ghost: swell to 1.5× over the first 70% (cubic easeIn), then
// collapse to nothing — the scale-out replaces a fade because instanced
// crops share one material and cannot fade per-instance.
export function harvestScale(p: number): number {
  const grow = easeInCubic(Math.min(p / 0.7, 1));
  const collapse = p <= 0.7 ? 0 : clamp01((p - 0.7) / 0.3);
  return (1 + 0.5 * grow) * (1 - easeInCubic(collapse));
}

export function harvestRise(p: number): number {
  return 1.8 * easeInCubic(Math.min(p / 0.7, 1));
}

export function harvestSpin(p: number): number {
  return easeInCubic(p) * Math.PI * 2.5;
}

// Stage morph: the old silhouette shrinks away over the first half while
// the new one grows in over the second — no frame shows both at full size.
export function morphOutScale(p: number): number {
  return 1 - easeInCubic(clamp01(p * 2));
}

export function morphInScale(p: number): number {
  return easeOutCubic(clamp01((p - 0.5) * 2));
}

// Ready crops breathe instead of glowing — per-instance emissive is not
// possible on a shared instanced material, but a scale breath reads at
// farm-camera distance.
export function readyBreath(time: number, phase: number): number {
  return 1 + 0.04 * Math.sin(time * 2.4 + phase);
}

export type SwayConfig = { amplitude: number; speed: number };

export const CROP_SWAY: Record<CropStage, SwayConfig> = {
  fresh: { amplitude: 0.02, speed: 1.1 },
  growing: { amplitude: 0.045, speed: 0.9 },
  ready: { amplitude: 0.06, speed: 0.65 },
  urgent: { amplitude: 0.012, speed: 1.4 },
};

export const TREE_SWAY: SwayConfig = { amplitude: 0.022, speed: 0.55 };
export const BUSH_SWAY: SwayConfig = { amplitude: 0.015, speed: 0.7 };

export function swayX(time: number, phase: number, config: SwayConfig): number {
  return Math.sin(time * config.speed + phase) * config.amplitude;
}

export function swayZ(time: number, phase: number, config: SwayConfig): number {
  return Math.cos(time * config.speed * 0.83 + phase) * config.amplitude * 0.6;
}
