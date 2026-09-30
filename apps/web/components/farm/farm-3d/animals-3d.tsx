"use client";

import { useMemo, useRef } from "react";

import { useFrame } from "@react-three/fiber";
import type { Group, Mesh } from "three";

import { plotCenter, type FarmExtents } from "@/lib/game/3d/positioning";
import { catTarget, chickenTarget } from "@/lib/game/core/animals";
import type { BedView } from "@/lib/game/types";

import { PLOT_TILE_TOP_Y } from "./plots-3d";

// Shop animals (GAME_PLAY §6.3): primitives, not GLBs — the chicken and
// the cat are small stylized shapes so they never fight the farm for
// attention. Each does its one job: chicken beside the next-ripe crop,
// cat by the most-forgotten bed.
export function Animals3D({
  beds,
  farm,
  items,
}: {
  beds: BedView[];
  farm: FarmExtents;
  items: readonly string[];
}) {
  const hasChicken = items.includes("chicken");
  const hasCat = items.includes("cat");

  const chicken = useMemo(
    () => (hasChicken ? positionFor(beds, farm, chickenTarget(beds)) : null),
    [beds, farm, hasChicken]
  );
  const cat = useMemo(() => {
    if (!hasCat) return null;
    const bedId = catTarget(beds);
    if (!bedId) return null;
    const bedIndex = beds.findIndex((bed) => bed.id === bedId);
    const layout = farm.beds[bedIndex];
    if (!layout) return null;
    // Sleeps beside the bed's sign, just off the plots.
    return {
      position: [
        layout.center[0] - layout.size[0] / 2 - 0.9,
        0,
        layout.center[1],
      ] as [number, number, number],
    };
  }, [beds, farm, hasCat]);

  return (
    <group>
      {chicken ? <Chicken position={chicken.position} /> : null}
      {chicken ? <NextRipeRing position={chicken.position} /> : null}
      {cat ? <Cat position={cat.position} /> : null}
    </group>
  );
}

function positionFor(
  beds: BedView[],
  farm: FarmExtents,
  target: { bedId: string; slotIndex: number } | null
): { position: [number, number, number] } | null {
  if (!target) return null;
  const bedIndex = beds.findIndex((bed) => bed.id === target.bedId);
  const layout = farm.beds[bedIndex];
  if (!layout) return null;
  const [x, z] = plotCenter(layout, target.slotIndex);
  // Perched beside the plot, not on the crop.
  return { position: [x + 0.95, PLOT_TILE_TOP_Y, z + 0.6] };
}

function Chicken({ position }: { position: [number, number, number] }) {
  const ref = useRef<Group>(null!);
  // Contented pecking: a small bob plus the occasional head dip.
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.position.y = position[1] + Math.abs(Math.sin(t * 3.1)) * 0.08;
    ref.current.rotation.y = Math.sin(t * 0.6) * 0.5;
  });
  return (
    <group ref={ref} position={position}>
      <mesh position={[0, 0.22, 0]} castShadow>
        <sphereGeometry args={[0.3, 12, 10]} />
        <meshStandardMaterial color="#f4f1e8" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.52, 0.12]} castShadow>
        <sphereGeometry args={[0.16, 10, 8]} />
        <meshStandardMaterial color="#f4f1e8" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.58, 0.26]}>
        <coneGeometry args={[0.05, 0.14, 6]} />
        <meshStandardMaterial color="#e8a13c" />
      </mesh>
      <mesh position={[0, 0.68, 0.12]}>
        <boxGeometry args={[0.05, 0.1, 0.12]} />
        <meshStandardMaterial color="#d94f3d" />
      </mesh>
    </group>
  );
}

// A soft pulsing ring under the crop the chicken picked out — readable
// even before the player notices the bird itself.
function NextRipeRing({ position }: { position: [number, number, number] }) {
  const ref = useRef<Mesh>(null!);
  useFrame((state) => {
    if (!ref.current) return;
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 2.4) * 0.08;
    ref.current.scale.setScalar(pulse);
  });
  return (
    <mesh
      ref={ref}
      position={[position[0] - 0.95, position[1] + 0.06, position[2] - 0.6]}
      rotation-x={-Math.PI / 2}
    >
      <ringGeometry args={[0.85, 1.05, 32]} />
      <meshStandardMaterial
        color="#e8b64c"
        emissive="#e8b64c"
        emissiveIntensity={0.5}
        transparent
        opacity={0.85}
      />
    </mesh>
  );
}

function Cat({ position }: { position: [number, number, number] }) {
  const ref = useRef<Group>(null!);
  // Sleeping breath: slow, gentle scale.
  useFrame((state) => {
    if (!ref.current) return;
    const breath = 1 + Math.sin(state.clock.elapsedTime * 1.1) * 0.03;
    ref.current.scale.set(breath, breath * 0.6 + 0.4, breath);
  });
  return (
    <group ref={ref} position={position}>
      <mesh position={[0, 0.16, 0]} castShadow>
        <sphereGeometry args={[0.28, 12, 10]} />
        <meshStandardMaterial color="#8d8d94" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.34, 0.14]}>
        <sphereGeometry args={[0.16, 10, 8]} />
        <meshStandardMaterial color="#8d8d94" roughness={0.95} />
      </mesh>
      {[-0.07, 0.07].map((x) => (
        <mesh key={x} position={[x, 0.46, 0.12]}>
          <coneGeometry args={[0.05, 0.1, 4]} />
          <meshStandardMaterial color="#77777e" />
        </mesh>
      ))}
      <mesh position={[0, 0.16, -0.26]} rotation-x={0.7}>
        <cylinderGeometry args={[0.04, 0.04, 0.4, 6]} />
        <meshStandardMaterial color="#77777e" />
      </mesh>
    </group>
  );
}
