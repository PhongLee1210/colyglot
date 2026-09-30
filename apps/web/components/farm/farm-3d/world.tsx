"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";

import { OrthographicCamera } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { Mesh } from "three";
import { Vector3 } from "three";

import { preloadFarmModels } from "@/lib/game/3d/gltf-loader";
import { createFarmMaterials } from "@/lib/game/3d/material-factory";
import { detectQualityConfig } from "@/lib/game/3d/performance";
import {
  CAMERA_AZIMUTH_DEG,
  CAMERA_ELEVATION_DEG,
  cameraOrbitOffset,
  cameraViewHeight,
  clampPan,
  farmExtents,
  plotCenter,
  type FarmExtents,
} from "@/lib/game/3d/positioning";
import { sceneLayout } from "@/lib/game/3d/scene-layout";
import type { FarmTheme } from "@/lib/game/content/types";
import { GOLDEN_SKY_STREAK_DAYS } from "@/lib/game/core/economy";
import { useCameraStore } from "@/lib/game/store/camera-store";
import { useFxStore } from "@/lib/game/store/fx-store";
import { useSceneStore } from "@/lib/game/store/scene-store";
import { useSelectionStore } from "@/lib/game/store/selection-store";
import type { BedView, FarmWorldSnapshot } from "@/lib/game/types";

import { Animals3D } from "./animals-3d";
import { Buildings3D } from "./buildings-3d";
import { FarmCameraControls } from "./camera-controls";
import { Companion3D } from "./companion-3d";
import { CropLabelProjector } from "./crop-label-projector";
import { Crops3D } from "./crops-3d";
import { Decorations3D } from "./decorations-3d";
import { FarmBeds3D } from "./farm-beds-3d";
import { Forest3D } from "./forest-3d";
import { PLOT_TILE_TOP_Y, plotInstances, Plots3D } from "./plots-3d";
import { Terrain3D } from "./terrain";
import { Trees3D } from "./trees-3d";

const CAMERA_DISTANCE = 80;
const SUN_OFFSET: [number, number, number] = [-28, 42, 18];
const TONE_MAPPING_EXPOSURE = 0.9;
// Golden-hour palette for the 30-day-ever sky reskin (GAME_PLAY §6.4).
const GOLDEN_SKY: [string, string] = ["#f7d98c", "#e8b968"];

function CameraRig({ farm }: { farm: FarmExtents }) {
  const size = useThree((state) => state.size);
  const pan = useCameraStore((state) => state.pan);
  const zoom = useCameraStore((state) => state.zoom);
  const baseViewHeight = cameraViewHeight(size.width, size.height, farm);
  const viewHeight = baseViewHeight / zoom;
  const aspect = size.width / Math.max(size.height, 1);
  const [panX, panZ] = clampPan(pan, farm, viewHeight, aspect);
  const [offsetX, offsetY, offsetZ] = cameraOrbitOffset(CAMERA_DISTANCE);
  const azimuth = (CAMERA_AZIMUTH_DEG * Math.PI) / 180;
  const elevation = (CAMERA_ELEVATION_DEG * Math.PI) / 180;

  return (
    <OrthographicCamera
      makeDefault
      /* Without `manual`, R3F's resize handler overwrites the default
         camera's frustum with raw viewport halves on every size change.
         During gradual (drag) resizes one axis of our farm-fit frustum
         can hold the same value across the change, so the reconciler
         skips re-applying it and the overwritten half sticks — the farm
         drifts out of view. `manual` opts out; the frustum below is the
         single source of truth. */
      manual
      near={1}
      far={CAMERA_DISTANCE * 2 + 40}
      left={(-viewHeight * aspect) / 2}
      right={(viewHeight * aspect) / 2}
      top={viewHeight / 2}
      bottom={-viewHeight / 2}
      position={[
        farm.center[0] + panX + offsetX,
        offsetY,
        farm.center[1] + panZ + offsetZ,
      ]}
      rotation={[-elevation, azimuth, 0]}
      rotation-order="YXZ"
    />
  );
}

function Sun({ radius, golden }: { radius: number; golden?: boolean }) {
  const shadowSpan = radius * 1.6;
  return (
    <>
      <hemisphereLight
        args={
          golden ? ["#ffe9b8", "#b89a5e", 0.85] : ["#cfeaf7", "#7fa86a", 0.85]
        }
      />
      <directionalLight
        position={SUN_OFFSET}
        intensity={golden ? 2.05 : 1.9}
        color={golden ? "#ffd98f" : "#fff2dc"}
        castShadow
      >
        <orthographicCamera
          attach="shadow-camera"
          args={[
            -shadowSpan,
            shadowSpan,
            shadowSpan,
            -shadowSpan,
            8,
            shadowSpan * 4,
          ]}
        />
      </directionalLight>
      <directionalLight
        position={[24, 18, -20]}
        intensity={0.35}
        color={golden ? "#ffd7a1" : "#cfe4ff"}
      />
    </>
  );
}

// Lives inside the asset Suspense boundary: its effect only fires once every
// GLB-dependent sibling has mounted, which is the DOM overlay's "done" cue.
function SceneReadyReporter() {
  const markSceneReady = useSceneStore((state) => state.markSceneReady);
  useEffect(() => {
    markSceneReady();
  }, [markSceneReady]);
  return null;
}

