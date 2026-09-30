import type { FarmExtents } from "@/lib/game/3d/positioning";

// Pure geometry for purchased shop items (GAME_PLAY §6.3): every shape is
// derived from the farm extents so it re-flows when beds expand.

export type HouseSpec = {
  bodyWidth: number;
  bodyHeight: number;
  bodyDepth: number;
  /** Gable roof pitch (rotation) — 0 keeps the lean-to shed look. */
  roofPitch: number;
  chimney: boolean;
  /** Side wings flanking the body (villa = 2). */
  wings: number;
};

// Tier 0 is the starter shed; 1–3 are the paid ladder. Each tier is
// strictly bigger so a paid house reads at a glance.
export function houseSpecFor(tier: number): HouseSpec {
  const clamped = Math.min(Math.max(Math.round(tier), 0), 3);
  return {
    bodyWidth: 3 + clamped * 0.7,
    bodyHeight: 2.2 + clamped * 0.55,
    bodyDepth: 2.5 + clamped * 0.3,
    roofPitch: clamped >= 1 ? 0.5 : 0.62,
    chimney: clamped >= 2,
    wings: clamped >= 3 ? 2 : 0,
  };
}

export type LampPlacement = { position: [number, number, number] };

// Three lamp posts along the front fence line, flanking the gate gap.
export function lampPlacements(farm: FarmExtents): LampPlacement[] {
  const frontZ = farm.center[1] + farm.depth / 2 + 2.4;
  const halfWidth = farm.width / 2 + 1.6;
  return [-halfWidth, -1.6, halfWidth].map((x) => ({
    position: [farm.center[0] + x, 0, frontZ] as [number, number, number],
  }));
}
