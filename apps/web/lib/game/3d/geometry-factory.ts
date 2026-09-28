import {
  BoxGeometry,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  SphereGeometry,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import type { CropStage } from "@/lib/game/core/crops";

const STEM = "#4e8a3f";
const LEAF = "#7fc95f";
const LEAF_LIGHT = "#a5de7e";
const WILT_STEM = "#a3814a";
const WILT_LEAF = "#c4a35e";
const PEST = "#5b3a29";

const COLOR_CACHE = new Map<string, Color>();

function colorOf(hex: string): Color {
  let color = COLOR_CACHE.get(hex);
  if (!color) {
    color = new Color(hex);
    COLOR_CACHE.set(hex, color);
  }
  return color;
}

function painted(geometry: BufferGeometry, hex: string): BufferGeometry {
  const color = colorOf(hex);
  const count = geometry.getAttribute("position").count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  return geometry;
}

function stem(
  radiusTop: number,
  radiusBottom: number,
  height: number
): BufferGeometry {
  return new CylinderGeometry(radiusTop, radiusBottom, height, 5, 1);
}

function leafBlade(length: number, width: number): BufferGeometry {
  const blade = new ConeGeometry(width, length, 4, 1);
  blade.scale(1, 1, 0.28);
  return blade;
}

function tilted(
  geometry: BufferGeometry,
  position: [number, number, number],
  rotationZ: number,
  rotationX = 0
): BufferGeometry {
  geometry.rotateZ(rotationZ);
  geometry.rotateX(rotationX);
  geometry.translate(...position);
  return geometry;
}

function seedling(): BufferGeometry {
  const parts = [
    tilted(painted(stem(0.035, 0.05, 0.3), STEM), [0, 0.15, 0], 0),
    tilted(
      painted(new SphereGeometry(0.16, 6, 4).scale(1, 0.32, 1), LEAF),
      [-0.13, 0.31, 0],
      0.5
    ),
    tilted(
      painted(new SphereGeometry(0.16, 6, 4).scale(1, 0.32, 1), LEAF_LIGHT),
      [0.13, 0.31, 0],
      -0.5
    ),
  ];
  return mergeGeometries(parts)!;
}

function sproutingPlant(): BufferGeometry {
  const parts = [
    tilted(painted(stem(0.04, 0.055, 0.62), STEM), [0, 0.31, 0], 0),
  ];
  const blades = [
    { y: 0.3, angle: 0.95, hex: LEAF },
    { y: 0.3, angle: 0.95 + Math.PI, hex: LEAF },
    { y: 0.5, angle: 0.75, hex: LEAF_LIGHT },
    { y: 0.5, angle: 0.75 + Math.PI, hex: LEAF_LIGHT },
    { y: 0.62, angle: 0.2, hex: LEAF },
  ];
  for (const blade of blades) {
    parts.push(
      tilted(
        painted(leafBlade(0.4, 0.17), blade.hex),
        [Math.sin(blade.angle) * 0.16, blade.y, Math.cos(blade.angle) * -0.16],
        blade.angle,
        1.15
      )
    );
  }
  return mergeGeometries(parts)!;
}

function ripePlant(accent: string): BufferGeometry {
  const parts = [
    tilted(painted(stem(0.045, 0.06, 0.78), STEM), [0, 0.39, 0], 0),
    tilted(
      painted(new SphereGeometry(0.26, 7, 5).scale(1, 0.85, 1), accent),
      [0, 0.88, 0],
      0
    ),
    tilted(
      painted(new SphereGeometry(0.15, 6, 4), accent),
      [-0.18, 0.74, 0.08],
      0
    ),
    tilted(
      painted(new SphereGeometry(0.13, 6, 4), accent),
      [0.17, 0.78, -0.1],
      0
    ),
  ];
  const leaves = [
    { angle: 0.55, y: 0.34, hex: LEAF_LIGHT },
    { angle: 0.55 + Math.PI, y: 0.34, hex: LEAF },
    { angle: 2.2, y: 0.52, hex: LEAF },
    { angle: 2.2 + Math.PI, y: 0.52, hex: LEAF_LIGHT },
    { angle: 1.35, y: 0.18, hex: LEAF },
    { angle: 1.35 + Math.PI, y: 0.18, hex: LEAF_LIGHT },
  ];
  for (const leaf of leaves) {
    parts.push(
      tilted(
        painted(leafBlade(0.46, 0.19), leaf.hex),
        [Math.sin(leaf.angle) * 0.2, leaf.y, Math.cos(leaf.angle) * -0.2],
        leaf.angle,
        1.2
      )
    );
  }
  return mergeGeometries(parts)!;
}

function wiltedPlant(): BufferGeometry {
  const parts = [
    tilted(painted(stem(0.04, 0.055, 0.4), WILT_STEM), [0, 0.2, 0], 0),
    tilted(painted(stem(0.03, 0.04, 0.34), WILT_STEM), [0.12, 0.52, 0], -1.05),
    tilted(
      painted(new SphereGeometry(0.14, 6, 4).scale(1, 0.4, 1), WILT_LEAF),
      [0.28, 0.56, 0],
      0.45
    ),
    tilted(
      painted(leafBlade(0.38, 0.16), WILT_LEAF),
      [-0.16, 0.28, 0.06],
      2.35,
      1.9
    ),
    tilted(
      painted(leafBlade(0.32, 0.15), WILT_LEAF),
      [-0.05, 0.36, -0.14],
      3.6,
      1.7
    ),
    tilted(
      painted(new SphereGeometry(0.05, 5, 4), PEST),
      [0.24, 0.66, 0.04],
      0
    ),
  ];
  return mergeGeometries(parts)!;
}

export type CropGeometrySet = Record<CropStage, BufferGeometry>;

const GEOMETRY_CACHE = new Map<string, CropGeometrySet>();

export function cropGeometries(accent: string): CropGeometrySet {
  const cached = GEOMETRY_CACHE.get(accent);
  if (cached) return cached;
  const set: CropGeometrySet = {
    fresh: seedling(),
    growing: sproutingPlant(),
    ready: ripePlant(accent),
    urgent: wiltedPlant(),
  };
  GEOMETRY_CACHE.set(accent, set);
  return set;
}

export function cropHeight(stage: CropStage): number {
  switch (stage) {
    case "fresh":
      return 0.47;
    case "growing":
      return 0.85;
    case "ready":
      return 1.14;
    case "urgent":
      return 0.72;
  }
}

export function plotTileGeometry(size: number): BufferGeometry {
  return new BoxGeometry(size, 0.32, size);
}

export function bedPlatformGeometry(
  width: number,
  depth: number
): BufferGeometry {
  return new BoxGeometry(width, 0.55, depth);
}

export function roofPanelGeometry(
  width: number,
  depth: number
): BufferGeometry {
  return new BoxGeometry(width, 0.14, depth);
}
