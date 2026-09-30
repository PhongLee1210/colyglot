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
import { houseSpecFor, lampPlacements } from "@/lib/game/3d/shop-layout";

const POST_SPACING = 2.3;
const POST_SIZE = [0.16, 1.05, 0.16] as const;
const RAIL_SIZE = [POST_SPACING, 0.1, 0.08] as const;
const RAIL_HEIGHTS = [0.42, 0.78] as const;
const GATE_HALF_WIDTH = 1.8;
const LAMP_POST_HEIGHT = 1.7;
const LAMP_SIZE = 0.34;

const _matrix = new Matrix4();
const _position = new Vector3();
const _quaternion = new Quaternion();
const _scale = new Vector3();

type FencePoint = { x: number; z: number; isFrontEdge?: boolean };

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
      points.push({ x, z, isFrontEdge });
    }
  }
  return points;
}

export function Buildings3D({
  farm,
  materials,
  items,
}: {
  farm: FarmExtents;
  materials: FarmMaterials;
  /** Owned shop item keys (GAME_PLAY §6.3) — they change the scenery. */
  items: readonly string[];
}) {
  const postGeometry = useMemo(() => new BoxGeometry(...POST_SIZE), []);
  const railGeometry = useMemo(() => new BoxGeometry(...RAIL_SIZE), []);
  const postsRef = useRef<InstancedMesh>(null!);
  const stonePostsRef = useRef<InstancedMesh>(null!);
  const railsRef = useRef<InstancedMesh>(null!);

  const stoneFront = items.includes("fence_stone");

  const { posts, stonePosts, rails } = useMemo(() => {
    const fencePosts = fencePerimeter(farm);
    const wood: FencePoint[] = [];
    const stone: FencePoint[] = [];
    for (const point of fencePosts) {
      // The paid upgrade turns the FRONT fence (the one visitors see) to
      // cut stone; the rest stays wood.
      (stoneFront && point.isFrontEdge ? stone : wood).push(point);
    }
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
      posts: wood.map(
        (point) => new Vector3(point.x, POST_SIZE[1] / 2, point.z)
      ),
      stonePosts: stone.map(
        (point) => new Vector3(point.x, POST_SIZE[1] / 2 + 0.12, point.z)
      ),
      rails,
    };
  }, [farm, stoneFront]);

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
    const mesh = stonePostsRef.current;
    if (!mesh || stonePosts.length === 0) return;
    _quaternion.identity();
    _scale.setScalar(1.25);
    stonePosts.forEach((position, i) => {
      _matrix.compose(position, _quaternion, _scale);
      mesh.setMatrixAt(i, _matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [stonePosts]);

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

  const lamps = useMemo(() => lampPlacements(farm), [farm]);
  const hasLamps = items.includes("lamp_post");

  return (
    <group>
      <instancedMesh
        ref={postsRef}
        args={[postGeometry, materials.wood, posts.length]}
        castShadow
      />
      {stonePosts.length > 0 ? (
        <instancedMesh
          ref={stonePostsRef}
          args={[postGeometry, materials.stoneRim, stonePosts.length]}
          castShadow
        />
      ) : null}
      <instancedMesh
        ref={railsRef}
        args={[railGeometry, materials.woodDark, rails.length]}
        castShadow
      />
      <House farm={farm} materials={materials} items={items} />
      {hasLamps ? <Lamps placements={lamps} materials={materials} /> : null}
    </group>
  );
}

// Warm lamp posts (shop item): the emissive spheres are what read at a
// glance, the posts just hold them up.
function Lamps({
  placements,
  materials,
}: {
  placements: { position: [number, number, number] }[];
  materials: FarmMaterials;
}) {
  return (
    <group>
      {placements.map((lamp, index) => (
        <group key={index} position={lamp.position}>
          <mesh
            position={[0, LAMP_POST_HEIGHT / 2, 0]}
            material={materials.woodDark}
            castShadow
          >
            <boxGeometry args={[0.14, LAMP_POST_HEIGHT, 0.14]} />
          </mesh>
          <mesh position={[0, LAMP_POST_HEIGHT + LAMP_SIZE / 2, 0]}>
            <boxGeometry args={[LAMP_SIZE, LAMP_SIZE, LAMP_SIZE]} />
            <meshStandardMaterial
              color="#ffd9a0"
              emissive="#ffb45e"
              emissiveIntensity={0.9}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function House({
  farm,
  materials,
  items,
}: {
  farm: FarmExtents;
  materials: FarmMaterials;
  items: readonly string[];
}) {
  const position: [number, number, number] = [
    farm.center[0] - farm.width / 2 - 4.2,
    0,
    farm.center[1] - farm.depth / 2 - 1.4,
  ];
  const tier = items.includes("house_3")
    ? 3
    : items.includes("house_2")
      ? 2
      : items.includes("house_1")
        ? 1
        : 0;
  const spec = houseSpecFor(tier);

  return (
    <group position={position} rotation-y={0.42}>
      <mesh
        position={[0, spec.bodyHeight / 2, 0]}
        material={tier === 0 ? materials.wood : materials.woodDark}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[spec.bodyWidth, spec.bodyHeight, spec.bodyDepth]} />
      </mesh>
      {tier === 0 ? (
        // Starter shed: the original lean-to.
        <>
          <mesh
            position={[-0.78, 1.55, 0]}
            rotation-z={-0.62}
            material={materials.woodDark}
            castShadow
          >
            <boxGeometry args={[2.05, 0.14, 2.9]} />
          </mesh>
          <mesh
            position={[0.78, 1.55, 0]}
            rotation-z={0.62}
            material={materials.woodDark}
            castShadow
          >
            <boxGeometry args={[2.05, 0.14, 2.9]} />
          </mesh>
        </>
      ) : (
        // Paid houses get a gable roof that grows with the body.
        <>
          <mesh
            position={[-spec.bodyWidth / 4, spec.bodyHeight + 0.35, 0]}
            rotation-z={-spec.roofPitch}
            material={materials.wood}
            castShadow
          >
            <boxGeometry
              args={[spec.bodyWidth * 0.62, 0.16, spec.bodyDepth + 0.4]}
            />
          </mesh>
          <mesh
            position={[spec.bodyWidth / 4, spec.bodyHeight + 0.35, 0]}
            rotation-z={spec.roofPitch}
            material={materials.wood}
            castShadow
          >
            <boxGeometry
              args={[spec.bodyWidth * 0.62, 0.16, spec.bodyDepth + 0.4]}
            />
          </mesh>
        </>
      )}
      {spec.wings > 0
        ? Array.from({ length: spec.wings }, (_, side) => {
            const sign = side === 0 ? -1 : 1;
            return (
              <mesh
                key={side}
                position={[
                  sign * (spec.bodyWidth / 2 + 0.85),
                  spec.bodyHeight * 0.32,
                  0.3,
                ]}
                material={materials.wood}
                castShadow
              >
                <boxGeometry
                  args={[1.7, spec.bodyHeight * 0.64, spec.bodyDepth * 0.8]}
                />
              </mesh>
            );
          })
        : null}
      {spec.chimney ? (
        <mesh
          position={[spec.bodyWidth / 3, spec.bodyHeight + 0.9, -0.4]}
          material={materials.stoneRim}
          castShadow
        >
          <boxGeometry args={[0.45, 1.3, 0.45]} />
        </mesh>
      ) : null}
      <mesh
        position={[0, spec.bodyHeight * 0.28, spec.bodyDepth / 2 + 0.04]}
        material={materials.woodDark}
      >
        <boxGeometry args={[0.9, spec.bodyHeight * 0.56, 0.08]} />
      </mesh>
    </group>
  );
}
