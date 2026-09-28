"use client";

import { useLayoutEffect, useMemo, useRef } from "react";

import {
  BoxGeometry,
  InstancedMesh,
  Matrix4,
  Quaternion,
  Vector3,
} from "three";

import type { FarmMaterials } from "@/lib/game/3d/material-factory";
import type { FarmExtents } from "@/lib/game/3d/positioning";

const POST_SPACING = 2.3;
const POST_SIZE = [0.16, 1.05, 0.16] as const;
const RAIL_SIZE = [POST_SPACING, 0.1, 0.08] as const;
const RAIL_HEIGHTS = [0.42, 0.78] as const;
const GATE_HALF_WIDTH = 1.8;

const _matrix = new Matrix4();
const _position = new Vector3();
const _quaternion = new Quaternion();
const _scale = new Vector3();

type FencePoint = { x: number; z: number };

function fencePerimeter(farm: FarmExtents): FencePoint[] {
  const margin = 2.1;
  const minX = farm.center[0] - farm.width / 2 - margin;
  const maxX = farm.center[0] + farm.width / 2 + margin;
  const minZ = farm.center[1] - farm.depth / 2 - margin;
  const maxZ = farm.center[1] + farm.depth / 2 + margin + 0.8;
  const points: FencePoint[] = [];
  const edges: [FencePoint, FencePoint][] = [
    [
      { x: minX, z: minZ },
      { x: maxX, z: minZ },
    ],
    [
      { x: maxX, z: minZ },
      { x: maxX, z: maxZ },
    ],
    [
      { x: maxX, z: maxZ },
      { x: minX, z: maxZ },
    ],
    [
      { x: minX, z: maxZ },
      { x: minX, z: minZ },
    ],
  ];
  for (const [start, end] of edges) {
    const length = Math.hypot(end.x - start.x, end.z - start.z);
    const count = Math.max(1, Math.round(length / POST_SPACING));
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      const x = start.x + (end.x - start.x) * t;
      const z = start.z + (end.z - start.z) * t;
      const isFrontEdge = start.z === maxZ;
      if (isFrontEdge && Math.abs(x - farm.center[0]) < GATE_HALF_WIDTH)
        continue;
      points.push({ x, z });
    }
  }
  return points;
}

export function Buildings3D({
  farm,
  materials,
}: {
  farm: FarmExtents;
  materials: FarmMaterials;
}) {
  const postGeometry = useMemo(() => new BoxGeometry(...POST_SIZE), []);
  const railGeometry = useMemo(() => new BoxGeometry(...RAIL_SIZE), []);
  const postsRef = useRef<InstancedMesh>(null!);
  const railsRef = useRef<InstancedMesh>(null!);

  const { posts, rails } = useMemo(() => {
    const fencePosts = fencePerimeter(farm);
    const rails: { position: Vector3; rotationY: number }[] = [];
    for (let i = 0; i < fencePosts.length; i++) {
      const a = fencePosts[i];
      const b = fencePosts[(i + 1) % fencePosts.length];
      const distance = Math.hypot(b.x - a.x, b.z - a.z);
      if (distance > POST_SPACING * 1.6) continue;
      const midX = (a.x + b.x) / 2;
      const midZ = (a.z + b.z) / 2;
      const rotationY = Math.atan2(b.x - a.x, b.z - a.z) + Math.PI / 2;
      for (const height of RAIL_HEIGHTS) {
        rails.push({
          position: new Vector3(midX, height, midZ),
          rotationY,
        });
      }
    }
    return {
      posts: fencePosts.map(
        (point) => new Vector3(point.x, POST_SIZE[1] / 2, point.z)
      ),
      rails,
    };
  }, [farm]);

  useLayoutEffect(() => {
    const mesh = postsRef.current;
    if (!mesh) return;
    _quaternion.identity();
    _scale.setScalar(1);
    posts.forEach((position, i) => {
      _matrix.compose(position, _quaternion, _scale);
      mesh.setMatrixAt(i, _matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [posts]);

  useLayoutEffect(() => {
    const mesh = railsRef.current;
    if (!mesh) return;
    _scale.setScalar(1);
    rails.forEach((rail, i) => {
      _quaternion.setFromAxisAngle(new Vector3(0, 1, 0), rail.rotationY);
      _position.copy(rail.position);
      _matrix.compose(_position, _quaternion, _scale);
      mesh.setMatrixAt(i, _matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [rails]);

  return (
    <group>
      <instancedMesh
        ref={postsRef}
        args={[postGeometry, materials.wood, posts.length]}
        castShadow
      />
      <instancedMesh
        ref={railsRef}
        args={[railGeometry, materials.woodDark, rails.length]}
        castShadow
      />
      <Shed farm={farm} materials={materials} />
    </group>
  );
}

function Shed({
  farm,
  materials,
}: {
  farm: FarmExtents;
  materials: FarmMaterials;
}) {
  const position: [number, number, number] = [
    farm.center[0] - farm.width / 2 - 4.2,
    0,
    farm.center[1] - farm.depth / 2 - 1.4,
  ];
  const roofTilt = 0.62;
  return (
    <group position={position} rotation-y={0.42}>
      <mesh
        position={[0, 1.1, 0]}
        material={materials.wood}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[3, 2.2, 2.5]} />
      </mesh>
      <mesh
        position={[-0.78, 1.55, 0]}
        rotation-z={-roofTilt}
        material={materials.woodDark}
        castShadow
      >
        <boxGeometry args={[2.05, 0.14, 2.9]} />
      </mesh>
      <mesh
        position={[0.78, 1.55, 0]}
        rotation-z={roofTilt}
        material={materials.woodDark}
        castShadow
      >
        <boxGeometry args={[2.05, 0.14, 2.9]} />
      </mesh>
      <mesh position={[0, 0.62, 1.26]} material={materials.woodDark}>
        <boxGeometry args={[0.9, 1.24, 0.08]} />
      </mesh>
    </group>
  );
}
