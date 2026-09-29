"use client";

import { useMemo } from "react";

import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";

import type { FarmExtents } from "@/lib/game/3d/positioning";
import type { BedView } from "@/lib/game/types";

import { forEachCropLabel, placeCropLabel } from "./crop-label-bridge";
import { plotInstances } from "./plots-3d";

const LABEL_HEIGHT = 3.4;

const _projected = new Vector3();

export function CropLabelProjector({
  beds,
  farm,
}: {
  beds: BedView[];
  farm: FarmExtents;
}) {
  const anchors = useMemo(
    () =>
      new Map(
        plotInstances(beds, farm.beds).map((instance) => [
          instance.key,
          new Vector3(
            instance.position.x,
            instance.position.y + LABEL_HEIGHT,
            instance.position.z
          ),
        ])
      ),
    [beds, farm.beds]
  );

  useFrame(({ camera, size }) => {
    forEachCropLabel((key, node) => {
      const anchor = anchors.get(key);
      if (!anchor) {
        placeCropLabel(node, 0, 0, false);
        return;
      }
      _projected.copy(anchor).project(camera);
      const x = (_projected.x * 0.5 + 0.5) * size.width;
      const y = (-_projected.y * 0.5 + 0.5) * size.height;
      const onScreen =
        _projected.z < 1 &&
        x > -80 &&
        x < size.width + 80 &&
        y > -40 &&
        y < size.height + 40;
      placeCropLabel(node, x, y, onScreen);
    });
  });

  return null;
}
