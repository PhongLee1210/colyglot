"use client";

import { BUSH_SWAY, TREE_SWAY } from "@/lib/game/3d/animation";
import type { SceneLayout } from "@/lib/game/3d/scene-layout";

import { PropGroup, useFarmPropMeshes } from "./gltf-props";

// Trees and bushes tilt slowly around their base pivots; rocks stay put
// and ground flora is too small for the motion to read, so they render
// statically to keep the per-frame matrix budget tiny.
export function Trees3D({ layout }: { layout: SceneLayout }) {
  const meshes = useFarmPropMeshes();
  return (
    <group>
      <PropGroup placements={layout.trees} meshes={meshes} sway={TREE_SWAY} />
      <PropGroup placements={layout.bushes} meshes={meshes} sway={BUSH_SWAY} />
      <PropGroup placements={layout.rocks} meshes={meshes} />
      <PropGroup placements={layout.flowers} meshes={meshes} shadows={false} />
      <PropGroup
        placements={layout.groundFlora}
        meshes={meshes}
        shadows={false}
      />
    </group>
  );
}
