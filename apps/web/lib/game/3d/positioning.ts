export const PLOT_SIZE = 2.1;
export const PLOT_GAP = 0.35;
export const PLOTS_PER_ROW = 3;
export const BED_PADDING = 1.15;
export const BED_GAP = 3.4;

const PLOT_PITCH = PLOT_SIZE + PLOT_GAP;

export type Vec2 = [x: number, z: number];

export type BedLayout = {
  index: number;
  origin: Vec2;
  size: Vec2;
  center: Vec2;
  rows: number;
};

export type FarmExtents = {
  width: number;
  depth: number;
  center: Vec2;
  beds: BedLayout[];
};

function bedDimensions(plotCount: number): {
  width: number;
  depth: number;
  rows: number;
} {
  const rows = Math.max(1, Math.ceil(plotCount / PLOTS_PER_ROW));
  const width = PLOTS_PER_ROW * PLOT_PITCH - PLOT_GAP + BED_PADDING * 2;
  const depth = rows * PLOT_PITCH - PLOT_GAP + BED_PADDING * 2;
  return { width, depth, rows };
}

// Beds stack along +Z and the whole farm is centered on the world origin,
// so the island, camera, and decoration ring all share one anchor point.
// Bed depths can differ (each bed expands independently), so stacking is
// sequential rather than index-based.
export function farmExtents(plotCounts: number[]): FarmExtents {
  const count = plotCounts.length;
  if (count === 0) {
    return { width: 0, depth: 0, center: [0, 0], beds: [] };
  }
  const dimensions = plotCounts.map(bedDimensions);
  const totalDepth =
    dimensions.reduce((sum, dims) => sum + dims.depth, 0) +
    BED_GAP * (count - 1);
  let zCursor = -totalDepth / 2;
  const beds: BedLayout[] = dimensions.map((dims, index) => {
    const origin: Vec2 = [-dims.width / 2, zCursor];
    zCursor += dims.depth + BED_GAP;
    return {
      index,
      origin,
      size: [dims.width, dims.depth],
      center: [origin[0] + dims.width / 2, origin[1] + dims.depth / 2],
      rows: dims.rows,
    };
  });
  const width = Math.max(...dimensions.map((dims) => dims.width));
  return { width, depth: totalDepth, center: [0, 0], beds };
}

export function plotCenter(bed: BedLayout, slotIndex: number): Vec2 {
  const col = slotIndex % PLOTS_PER_ROW;
  const row = Math.floor(slotIndex / PLOTS_PER_ROW);
  return [
    bed.origin[0] + BED_PADDING + col * PLOT_PITCH + PLOT_SIZE / 2,
    bed.origin[1] + BED_PADDING + row * PLOT_PITCH + PLOT_SIZE / 2,
  ];
}

export const CAMERA_ELEVATION_DEG = 38;
export const CAMERA_AZIMUTH_DEG = 42;

// At azimuth A the farm's X axis projects onto the screen-horizontal axis as
// cos(A) and its Z axis as sin(A), so the horizontal world span the frustum
// must fit is width*cos(A) + depth*sin(A).
export function cameraViewHeight(
  viewportWidth: number,
  viewportHeight: number,
  farm: FarmExtents
): number {
  const azimuth = (CAMERA_AZIMUTH_DEG * Math.PI) / 180;
  const aspect = viewportWidth / Math.max(viewportHeight, 1);
  const horizontalSpan =
    farm.width * Math.cos(azimuth) + farm.depth * Math.sin(azimuth) + 2.5;
  return Math.max(
    12,
    farm.depth * 0.8 + 4.5,
    horizontalSpan / Math.max(aspect, 0.1)
  );
}

export function cameraOrbitOffset(distance: number): [number, number, number] {
  const elevation = (CAMERA_ELEVATION_DEG * Math.PI) / 180;
  const azimuth = (CAMERA_AZIMUTH_DEG * Math.PI) / 180;
  const horizontal = Math.cos(elevation) * distance;
  return [
    Math.sin(azimuth) * horizontal,
    Math.sin(elevation) * distance,
    Math.cos(azimuth) * horizontal,
  ];
}

// Island radius: farm extents plus breathing room for decor and camera fit.
export function islandRadius(farm: FarmExtents): number {
  if (farm.beds.length === 0) return 12;
  const margin = 7.5;
  const halfDiagonal =
    Math.hypot(farm.width / 2, farm.depth / 2) + margin - BED_GAP;
  return Math.min(Math.max(halfDiagonal, 13), 30);
}

export const CAMERA_ZOOM_MIN = 0.55;
export const CAMERA_ZOOM_MAX = 2.4;

// Dragging the canvas pans the camera along the ground plane: the farm
// follows the finger, so the camera moves opposite the drag. Screen right
// maps to the camera's ground right axis (cos A, -sin A) and screen down
// to its ground backward axis (sin A, cos A).
export function panFromScreenDelta(
  deltaX: number,
  deltaY: number,
  view: { viewHeight: number; canvasHeight: number; azimuthDeg: number }
): Vec2 {
  const azimuth = (view.azimuthDeg * Math.PI) / 180;
  const scale = view.viewHeight / Math.max(view.canvasHeight, 1);
  // The +0 normalizes -0 results back to 0 so strict equality holds.
  return [
    -scale * (Math.cos(azimuth) * deltaX + Math.sin(azimuth) * deltaY) + 0,
    scale * (Math.sin(azimuth) * deltaX - Math.cos(azimuth) * deltaY) + 0,
  ];
}

// Pan lives in the camera's ground axes so the clamp matches what the
// player sees: the visible span along the ground right axis is the ortho
// frustum width, and along the ground forward axis the tilted vertical
// coverage (view height stretched by 1/sin(elevation)). A little slack
// keeps drags feeling alive when the whole farm already fits.
export function clampPan(
  pan: Vec2,
  farm: FarmExtents,
  viewHeight: number,
  aspect: number,
  azimuthDeg = CAMERA_AZIMUTH_DEG,
  elevationDeg = CAMERA_ELEVATION_DEG
): Vec2 {
  const azimuth = (azimuthDeg * Math.PI) / 180;
  const elevation = (elevationDeg * Math.PI) / 180;
  const cos = Math.cos(azimuth);
  const sin = Math.sin(azimuth);
  const right = pan[0] * cos - pan[1] * sin;
  const forward = -pan[0] * sin - pan[1] * cos;
  const slack = 3;
  const maxRight =
    Math.max(
      0,
      (viewHeight * aspect - (farm.width * cos + farm.depth * sin)) / 2
    ) + slack;
  const maxForward =
    Math.max(
      0,
      (viewHeight / Math.sin(elevation) -
        (farm.width * sin + farm.depth * cos)) /
        2
    ) + slack;
  const clampedRight = Math.min(maxRight, Math.max(-maxRight, right));
  const clampedForward = Math.min(maxForward, Math.max(-maxForward, forward));
  return [
    clampedRight * cos - clampedForward * sin,
    -(clampedRight * sin + clampedForward * cos),
  ];
}
