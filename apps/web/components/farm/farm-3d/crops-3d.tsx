"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Euler, InstancedMesh, Matrix4, Quaternion, Vector3 } from "three";

import {
  CROP_SWAY,
  FX_DURATIONS,
  fxProgress,
  harvestRise,
  harvestScale,
  harvestSpin,
  morphInScale,
  morphOutScale,
  popInScale,
  readyBreath,
  swayX,
  swayZ,
} from "@/lib/game/3d/animation";
import { cropGeometries } from "@/lib/game/3d/geometry-factory";
import type { FarmMaterials } from "@/lib/game/3d/material-factory";
import type { FarmExtents } from "@/lib/game/3d/positioning";
import { cropVariant } from "@/lib/game/art/variants";
import type { FarmTheme } from "@/lib/game/content/types";
import { cropStage, formatWait, type CropStage } from "@/lib/game/core/crops";
import { useFxStore } from "@/lib/game/store/fx-store";
import type { FarmWorldSnapshot } from "@/lib/game/types";

import { plotInstances } from "./plots-3d";

const EPOCH = new Date(0);
const STAGES: CropStage[] = ["fresh", "growing", "ready", "urgent"];

// Unused instance slots park here once; every frame rewrites them with
// the same values, which is a cheap memcpy and keeps extras appendable.
const PARKED_MATRIX = new Matrix4().compose(
  new Vector3(0, -10, 0),
  new Quaternion(),
  new Vector3(0, 0, 0)
);

type CropBase = {
  key: string;
  position: Vector3;
  rotationY: number;
  scale: number;
  phase: number;
};

type CropBadge = {
  key: string;
  hanzi: string;
  position: [number, number, number];
  caption: string;
  ready: boolean;
  urgent: boolean;
};

type StageShift = { from: CropStage; to: CropStage; startedAt: number };

const _matrix = new Matrix4();
const _euler = new Euler();
const _quaternion = new Quaternion();
const _scale = new Vector3();
const _position = new Vector3();

