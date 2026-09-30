"use client";

import { useLayoutEffect, useMemo, useRef } from "react";

import { InstancedMesh } from "three";

import type { FarmMaterials } from "@/lib/game/3d/material-factory";
import type { SceneLayout } from "@/lib/game/3d/scene-layout";

import { applyPlacements, PropGroup, useFarmPropMeshes } from "./gltf-props";

export function Decorations3D({
  layout,
  materials,
  items,
}: {
  layout: SceneLayout;
  materials: FarmMaterials;
  /** Owned shop/memento items — the streak wreath hangs at the gate. */
  items?: readonly { itemKey: string }[];
}) {
  const meshes = useFarmPropMeshes();
  const pond = meshes.get("pond");
  const pondWater = meshes.get("pond_water");
  const hasWreath = items?.some((item) => item.itemKey === "streak_wreath");

  return (
    <group>
      <PropGroup placements={layout.campfire} meshes={meshes} />
      <PropGroup placements={layout.path} meshes={meshes} shadows={false} />
      <PondRim layout={layout} materials={materials} />
      {hasWreath ? (
        <StreakWreath layout={layout} materials={materials} />
      ) : null}
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

// The 7-day streak wreath (GAME_PLAY §6.4): a garland banner raised over
// the start of the garden path — the farm's first earned memento.
function StreakWreath({
  layout,
  materials,
}: {
  layout: SceneLayout;
  materials: FarmMaterials;
}) {
  const first = layout.path[0]?.position ?? [0, 0, 8];
  const last = layout.path[layout.path.length - 1]?.position ?? [2, 0, 8];
  const mid: [number, number, number] = [
    (first[0] + last[0]) / 2,
    0,
    (first[2] + last[2]) / 2 + 1.4,
  ];
  return (
    <group position={mid}>
      <mesh position={[-1.1, 1.3, 0]} material={materials.woodDark} castShadow>
        <boxGeometry args={[0.14, 2.6, 0.14]} />
      </mesh>
      <mesh position={[1.1, 1.3, 0]} material={materials.woodDark} castShadow>
        <boxGeometry args={[0.14, 2.6, 0.14]} />
      </mesh>
      <mesh position={[0, 2.35, 0]} castShadow>
        <boxGeometry args={[2.5, 0.55, 0.08]} />
        <meshStandardMaterial
          color="#3f8f4f"
          emissive="#1f5c2c"
          emissiveIntensity={0.35}
        />
      </mesh>
      {[-0.8, 0, 0.8].map((x) => (
        <mesh key={x} position={[x, 2.35, 0.06]}>
          <boxGeometry args={[0.28, 0.28, 0.02]} />
          <meshStandardMaterial
            color="#e8b64c"
            emissive="#c98f1d"
            emissiveIntensity={0.5}
          />
        </mesh>
      ))}
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
