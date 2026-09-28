import {
  islandRadius,
  type FarmExtents,
  type Vec2,
} from "@/lib/game/3d/positioning";

export type TreeKind = "tree_oak" | "tree_pine" | "tree_birch" | "tree_blossom";
export type BushKind = "bush" | "bush_berry" | "bush_flower";
export type RockKind = "rock_0" | "rock_1" | "rock_2";
export type FlowerKind =
  "flower_daisy" | "flower_bell" | "flower_tulip" | "flower_sun";
export type GroundFloraKind = "tuft" | "fern" | "mushrooms";

export type PropPlacement = {
  kind: string;
  position: [number, number, number];
  rotationY: number;
  scale: number;
};

export type SceneLayout = {
  islandRadius: number;
  trees: PropPlacement[];
  bushes: PropPlacement[];
  rocks: PropPlacement[];
  flowers: PropPlacement[];
  groundFlora: PropPlacement[];
  pond: { position: [number, number, number]; scale: number };
  campfire: PropPlacement[];
  path: PropPlacement[];
};

const TREE_KINDS: TreeKind[] = [
  "tree_oak",
  "tree_pine",
  "tree_birch",
  "tree_blossom",
];
const BUSH_KINDS: BushKind[] = ["bush", "bush_berry", "bush_flower"];
const ROCK_KINDS: RockKind[] = ["rock_0", "rock_1", "rock_2"];
const FLOWER_KINDS: FlowerKind[] = [
  "flower_daisy",
  "flower_bell",
  "flower_tulip",
  "flower_sun",
];
const GROUND_KINDS: GroundFloraKind[] = ["tuft", "tuft", "fern", "mushrooms"];

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rng = () => number;

function insideRect(
  x: number,
  z: number,
  rect: { minX: number; maxX: number; minZ: number; maxZ: number }
): boolean {
  return x >= rect.minX && x <= rect.maxX && z >= rect.minZ && z <= rect.maxZ;
}

// The farm's front faces +Z; the welcome path enters along that axis, so
// decor avoids both the farm rectangle and a corridor leading to it.
function farmKeepOut(farm: FarmExtents, corridorWidth: number) {
  const margin = 2.2;
  const frontZ = farm.center[1] + farm.depth / 2;
  return {
    rect: {
      minX: farm.center[0] - farm.width / 2 - margin,
      maxX: farm.center[0] + farm.width / 2 + margin,
      minZ: farm.center[1] - farm.depth / 2 - margin,
      maxZ: frontZ + corridorWidth + 4,
    },
  };
}

function ringPoint(rng: Rng, radius: number): Vec2 {
  const angle = rng() * Math.PI * 2;
  const r = radius * (0.82 + rng() * 0.18);
  return [Math.cos(angle) * r, Math.sin(angle) * r];
}

function scatter(
  rng: Rng,
  count: number,
  radiusInner: number,
  radiusOuter: number,
  forbidden: (x: number, z: number) => boolean
): { x: number; z: number; rotationY: number; scale: number }[] {
  const placed: { x: number; z: number; rotationY: number; scale: number }[] =
    [];
  let attempts = 0;
  while (placed.length < count && attempts < count * 12) {
    attempts++;
    const [x, z] = ringPoint(rng, radiusOuter);
    const r = Math.hypot(x, z);
    if (r < radiusInner) continue;
    if (forbidden(x, z)) continue;
    if (placed.some((p) => Math.hypot(p.x - x, p.z - z) < 1.6)) continue;
    placed.push({
      x,
      z,
      rotationY: rng() * Math.PI * 2,
      scale: 0.85 + rng() * 0.4,
    });
  }
  return placed;
}

