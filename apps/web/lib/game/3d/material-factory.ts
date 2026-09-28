import { MeshStandardMaterial } from "three";

import { shade } from "@/lib/game/art/palette";
import type { FarmTheme } from "@/lib/game/content/types";

export type FarmMaterials = {
  grass: MeshStandardMaterial;
  skirt: MeshStandardMaterial;
  soil: MeshStandardMaterial;
  soilEdge: MeshStandardMaterial;
  soilDark: MeshStandardMaterial;
  soilTile: MeshStandardMaterial;
  crop: MeshStandardMaterial;
  wood: MeshStandardMaterial;
  woodDark: MeshStandardMaterial;
  stoneRim: MeshStandardMaterial;
  water: MeshStandardMaterial;
};

const MATERIALS_CACHE = new Map<string, FarmMaterials>();

function standard(color: string, roughness = 0.92): MeshStandardMaterial {
  return new MeshStandardMaterial({ color, roughness });
}

export function createFarmMaterials(theme: FarmTheme): FarmMaterials {
  const key = JSON.stringify(theme);
  const cached = MATERIALS_CACHE.get(key);
  if (cached) return cached;

  const materials: FarmMaterials = {
    grass: standard(theme.ground[0]),
    skirt: standard(shade(theme.ground[1], -0.3)),
    soil: standard(theme.plot),
    soilEdge: standard(theme.plotBorder),
    soilDark: standard(shade(theme.plot, -0.22)),
    soilTile: new MeshStandardMaterial({ color: "#ffffff", roughness: 0.92 }),
    crop: new MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      flatShading: true,
    }),
    wood: standard("#8a6642"),
    woodDark: standard("#6b4c30"),
    stoneRim: standard("#9aa0a6", 0.98),
    water: new MeshStandardMaterial({
      color: "#7ec8e3",
      roughness: 0.35,
      metalness: 0.05,
    }),
  };
  MATERIALS_CACHE.set(key, materials);
  return materials;
}
