"use client";

import { useEffect, useMemo, useRef } from "react";

import { useAnimations, useGLTF } from "@react-three/drei";
import { Group, LoopOnce, LoopRepeat, Object3D } from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";

import { FARM_MODEL_URLS } from "@/lib/game/3d/gltf-loader";
import type { FarmExtents } from "@/lib/game/3d/positioning";
import { useFxStore } from "@/lib/game/store/fx-store";

const COMPANION_NAME = "nori";

// The companion greets now and then on its own; the wave is cosmetic so
// the cadence is allowed to be random, unlike render-time art.
const IDLE_WAVE_INTERVAL_MS = 60_000;

export function Companion3D({ farm }: { farm: FarmExtents }) {
  const group = useRef<Group>(null!);
  const { scene, animations } = useGLTF(FARM_MODEL_URLS.friends);
  const reaction = useFxStore((state) => state.reaction);

  const companion = useMemo(() => {
    const source = scene.getObjectByName(COMPANION_NAME);
    return source ? cloneSkinned(source) : null;
  }, [scene]);

  const companionClips = useMemo(
    () =>
      animations.filter((clip) => clip.name.startsWith(`${COMPANION_NAME}_`)),
    [animations]
  );

  const { actions, mixer } = useAnimations(companionClips, group);

  useEffect(() => {
    const idle = actions[`${COMPANION_NAME}_idle`];
    if (!idle) return;
    idle.reset().setLoop(LoopRepeat, Infinity).play();
    return () => {
      idle.fadeOut(0.2);
    };
  }, [actions]);

  // Reactions cross-fade out of idle and hand the mixer back once the
  // one-shot clip finishes; a missing clip degrades to staying idle.
  useEffect(() => {
    if (!reaction) return;
    const idle = actions[`${COMPANION_NAME}_idle`];
    const clip = actions[`${COMPANION_NAME}_${reaction.clip}`];
    if (!idle || !clip) return;
    idle.fadeOut(0.15);
    clip.reset().setLoop(LoopOnce, 1).fadeIn(0.15).play();
    const onFinished = (event: { action: unknown }) => {
      if (event.action !== clip) return;
      clip.fadeOut(0.15);
      idle.reset().fadeIn(0.15).play();
    };
    mixer.addEventListener("finished", onFinished);
    return () => {
      mixer.removeEventListener("finished", onFinished);
      clip.fadeOut(0.15);
      idle.reset().fadeIn(0.15).play();
    };
  }, [reaction, actions, mixer]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (Math.random() < 0.5) return;
      useFxStore.getState().react("wave");
    }, IDLE_WAVE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  if (!companion) return null;

  const x = farm.center[0] + farm.width / 2 + 2.6;
  const z = farm.center[1] + farm.depth / 2 + 3;
  const faceAngle = Math.atan2(farm.center[0] - x, farm.center[1] - z);

  return (
    <group ref={group} position={[x, 0, z]} rotation-y={faceAngle} scale={0.95}>
      <primitive object={companion as Object3D} />
    </group>
  );
}
