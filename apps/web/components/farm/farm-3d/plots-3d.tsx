"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";

import type { ThreeEvent } from "@react-three/fiber";
import { useFrame } from "@react-three/fiber";
import {
  BoxGeometry,
  Color,
  InstancedMesh,
  Matrix4,
  Quaternion,
  Vector3,
} from "three";

import { FX_DURATIONS, easeOutQuad, fxProgress } from "@/lib/game/3d/animation";
import type { FarmMaterials } from "@/lib/game/3d/material-factory";
import type { BedLayout, FarmExtents } from "@/lib/game/3d/positioning";
import { PLOT_SIZE, plotCenter } from "@/lib/game/3d/positioning";
import { shade } from "@/lib/game/art/palette";
import { wiltIntensity } from "@/lib/game/core/crops";
import { useFxStore } from "@/lib/game/store/fx-store";
import { useSelectionStore } from "@/lib/game/store/selection-store";
import type { BedView } from "@/lib/game/types";

import { TAP_MAX_DRAG_PX, TAP_MAX_MS } from "./camera-controls";

const TILE_HEIGHT = 0.32;
const PLOT_TILE_Y = 0.55 + TILE_HEIGHT / 2;

export type PlotInstance = {
  key: string;
  bedId: string;
  slotIndex: number;
  position: Vector3;
};

export const PLOT_TILE_TOP_Y = PLOT_TILE_Y + TILE_HEIGHT / 2;

export function plotInstances(
  beds: BedView[],
  layouts: BedLayout[]
): PlotInstance[] {
  const instances: PlotInstance[] = [];
  beds.forEach((bed, bedIndex) => {
    const layout = layouts[bedIndex];
    if (!layout) return;
    bed.plots.forEach((plot) => {
      const [x, z] = plotCenter(layout, plot.slotIndex);
      instances.push({
        key: `${bed.id}:${plot.slotIndex}`,
        bedId: bed.id,
        slotIndex: plot.slotIndex,
        position: new Vector3(x, PLOT_TILE_Y + TILE_HEIGHT / 2, z),
      });
    });
  });
  return instances;
}

const _matrix = new Matrix4();
const _position = new Vector3();
const _quaternion = new Quaternion();
const _scale = new Vector3();
const _color = new Color();

