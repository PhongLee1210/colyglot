"use client";

import { useMemo } from "react";

import { Html } from "@react-three/drei";
import { BoxGeometry } from "three";

import type { FarmMaterials } from "@/lib/game/3d/material-factory";
import type { BedLayout, FarmExtents } from "@/lib/game/3d/positioning";
import type { BedView } from "@/lib/game/types";

const POST_SIZE = [0.14, 1.15, 0.14] as const;
const BOARD_SIZE = [1.35, 0.5, 0.1] as const;

export function FarmBeds3D({
  beds,
  farm,
  materials,
}: {
  beds: BedView[];
  farm: FarmExtents;
  materials: FarmMaterials;
}) {
  const postGeometry = useMemo(() => new BoxGeometry(...POST_SIZE), []);
  const boardGeometry = useMemo(() => new BoxGeometry(...BOARD_SIZE), []);

  return (
    <group>
      {beds.map((bed, index) => (
        <BedPlatform
          key={bed.id}
          bed={bed}
          layout={farm.beds[index]}
          materials={materials}
          postGeometry={postGeometry}
          boardGeometry={boardGeometry}
        />
      ))}
    </group>
  );
}

function BedPlatform({
  bed,
  layout,
  materials,
  postGeometry,
  boardGeometry,
}: {
  bed: BedView;
  layout: BedLayout;
  materials: FarmMaterials;
  postGeometry: BoxGeometry;
  boardGeometry: BoxGeometry;
}) {
  const signPosition: [number, number, number] = [
    layout.origin[0] + 0.1,
    0,
    layout.origin[1] + layout.size[1] + 0.55,
  ];

  return (
    <group>
      <mesh
        position={[layout.center[0], 0.275, layout.center[1]]}
        material={materials.soilDark}
        receiveShadow
        castShadow
      >
        <boxGeometry args={[layout.size[0], 0.55, layout.size[1]]} />
      </mesh>
      <group position={signPosition}>
        <mesh
          geometry={postGeometry}
          material={materials.wood}
          position={[0, POST_SIZE[1] / 2, 0]}
          castShadow
        />
        <mesh
          geometry={boardGeometry}
          material={materials.woodDark}
          position={[0.62, 1.02, 0]}
          rotation-y={-0.08}
          castShadow
        />
        <Html
          position={[0.62, 1.02, 0.06]}
          center
          zIndexRange={[15, 0]}
          style={{ pointerEvents: "none" }}
        >
          <span className="whitespace-nowrap rounded-full bg-[#5d3a1e]/85 px-2 py-0.5 text-[11px] font-extrabold text-[#fdf3e3] shadow">
            {bed.name}
          </span>
        </Html>
      </group>
    </group>
  );
}
