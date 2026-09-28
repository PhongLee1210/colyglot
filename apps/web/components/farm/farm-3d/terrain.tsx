"use client";

import type { FarmMaterials } from "@/lib/game/3d/material-factory";

export function Terrain3D({
  radius,
  materials,
}: {
  radius: number;
  materials: FarmMaterials;
}) {
  return (
    <group>
      <mesh position={[0, -0.3, 0]} receiveShadow material={materials.grass}>
        <cylinderGeometry args={[radius, radius, 0.6, 56, 1]} />
      </mesh>
      <mesh position={[0, -1.35, 0]} material={materials.skirt}>
        <cylinderGeometry args={[radius * 0.985, radius * 0.4, 1.5, 56, 1]} />
      </mesh>
      <mesh
        position={[0, -2.35, 0]}
        rotation-x={Math.PI}
        material={materials.skirt}
      >
        <coneGeometry args={[radius * 0.4, 1.4, 56, 1]} />
      </mesh>
    </group>
  );
}
