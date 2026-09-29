"use client";

import { useLayoutEffect, useMemo, useRef } from "react";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
  Euler,
  InstancedMesh,
  Matrix4,
  Mesh,
  Quaternion,
  Vector3,
  type Material,
  type Object3D,
} from "three";

import { swayX, swayZ, type SwayConfig } from "@/lib/game/3d/animation";
import { FARM_MODEL_URLS } from "@/lib/game/3d/gltf-loader";
import type { PropPlacement } from "@/lib/game/3d/scene-layout";

// useGLTF's scene is shared across mounts, so flat shading is baked into
// cached per-source clones instead of mutating the GLB's own materials.
const FLAT_PROPS = new WeakMap<Mesh, Mesh>();

function flatShadedMaterial(material: Mesh["material"]): Mesh["material"] {
  const flatten = (single: Material): Material => {
    const clone = single.clone();
    if ("flatShading" in clone) clone.flatShading = true;
    return clone;
  };
  return Array.isArray(material) ? material.map(flatten) : flatten(material);
}

function flatShadedProp(source: Mesh): Mesh {
  const cached = FLAT_PROPS.get(source);
  if (cached) return cached;
  const prop = source.clone();
  prop.material = flatShadedMaterial(source.material);
  FLAT_PROPS.set(source, prop);
  return prop;
}

export function useFarmPropMeshes(): Map<string, Mesh> {
  const { scene } = useGLTF(FARM_MODEL_URLS.world);
  return useMemo(() => {
    const byName = new Map<string, Mesh>();
    scene.traverse((child: Object3D) => {
      if ((child as Mesh).isMesh) {
        const mesh = child as Mesh;
        byName.set(
          mesh.name,
          mesh.name.includes("water") ? mesh : flatShadedProp(mesh)
        );
      }
    });
    return byName;
  }, [scene]);
}

const _matrix = new Matrix4();
const _position = new Vector3();
const _quaternion = new Quaternion();
const _scale = new Vector3();
const _euler = new Euler();

function placementPhase(placement: PropPlacement): number {
  // Anchored to the world grid so neighbors never sway in lockstep —
  // same trick the reference farm uses for its GPU wind.
  return placement.position[0] * 0.37 + placement.position[2] * 0.23;
}

export function applyPlacements(
  mesh: InstancedMesh,
  placements: PropPlacement[]
): void {
  placements.forEach((placement, i) => {
    _position.set(
      placement.position[0],
      placement.position[1],
      placement.position[2]
    );
    _quaternion.setFromAxisAngle(new Vector3(0, 1, 0), placement.rotationY);
    _scale.setScalar(placement.scale);
    _matrix.compose(_position, _quaternion, _scale);
    mesh.setMatrixAt(i, _matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
}

// Sway recomposes every matrix each frame — placements of trees/bushes
// number in the dozens, so the cost stays negligible, and the props' GLB
// pivots sit at their bases so the tilt reads as wind from the ground up.
function applySway(
  mesh: InstancedMesh,
  placements: PropPlacement[],
  time: number,
  config: SwayConfig
) {
  placements.forEach((placement, i) => {
    const phase = placementPhase(placement);
    _position.set(
      placement.position[0],
      placement.position[1],
      placement.position[2]
    );
    _euler.set(
      swayX(time, phase, config),
      placement.rotationY,
      swayZ(time, phase, config)
    );
    _quaternion.setFromEuler(_euler);
    _scale.setScalar(placement.scale);
    _matrix.compose(_position, _quaternion, _scale);
    mesh.setMatrixAt(i, _matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
}

export function PropInstances({
  placements,
  source,
  shadows = true,
  sway,
}: {
  placements: PropPlacement[];
  source?: Mesh;
  shadows?: boolean;
  sway?: SwayConfig;
}) {
  const ref = useRef<InstancedMesh>(null!);

  useLayoutEffect(() => {
    if (ref.current && placements.length > 0) {
      applyPlacements(ref.current, placements);
    }
  }, [placements]);

  useFrame((state) => {
    if (!ref.current || !sway || placements.length === 0) return;
    applySway(ref.current, placements, state.clock.elapsedTime, sway);
  });

  if (!source || placements.length === 0) return null;
  return (
    <instancedMesh
      ref={ref}
      args={[source.geometry, source.material, placements.length]}
      castShadow={shadows}
      receiveShadow={shadows}
    />
  );
}

export function PropGroup({
  placements,
  meshes,
  shadows = true,
  sway,
}: {
  placements: PropPlacement[];
  meshes: Map<string, Mesh>;
  shadows?: boolean;
  sway?: SwayConfig;
}) {
  const byKind = useMemo(() => {
    const groups = new Map<string, PropPlacement[]>();
    placements.forEach((placement) => {
      const group = groups.get(placement.kind);
      if (group) {
        group.push(placement);
      } else {
        groups.set(placement.kind, [placement]);
      }
    });
    return groups;
  }, [placements]);

  return (
    <>
      {[...byKind.entries()].map(([kind, items]) => (
        <PropInstances
          key={kind}
          placements={items}
          source={meshes.get(kind)}
          shadows={shadows}
          sway={sway}
        />
      ))}
    </>
  );
}