export function sceneLayout(worldId: string, farm: FarmExtents): SceneLayout {
  const rng = mulberry32(hashSeed(worldId));
  const radius = islandRadius(farm);
  const keepOut = farmKeepOut(farm, radius * 0.42);
  const forbidden = (x: number, z: number) => insideRect(x, z, keepOut.rect);

  const treeSpots = scatter(rng, 13, radius * 0.66, radius * 0.94, forbidden);
  const trees: PropPlacement[] = treeSpots.map((spot, i) => ({
    kind: TREE_KINDS[i % TREE_KINDS.length],
    position: [spot.x, 0, spot.z],
    rotationY: spot.rotationY,
    scale: spot.scale * 1.15,
  }));

  const bushSpots = scatter(rng, 9, radius * 0.5, radius * 0.85, forbidden);
  const bushes: PropPlacement[] = bushSpots.map((spot, i) => ({
    kind: BUSH_KINDS[i % BUSH_KINDS.length],
    position: [spot.x, 0, spot.z],
    rotationY: spot.rotationY,
    scale: spot.scale,
  }));

  const rockSpots = scatter(rng, 6, radius * 0.45, radius * 0.9, forbidden);
  const rocks: PropPlacement[] = rockSpots.map((spot, i) => ({
    kind: ROCK_KINDS[i % ROCK_KINDS.length],
    position: [spot.x, 0, spot.z],
    rotationY: spot.rotationY,
    scale: 0.8 + (spot.scale - 0.85) * 1.6,
  }));

  const flowerSpots = scatter(rng, 14, radius * 0.4, radius * 0.88, forbidden);
  const flowers: PropPlacement[] = flowerSpots.map((spot, i) => ({
    kind: FLOWER_KINDS[i % FLOWER_KINDS.length],
    position: [spot.x, 0, spot.z],
    rotationY: spot.rotationY,
    scale: spot.scale * 1.3,
  }));

  const floraSpots = scatter(rng, 18, radius * 0.35, radius * 0.92, forbidden);
  const groundFlora: PropPlacement[] = floraSpots.map((spot, i) => ({
    kind: GROUND_KINDS[i % GROUND_KINDS.length],
    position: [spot.x, 0, spot.z],
    rotationY: spot.rotationY,
    scale: spot.scale * 1.25,
  }));

  const pondAngle = rng() * Math.PI * 2;
  const pondR = radius * 0.62;
  const pondX = Math.cos(pondAngle) * pondR;
  const pondZ = Math.sin(pondAngle) * pondR;

  const fireX = farm.center[0] + farm.width / 2 + 3.4;
  const fireZ = farm.center[1] - farm.depth / 2 - 1.2;
  const campfire: PropPlacement[] = [
    {
      kind: "campfire",
      position: [fireX, 0, fireZ],
      rotationY: rng() * Math.PI,
      scale: 1.5,
    },
    {
      kind: "log_seat",
      position: [fireX - 1.7, 0, fireZ + 0.9],
      rotationY: 0.7,
      scale: 1.2,
    },
    {
      kind: "log_seat",
      position: [fireX + 1.6, 0, fireZ + 1.1],
      rotationY: -0.9,
      scale: 1.2,
    },
    {
      kind: "stump",
      position: [fireX + 0.2, 0, fireZ - 1.9],
      rotationY: 0.4,
      scale: 1.3,
    },
  ];

  const pathStartZ = farm.center[1] + farm.depth / 2 + 1.6;
  const pathEndZ = Math.min(radius * 0.94, pathStartZ + 7.5);
  const pathSteps = Math.max(3, Math.round((pathEndZ - pathStartZ) / 1.35));
  const path: PropPlacement[] = Array.from({ length: pathSteps }, (_, i) => {
    const t = pathSteps === 1 ? 0 : i / (pathSteps - 1);
    const wobble = (rng() - 0.5) * 1.1;
    return {
      kind: "stone_step",
      position: [
        farm.center[0] + wobble,
        0.01,
        pathStartZ + t * (pathEndZ - pathStartZ),
      ],
      rotationY: rng() * Math.PI,
      scale: 1.6,
    };
  });

  return {
    islandRadius: radius,
    trees,
    bushes,
    rocks,
    flowers,
    groundFlora,
    pond: { position: [pondX, 0, pondZ], scale: 2.3 },
    campfire,
    path,
  };
}
