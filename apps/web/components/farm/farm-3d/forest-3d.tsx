"use client";

import { useEffect, useMemo, useRef } from "react";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Euler, InstancedMesh, Matrix4, Quaternion, Vector3 } from "three";

import {
  fxProgress,
  popInScale,
  swayX,
  swayZ,
  TREE_SWAY,
} from "@/lib/game/3d/animation";
import type { SceneLayout } from "@/lib/game/3d/scene-layout";
import { useFxStore } from "@/lib/game/store/fx-store";
import type { ForestTreeView } from "@/lib/game/types";

import { useFarmPropMeshes } from "./gltf-props";

// The Forest is the game's trophy shelf (GAME_PLAY §5.1): one big tree per
// graduated word ringing the island's rim, planted in review order so the
// ring grows as memory compounds. Fully derived from the snapshot — no
// forest state exists anywhere else.
const FOREST_KINDS = ["tree_oak", "tree_pine", "tree_birch", "tree_blossom"];
const FOREST_RING_RATIO = 0.9;
const FOREST_MIN_SCALE = 1.5;
const FOREST_SCALE_PER_INTERVAL = 0.02;
const FOREST_POP_MS = 600;
// in-canvas hanzi tags are capped so a 200-word forest stays renderable;
// the strongest memories (longest intervals, listed first) get the tags.
const FOREST_TAG_LIMIT = 24;

const _matrix = new Matrix4();
const _euler = new Euler();
const _quaternion = new Quaternion();
const _position = new Vector3();
const _scale = new Vector3();

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function Forest3D({
  forest,
  layout,
}: {
  forest: ForestTreeView[];
  layout: SceneLayout;
}) {
  const meshes = useFarmPropMeshes();
  const kindRefs = useRef<Map<string, InstancedMesh>>(new Map());
  // A tree joining the ring pops in from the ground, like every other
  // arrival on the farm; a world switch reseeds instead of replaying.
  const knownRef = useRef<Set<string> | null>(null);
  const popsRef = useRef<Map<string, number>>(new Map());

  const placements = useMemo(() => {
    const count = forest.length;
    return forest.map((tree, index) => {
      const seed = hashSeed(tree.cardId);
      // Even spacing in review order with a seeded jitter, so the rim
      // reads as grown rather than planted on a lattice.
      const angle =
        (index / Math.max(count, 1)) * Math.PI * 2 + (seed % 13) * 0.011;
      const radius =
        layout.islandRadius * (FOREST_RING_RATIO + (seed % 7) * 0.008);
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      return {
        key: tree.cardId,
        hanzi: tree.hanzi,
        position: [x, 0, z] as [number, number, number],
        rotationY: ((seed % 360) * Math.PI) / 180,
        scale: Math.min(
          FOREST_MIN_SCALE + tree.intervalDays * FOREST_SCALE_PER_INTERVAL,
          2.6
        ),
        kind: FOREST_KINDS[seed % FOREST_KINDS.length],
        phase: x * 0.37 + z * 0.23,
      };
    });
  }, [forest, layout.islandRadius]);

  const byKind = useMemo(() => {
    const groups = new Map<string, typeof placements>();
    placements.forEach((placement) => {
      const group = groups.get(placement.kind);
      if (group) group.push(placement);
      else groups.set(placement.kind, [placement]);
    });
    return groups;
  }, [placements]);

  useEffect(() => {
    const known = knownRef.current;
    const keys = new Set(placements.map((placement) => placement.key));
    if (known) {
      const wallClock = performance.now();
      placements.forEach((placement) => {
        if (!known.has(placement.key)) {
          popsRef.current.set(placement.key, wallClock);
        }
      });
    }
    knownRef.current = keys;
  }, [placements]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    const wallClock = performance.now();
    const motionScale = useFxStore.getState().motionScale;
    byKind.forEach((items, kind) => {
      const mesh = kindRefs.current.get(kind);
      if (!mesh) return;
      items.forEach((placement, i) => {
        let scale = placement.scale;
        const poppedAt = popsRef.current.get(placement.key);
        if (poppedAt !== undefined) {
          const p = fxProgress(
            wallClock - poppedAt,
            FOREST_POP_MS,
            motionScale
          );
          scale *= popInScale(p);
          if (p >= 1) popsRef.current.delete(placement.key);
        }
        _euler.set(
          swayX(time, placement.phase, TREE_SWAY),
          placement.rotationY,
          swayZ(time, placement.phase, TREE_SWAY)
        );
        _quaternion.setFromEuler(_euler);
        _position.set(...placement.position);
        _scale.setScalar(scale);
        _matrix.compose(_position, _quaternion, _scale);
        mesh.setMatrixAt(i, _matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    });
  });

  if (placements.length === 0) return null;

  return (
    <group>
      {[...byKind.entries()].map(([kind, items]) => {
        const source = meshes.get(kind);
        if (!source) return null;
        return (
          <instancedMesh
            key={kind}
            ref={(mesh) => {
              if (mesh) kindRefs.current.set(kind, mesh);
              else kindRefs.current.delete(kind);
            }}
            args={[source.geometry, source.material, items.length]}
            castShadow
            receiveShadow
          />
        );
      })}
      {placements.slice(0, FOREST_TAG_LIMIT).map((placement) => (
        <Html
          key={placement.key}
          position={[placement.position[0], 2.7, placement.position[2]]}
          center
          zIndexRange={[11, 0]}
          style={{ pointerEvents: "none" }}
        >
          <span className="whitespace-nowrap rounded-full bg-amber-100/90 px-1.5 text-xs font-bold leading-tight text-amber-900 shadow dark:bg-amber-950/70 dark:text-amber-100 font-hanzi">
            {placement.hanzi}
          </span>
        </Html>
      ))}
    </group>
  );
}