export function Plots3D({
  beds,
  farm,
  materials,
  accent,
  worldId,
  now,
}: {
  beds: BedView[];
  farm: FarmExtents;
  materials: FarmMaterials;
  accent: string;
  worldId: string;
  now: Date | null;
}) {
  const meshRef = useRef<InstancedMesh>(null!);
  const selectPlot = useSelectionStore((state) => state.selectPlot);
  const selectedKey = useSelectionStore((state) => state.plot?.key ?? null);
  const downRef = useRef<{
    instanceId: number;
    x: number;
    y: number;
    time: number;
  } | null>(null);
  const instances = useMemo(
    () => plotInstances(beds, farm.beds),
    [beds, farm.beds]
  );
  // Expansion windows keyed by plot — registered post-commit when a
  // diff against the previous render's plot keys shows a tile the bed
  // did not have before. A world switch (or first render) reseeds
  // instead of animating.
  const expansionsRef = useRef<Map<string, number>>(new Map());
  const knownKeysRef = useRef<{ worldId: string; keys: Set<string> } | null>(
    null
  );

  useEffect(() => {
    const known = knownKeysRef.current;
    const keys = new Set(instances.map((instance) => instance.key));
    if (known && known.worldId === worldId) {
      const wallClock = performance.now();
      instances.forEach((instance) => {
        if (!known.keys.has(instance.key)) {
          expansionsRef.current.set(instance.key, wallClock);
        }
      });
    }
    knownKeysRef.current = { worldId, keys };
  }, [instances, worldId]);

  const tileGeometry = useMemo(
    () => new BoxGeometry(PLOT_SIZE, TILE_HEIGHT, PLOT_SIZE),
    []
  );

  const soilHex = useMemo(
    () => `#${materials.soil.color.getHexString()}`,
    [materials]
  );
  const plantedColor = useMemo(() => new Color(soilHex), [soilHex]);
  const emptyColor = useMemo(() => new Color(shade(soilHex, -0.2)), [soilHex]);
  const selectedColor = useMemo(
    () => new Color(soilHex).lerp(new Color(accent), 0.6),
    [soilHex, accent]
  );
  const tilledColor = useMemo(
    () => new Color(shade(soilHex, -0.45)),
    [soilHex]
  );
  // Cracked, thirsty soil under a wilting crop (GAME_PLAY §4): dries out
  // proportionally with the overdue ratio, fading back as it recovers.
  const dryColor = useMemo(
    () => new Color(shade(soilHex, -0.32)).lerp(new Color("#9a7d52"), 0.35),
    [soilHex]
  );

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const matrix = new Matrix4();
    const plantedKeys = new Set(
      beds.flatMap((bed) =>
        bed.plots
          .filter((plot) => plot.cardId)
          .map((plot) => `${bed.id}:${plot.slotIndex}`)
      )
    );
    const wiltByKey = new Map(
      beds.flatMap((bed) =>
        bed.plots.flatMap((plot) =>
          plot.cardId && now
            ? ([
                [
                  `${bed.id}:${plot.slotIndex}`,
                  wiltIntensity(plot.schedule, now),
                ],
              ] as [string, number][])
            : []
        )
      )
    );
    instances.forEach((instance, i) => {
      // Tiles inside an active expansion window are owned by useFrame;
      // writing their rest pose here would snap the grow-up mid-flight.
      if (expansionsRef.current.has(instance.key)) return;
      matrix.makeTranslation(
        instance.position.x,
        instance.position.y,
        instance.position.z
      );
      mesh.setMatrixAt(i, matrix);
      const wilt = wiltByKey.get(instance.key) ?? 0;
      const color =
        instance.key === selectedKey
          ? selectedColor
          : plantedKeys.has(instance.key)
            ? wilt > 0
              ? _color.copy(plantedColor).lerp(dryColor, wilt)
              : plantedColor
            : emptyColor;
      mesh.setColorAt(i, color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [
    beds,
    instances,
    plantedColor,
    emptyColor,
    selectedColor,
    selectedKey,
    dryColor,
    now,
  ]);

  useFrame(() => {
    if (expansionsRef.current.size === 0) return;
    const mesh = meshRef.current;
    if (!mesh) return;
    const wallClock = performance.now();
    const motionScale = useFxStore.getState().motionScale;
    instances.forEach((instance, i) => {
      const startedAt = expansionsRef.current.get(instance.key);
      if (startedAt === undefined) return;
      const p = fxProgress(
        wallClock - startedAt,
        FX_DURATIONS.expansion,
        motionScale
      );
      const s = easeOutQuad(p);
      // Growing from the ground: the tile scales around its resting
      // center while its center rises so the bottom face stays planted.
      _position.set(
        instance.position.x,
        instance.position.y - (1 - s) * (TILE_HEIGHT / 2),
        instance.position.z
      );
      _quaternion.identity();
      _scale.set(s, s, s);
      _matrix.compose(_position, _quaternion, _scale);
      mesh.setMatrixAt(i, _matrix);
      // Freshly tilled soil reads darker and fades back to normal as
      // the tile settles.
      _color.copy(emptyColor).lerp(tilledColor, 1 - p);
      mesh.setColorAt(i, _color);
      if (p >= 1) {
        expansionsRef.current.delete(instance.key);
        mesh.setColorAt(i, emptyColor);
      }
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  // A tap only selects when the finger lands and lifts on the same tile
  // without drifting (a drag pans the camera instead) and within the
  // tap window — R3F fires these per intersected mesh, so the guard
  // keeps camera drags from masquerading as selections.
  function handlePointerDown(event: ThreeEvent<PointerEvent>) {
    if (event.instanceId === undefined) return;
    downRef.current = {
      instanceId: event.instanceId,
      x: event.nativeEvent.clientX,
      y: event.nativeEvent.clientY,
      time: event.nativeEvent.timeStamp,
    };
  }

  function handlePointerUp(event: ThreeEvent<PointerEvent>) {
    const down = downRef.current;
    downRef.current = null;
    if (!down || event.instanceId !== down.instanceId) return;
    const dx = event.nativeEvent.clientX - down.x;
    const dy = event.nativeEvent.clientY - down.y;
    if (Math.hypot(dx, dy) > TAP_MAX_DRAG_PX) return;
    if (event.nativeEvent.timeStamp - down.time > TAP_MAX_MS) return;
    const instance = instances[event.instanceId];
    if (!instance) return;
    selectPlot({
      key: instance.key,
      bedId: instance.bedId,
      slotIndex: instance.slotIndex,
    });
  }

  return (
    <instancedMesh
      key={instances.length}
      ref={meshRef}
      args={[tileGeometry, materials.soilTile, instances.length]}
      receiveShadow
      castShadow
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    />
  );
}