// Pulsing accent ring over the tapped plot — pure visual feedback driven
// by the shared selection store (never mutates game state).
function SelectionHighlight({
  beds,
  farm,
  accent,
}: {
  beds: BedView[];
  farm: FarmExtents;
  accent: string;
}) {
  const selection = useSelectionStore((state) => state.plot);
  const ringRef = useRef<Mesh>(null!);

  const position = useMemo(() => {
    if (!selection) return null;
    const bedIndex = beds.findIndex((bed) => bed.id === selection.bedId);
    const layout = farm.beds[bedIndex];
    if (!layout) return null;
    const [x, z] = plotCenter(layout, selection.slotIndex);
    return [x, PLOT_TILE_TOP_Y + 0.09, z] as const;
  }, [selection, beds, farm.beds]);

  useFrame((state) => {
    if (!ringRef.current) return;
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 3.2) * 0.06;
    ringRef.current.scale.setScalar(pulse);
  });

  if (!position) return null;
  return (
    <mesh ref={ringRef} position={position} rotation-x={-Math.PI / 2}>
      <ringGeometry args={[1.18, 1.42, 40]} />
      <meshStandardMaterial
        color={accent}
        emissive={accent}
        emissiveIntensity={0.55}
        transparent
        opacity={0.9}
      />
    </mesh>
  );
}

// Resolves pending coin-flight origins from world space to screen pixels
// using the live camera, so flights start wherever the plot currently
// sits under pan/zoom — event-driven, zero per-frame cost while idle.
function FxProjector({ beds, farm }: { beds: BedView[]; farm: FarmExtents }) {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const coinOrigins = useFxStore((state) => state.coinOrigins);
  const positions = useMemo(
    () =>
      new Map(
        plotInstances(beds, farm.beds).map((instance) => [
          instance.key,
          instance.position,
        ])
      ),
    [beds, farm.beds]
  );

  useEffect(() => {
    if (coinOrigins.length === 0) return;
    const origins = useFxStore.getState().takeCoinOrigins();
    if (origins.length === 0) return;
    const projected = new Vector3();
    const flights = origins.map((origin, index) => {
      const position = positions.get(origin.key);
      if (!position) return null;
      projected.copy(position).project(camera);
      return {
        id: Date.now() + index,
        x: (projected.x * 0.5 + 0.5) * size.width,
        y: (-projected.y * 0.5 + 0.5) * size.height,
        amount: origin.amount,
      };
    });
    const valid = flights.filter(
      (flight): flight is NonNullable<typeof flight> => flight !== null
    );
    if (valid.length > 0) {
      useFxStore.getState().addCoinFlights(valid);
    }
  }, [coinOrigins, positions, camera, size]);

  return null;
}

export function Farm3DWorld({
  snapshot,
  theme,
  now,
}: {
  snapshot: FarmWorldSnapshot;
  theme: FarmTheme;
  now: Date | null;
}) {
  useEffect(() => {
    preloadFarmModels();
  }, []);

  const quality = useMemo(() => detectQualityConfig(), []);
  const materials = useMemo(() => createFarmMaterials(theme), [theme]);
  const farm = useMemo(
    () => farmExtents(snapshot.beds.map((bed) => bed.plotCount)),
    [snapshot.beds]
  );
  const layout = useMemo(
    () => sceneLayout(snapshot.world.id, farm),
    [snapshot.world.id, farm]
  );
  // The 30-day-ever sky reskin (GAME_PLAY §6.4): fog and light go golden,
  // and they stay golden — the memento honors history, not the live run.
  const goldenSky = snapshot.longestStreak >= GOLDEN_SKY_STREAK_DAYS;
  const sky = goldenSky ? GOLDEN_SKY : theme.sky;

  return (
    <Canvas
      orthographic
      shadows={quality.shadowsEnabled ? "percentage" : false}
      dpr={[1, quality.dprCap]}
      gl={{
        antialias: quality.antialias,
        alpha: true,
        toneMappingExposure: TONE_MAPPING_EXPOSURE,
      }}
      style={{ touchAction: "none" }}
    >
      <fog attach="fog" args={[sky[1], 85, 175]} />
      <Suspense fallback={null}>
        <CameraRig farm={farm} />
        <FarmCameraControls farm={farm} />
        <Sun radius={layout.islandRadius} golden={goldenSky} />
        <Terrain3D radius={layout.islandRadius} materials={materials} />
        <FarmBeds3D beds={snapshot.beds} farm={farm} materials={materials} />
        <Plots3D
          beds={snapshot.beds}
          farm={farm}
          materials={materials}
          accent={theme.accent}
          worldId={snapshot.world.id}
          now={now}
        />
        <FxProjector beds={snapshot.beds} farm={farm} />
        <CropLabelProjector beds={snapshot.beds} farm={farm} />
        <SelectionHighlight
          beds={snapshot.beds}
          farm={farm}
          accent={theme.accent}
        />
        <Crops3D
          snapshot={snapshot}
          theme={theme}
          now={now}
          farm={farm}
          materials={materials}
        />
        <Forest3D forest={snapshot.forest} layout={layout} />
        <Trees3D layout={layout} />
        <Decorations3D
          layout={layout}
          materials={materials}
          items={snapshot.items}
        />
        <Buildings3D
          farm={farm}
          materials={materials}
          items={snapshot.items.map((item) => item.itemKey)}
        />
        <Companion3D farm={farm} />
        <Animals3D
          beds={snapshot.beds}
          farm={farm}
          items={snapshot.items.map((item) => item.itemKey)}
        />
        <SceneReadyReporter />
      </Suspense>
    </Canvas>
  );
}
