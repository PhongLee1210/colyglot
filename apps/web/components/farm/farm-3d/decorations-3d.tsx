"use client";

import { useLayoutEffect, useMemo, useRef } from "react";

import { InstancedMesh } from "three";

import type { FarmMaterials } from "@/lib/game/3d/material-factory";
import type { SceneLayout } from "@/lib/game/3d/scene-layout";

import { applyPlacements, PropGroup, useFarmPropMeshes } from "./gltf-props";

export function Decorations3D({
  layout,
  materials,
}: {
  layout: SceneLayout;
  materials: FarmMaterials;
}) {
  const meshes = useFarmPropMeshes();
  const pond = meshes.get("pond");
  const pondWater = meshes.get("pond_water");

  return (
    <group>
      <PropGroup placements={layout.campfire} meshes={meshes} />
      <PropGroup placements={layout.path} meshes={meshes} shadows={false} />
      <PondRim layout={layout} materials={materials} />
      {pond ? (
        <mesh
          geometry={pond.geometry}
          material={pond.material}
          position={layout.pond.position}
          scale={layout.pond.scale}
          receiveShadow
        />
      ) : null}
      {pondWater ? (
        <mesh
          geometry={pondWater.geometry}
          material={pondWater.material}
          position={[
            layout.pond.position[0],
            layout.pond.position[1] + 0.16,
            layout.pond.position[2],
          ]}
          scale={layout.pond.scale}
        />
      ) : null}
    </group>
  );
}

// Flat stones ringing the pond lip so it reads as set into the island
// instead of sitting on the grass.
function PondRim({
  layout,
  materials,
}: {
  layout: SceneLayout;
  materials: FarmMaterials;
}) {
  const ref = useRef<InstancedMesh>(null!);
  const stones = useFarmPropMeshes().get("stone_step");
  const pondRadius = 2.65 * layout.pond.scale * 0.62;

  const rimStones = useMemo(() => {
    const ring = [];
    for (let i = 0; i < 7; i++) {
      const angle = (i / 7) * Math.PI * 2 + 0.4;
      ring.push({
        kind: "stone_step",
        position: [
          layout.pond.position[0] + Math.cos(angle) * pondRadius,
          0.02,
          layout.pond.position[2] + Math.sin(angle) * pondRadius,
        ] as [number, number, number],
        rotationY: angle,
        scale: 1.15,
      });
    }
    return ring;
  }, [layout.pond.position, pondRadius]);

  useLayoutEffect(() => {
    if (ref.current && stones) {
      applyPlacements(ref.current, rimStones);
    }
  }, [rimStones, stones]);

  if (!stones) return null;
  return (
    <instancedMesh
      ref={ref}
      args={[stones.geometry, materials.stoneRim, rimStones.length]}
      receiveShadow
    />
  );
}
