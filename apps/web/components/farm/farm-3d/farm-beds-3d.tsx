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
  items,
}: {
  beds: BedView[];
  farm: FarmExtents;
  materials: FarmMaterials;
  /** Owned shop/memento item keys — a region's mastery plaque is one. */
  items: readonly string[];
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
          plaqueOwned={items.includes(`plaque_${bed.regionKey}`)}
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
  plaqueOwned,
}: {
  bed: BedView;
  layout: BedLayout;
  materials: FarmMaterials;
  postGeometry: BoxGeometry;
  boardGeometry: BoxGeometry;
  plaqueOwned: boolean;
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
        {plaqueOwned ? <MasteryPlaque materials={materials} /> : null}
      </group>
    </group>
  );
}

// The region's mastery stone (GAME_PLAY §7): a small stele with a gold
// star, set beside the bed sign — earned once, never taken away.
function MasteryPlaque({ materials }: { materials: FarmMaterials }) {
  return (
    <group position={[1.55, 0, 0.12]} rotation-y={-0.08}>
      <mesh
        position={[0, 0.06, 0]}
        material={materials.stoneRim}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[0.72, 0.12, 0.4]} />
      </mesh>
      <mesh position={[0, 0.56, 0]} material={materials.stoneRim} castShadow>
        <boxGeometry args={[0.52, 1.0, 0.16]} />
      </mesh>
      <mesh position={[0, 0.58, 0.1]}>
        <boxGeometry args={[0.3, 0.3, 0.04]} />
        <meshStandardMaterial
          color="#e8b64c"
          emissive="#c98f1d"
          emissiveIntensity={0.55}
        />
      </mesh>
      <mesh position={[0, 1.22, 0]}>
        <octahedronGeometry args={[0.14]} />
        <meshStandardMaterial
          color="#e8b64c"
          emissive="#c98f1d"
          emissiveIntensity={0.6}
        />
      </mesh>
    </group>
  );
}