export function Crops3D({
  snapshot,
  theme,
  now,
  farm,
  materials,
}: {
  snapshot: FarmWorldSnapshot;
  theme: FarmTheme;
  now: Date | null;
  farm: FarmExtents;
  materials: FarmMaterials;
}) {
  const stageMeshes = useRef<Partial<Record<CropStage, InstancedMesh | null>>>(
    {}
  );
  // Transient animation bookkeeping (Golden Rule #1): registered by
  // diffing consecutive snapshots, consumed by useFrame, never rendered
  // into game state. Map writes are idempotent, so a StrictMode
  // double-render cannot double-trigger an effect.
  const plantsRef = useRef<Map<string, number>>(new Map());
  const shiftsRef = useRef<Map<string, StageShift>>(new Map());
  const diffRef = useRef<{
    worldId: string;
    plots: Map<string, { cardId: string | null; stage: CropStage | null }>;
  } | null>(null);
  const lastHarvestsRef = useRef<readonly unknown[]>([]);
  const harvestKeysRef = useRef<Set<string>>(new Set());
  const geometries = useMemo(
    () => cropGeometries(theme.accent),
    [theme.accent]
  );
  const reference = now ?? EPOCH;
  const capacity = snapshot.beds.reduce((sum, bed) => sum + bed.plotCount, 0);

  const { plotPositionByKey } = useMemo(() => {
    const plotPositionByKey = new Map(
      plotInstances(snapshot.beds, farm.beds).map((instance) => [
        instance.key,
        instance.position,
      ])
    );
    return { plotPositionByKey };
  }, [snapshot.beds, farm.beds]);

  const { bases, basesByKey, badges } = useMemo(() => {
    const bases: Record<CropStage, CropBase[]> = {
      fresh: [],
      growing: [],
      ready: [],
      urgent: [],
    };
    const basesByKey = new Map<string, CropBase>();
    const badges: CropBadge[] = [];
    snapshot.beds.forEach((bed, bedIndex) => {
      bed.plots.forEach((plot) => {
        if (!plot.hanzi) return;
        const position = plotPositionByKey.get(`${bed.id}:${plot.slotIndex}`);
        if (!position) return;
        const stage = cropStage(plot.schedule, reference);
        const variant = cropVariant(plot.hanzi);
        const key = `${bed.id}:${plot.slotIndex}`;
        const base: CropBase = {
          key,
          position: new Vector3(position.x, position.y, position.z),
          rotationY: variant * 2.1 + plot.slotIndex * 0.7,
          scale: 0.92 + variant * 0.08,
          phase: (plot.slotIndex + bedIndex * 3) * 1.7,
        };
        bases[stage].push(base);
        basesByKey.set(key, base);
        const wait =
          plot.schedule && stage === "growing"
            ? formatWait(plot.schedule.dueAt, reference)
            : "";
        badges.push({
          key,
          hanzi: plot.hanzi,
          position: [position.x, position.y + 0.85, position.z],
          caption: wait,
          ready: stage === "ready",
          urgent: stage === "urgent",
        });
      });
    });
    return { bases, basesByKey, badges };
  }, [snapshot.beds, plotPositionByKey, reference]);

  // Snapshot diffing runs post-commit: a cardId appearing is a plant
  // pop-in, a stage flip under the same cardId is a morph. Effects fire
  // before the next animation frame, so the very first painted frame of
  // a new crop already carries its animation state. A world switch (or
  // the first render) reseeds the diff instead of animating wholesale.
  useEffect(() => {
    const prev = diffRef.current;
    const worldId = snapshot.world.id;
    const plots = new Map<
      string,
      { cardId: string | null; stage: CropStage | null }
    >();
    snapshot.beds.forEach((bed) => {
      bed.plots.forEach((plot) => {
        plots.set(`${bed.id}:${plot.slotIndex}`, {
          cardId: plot.cardId ?? null,
          stage: plot.hanzi ? cropStage(plot.schedule, reference) : null,
        });
      });
    });
    if (prev && prev.worldId === worldId) {
      const wallClock = performance.now();
      plots.forEach((next, key) => {
        const before = prev.plots.get(key);
        if (!before) return;
        if (before.cardId === null && next.cardId !== null) {
          plantsRef.current.set(key, wallClock);
        }
        if (
          next.cardId !== null &&
          before.cardId === next.cardId &&
          before.stage !== null &&
          next.stage !== null &&
          before.stage !== next.stage
        ) {
          shiftsRef.current.set(key, {
            from: before.stage,
            to: next.stage,
            startedAt: wallClock,
          });
        }
      });
    }
    diffRef.current = { worldId, plots };
  }, [snapshot.beds, snapshot.world.id, reference]);

  useLayoutEffect(() => {
    STAGES.forEach((stage) => {
      const mesh = stageMeshes.current[stage];
      if (!mesh) return;
      const stageBases = bases[stage];
      for (let i = stageBases.length; i < capacity; i++) {
        mesh.setMatrixAt(i, PARKED_MATRIX);
      }
      mesh.count = capacity;
      mesh.instanceMatrix.needsUpdate = true;
    });
  }, [bases, capacity]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    const wallClock = performance.now();
    const fx = useFxStore.getState();
    const harvests = fx.harvests;
    if (harvests.length > 0) {
      fx.reapHarvests(wallClock, FX_DURATIONS.harvest);
    }
    if (harvests !== lastHarvestsRef.current) {
      lastHarvestsRef.current = harvests;
      harvestKeysRef.current = new Set(harvests.map((entry) => entry.key));
    }
    const harvestKeys = harvestKeysRef.current;
    STAGES.forEach((stage) => {
      const mesh = stageMeshes.current[stage];
      if (!mesh) return;
      const stageBases = bases[stage];
      const sway = CROP_SWAY[stage];
      let cursor = 0;
      for (let i = 0; i < stageBases.length; i++) {
        const base = stageBases[i];
        // The ghost owns this plot while its harvest animation runs;
        // rendering both would double the crop until refresh lands.
        if (harvestKeys.size > 0 && harvestKeys.has(base.key)) continue;
        let scale = base.scale;
        const planted = plantsRef.current.get(base.key);
        if (planted !== undefined) {
          const p = fxProgress(
            wallClock - planted,
            FX_DURATIONS.plant,
            fx.motionScale
          );
          scale *= popInScale(p);
          if (p >= 1) plantsRef.current.delete(base.key);
        }
        const shift = shiftsRef.current.get(base.key);
        if (shift !== undefined && shift.to === stage) {
          const p = fxProgress(
            wallClock - shift.startedAt,
            FX_DURATIONS.stageShift,
            fx.motionScale
          );
          scale *= morphInScale(p);
          if (p >= 1) shiftsRef.current.delete(base.key);
        } else if (stage === "ready" && planted === undefined) {
          scale *= readyBreath(time, base.phase);
        }
        _euler.set(
          swayX(time, base.phase, sway),
          base.rotationY,
          swayZ(time, base.phase, sway)
        );
        _quaternion.setFromEuler(_euler);
        _position.copy(base.position);
        _scale.setScalar(scale);
        _matrix.compose(_position, _quaternion, _scale);
        mesh.setMatrixAt(cursor++, _matrix);
      }
      if (shiftsRef.current.size > 0) {
        for (const [key, shift] of shiftsRef.current) {
          if (shift.from !== stage) continue;
          const base = basesByKey.get(key);
          if (!base) {
            shiftsRef.current.delete(key);
            continue;
          }
          const p = fxProgress(
            wallClock - shift.startedAt,
            FX_DURATIONS.stageShift,
            fx.motionScale
          );
          _euler.set(
            swayX(time, base.phase, sway),
            base.rotationY,
            swayZ(time, base.phase, sway)
          );
          _quaternion.setFromEuler(_euler);
          _position.copy(base.position);
          _scale.setScalar(base.scale * morphOutScale(p));
          _matrix.compose(_position, _quaternion, _scale);
          mesh.setMatrixAt(cursor++, _matrix);
        }
      }
      for (const ghost of harvests) {
        if (ghost.stage !== stage) continue;
        const position = plotPositionByKey.get(ghost.key);
        if (!position) continue;
        const variant = cropVariant(ghost.hanzi);
        const p = fxProgress(
          wallClock - ghost.startedAt,
          FX_DURATIONS.harvest,
          fx.motionScale
        );
        _euler.set(
          0,
          variant * 2.1 + ghost.slotIndex * 0.7 + harvestSpin(p),
          0
        );
        _quaternion.setFromEuler(_euler);
        _position.set(position.x, position.y + harvestRise(p), position.z);
        _scale.setScalar(
          (0.92 + variant * 0.08) * Math.max(harvestScale(p), 0)
        );
        _matrix.compose(_position, _quaternion, _scale);
        mesh.setMatrixAt(cursor++, _matrix);
      }
      for (let i = cursor; i < capacity; i++) {
        mesh.setMatrixAt(i, PARKED_MATRIX);
      }
      mesh.instanceMatrix.needsUpdate = true;
    });
  });

  return (
    <group>
      {STAGES.map((stage) => (
        <instancedMesh
          key={stage}
          ref={(mesh) => {
            stageMeshes.current[stage] = mesh;
          }}
          args={[geometries[stage], materials.crop, Math.max(capacity, 1)]}
          castShadow
        />
      ))}
      {badges.map((badge) => (
        <Html
          key={badge.key}
          position={badge.position}
          center
          zIndexRange={[12, 0]}
          style={{ pointerEvents: "none" }}
        >
          <span className="flex flex-col items-center">
            <span className="whitespace-nowrap rounded-full bg-white/85 px-1.5 text-sm font-bold leading-tight text-[#2c2416] shadow dark:bg-black/55 dark:text-white font-hanzi">
              {badge.hanzi}
            </span>
            {badge.caption ? (
              <span className="mt-0.5 rounded-full bg-white/60 px-1 text-[9px] font-bold leading-tight text-[#2c2416] dark:bg-black/45 dark:text-white">
                {badge.caption}
              </span>
            ) : null}
            {badge.ready ? (
              <span className="text-[10px] leading-none drop-shadow">✨</span>
            ) : badge.urgent ? (
              <span className="text-[10px] leading-none drop-shadow">🐛</span>
            ) : null}
          </span>
        </Html>
      ))}
    </group>
  );
}
