import { describe, expect, test } from "bun:test";

import {
  BED_GAP,
  BED_PADDING,
  cameraOrbitOffset,
  cameraViewHeight,
  clampPan,
  farmExtents,
  islandRadius,
  panFromScreenDelta,
  PLOT_SIZE,
  plotCenter,
  PLOTS_PER_ROW,
} from "./positioning";

describe("farmExtents", () => {
  test("empty farm has zero footprint", () => {
    const farm = farmExtents([]);
    expect(farm.width).toBe(0);
    expect(farm.beds).toHaveLength(0);
  });

  test("farm is centered on the world origin", () => {
    const farm = farmExtents([6, 6, 6]);
    expect(farm.center).toEqual([0, 0]);
    expect(farm.beds[0].origin[1]).toBeLessThan(0);
    expect(farm.beds[2].origin[1] + farm.beds[2].size[1]).toBeGreaterThan(0);
  });

  test("every bed is centered on the x axis", () => {
    for (const bed of farmExtents([6, 9, 12]).beds) {
      expect(bed.origin[0] + bed.size[0] / 2).toBeCloseTo(0, 5);
    }
  });

  test("beds stack sequentially with no overlap", () => {
    const farm = farmExtents([12, 6, 9]);
    for (let i = 1; i < farm.beds.length; i++) {
      const above = farm.beds[i - 1];
      const below = farm.beds[i];
      expect(below.origin[1]).toBeCloseTo(
        above.origin[1] + above.size[1] + BED_GAP,
        5
      );
    }
  });

  test("six plots make two rows of three", () => {
    const [bed] = farmExtents([6]).beds;
    expect(bed.rows).toBe(2);
    expect(bed.size[0]).toBe(
      PLOTS_PER_ROW * (PLOT_SIZE + 0.35) - 0.35 + BED_PADDING * 2
    );
  });
});

describe("plotCenter", () => {
  test("first plot sits at the bed origin plus padding", () => {
    const [bed] = farmExtents([6]).beds;
    const [x, z] = plotCenter(bed, 0);
    expect(x).toBeCloseTo(bed.origin[0] + BED_PADDING + PLOT_SIZE / 2, 5);
    expect(z).toBeCloseTo(bed.origin[1] + BED_PADDING + PLOT_SIZE / 2, 5);
  });

  test("slot four wraps to the second row middle column", () => {
    const [bed] = farmExtents([6]).beds;
    const [x0] = plotCenter(bed, 1);
    const [x, z] = plotCenter(bed, 4);
    expect(x).toBeCloseTo(x0, 5);
    expect(z).toBeGreaterThan(bed.origin[1]);
  });
});

describe("camera framing", () => {
  const farm = farmExtents([6, 6, 6]);

  test("view height always fits the farm with margin", () => {
    const height = cameraViewHeight(390, 844, farm);
    expect(height).toBeGreaterThanOrEqual(farm.depth * 0.8);
    expect(height).toBeGreaterThanOrEqual(12);
  });

  test("empty farms still get a readable minimum span", () => {
    expect(cameraViewHeight(390, 844, farmExtents([]))).toBe(12);
  });

  test("portrait screens fit the farm's horizontal span", () => {
    const single = farmExtents([6]);
    const height = cameraViewHeight(390, 844, single);
    const azimuth = (42 * Math.PI) / 180;
    const span =
      single.width * Math.cos(azimuth) + single.depth * Math.sin(azimuth);
    expect(height * (390 / 844)).toBeGreaterThan(span);
  });

  test("wide screens keep the depth-based framing", () => {
    const deep = farmExtents([6, 6, 6]);
    expect(cameraViewHeight(1440, 900, deep)).toBeCloseTo(
      deep.depth * 0.8 + 4.5,
      5
    );
  });

  test("orbit offset keeps the camera above ground facing the farm", () => {
    const [x, y, z] = cameraOrbitOffset(80);
    expect(y).toBeGreaterThan(0);
    expect(x).toBeGreaterThan(0);
    expect(z).toBeGreaterThan(0);
  });
});

describe("islandRadius", () => {
  test("grows when the farm gets deeper", () => {
    const small = islandRadius(farmExtents([6, 6, 6]));
    const big = islandRadius(farmExtents([12, 12, 12]));
    expect(big).toBeGreaterThan(small);
  });

  test("stays within the hard cap", () => {
    expect(islandRadius(farmExtents([30, 30, 30]))).toBeLessThanOrEqual(30);
  });
});

describe("panFromScreenDelta", () => {
  test("axis-aligned drag at zero azimuth pans opposite the finger", () => {
    const view = { viewHeight: 100, canvasHeight: 200, azimuthDeg: 0 };
    expect(panFromScreenDelta(100, 0, view)).toEqual([-50, 0]);
    expect(panFromScreenDelta(0, 100, view)).toEqual([0, -50]);
  });

  test("any azimuth: camera moves opposite screen-right and screen-down", () => {
    const azimuth = 42;
    const view = { viewHeight: 60, canvasHeight: 300, azimuthDeg: azimuth };
    const rad = (azimuth * Math.PI) / 180;
    const scale = 60 / 300;
    for (const [dx, dy] of [
      [120, -40],
      [-30, 90],
      [200, 200],
    ]) {
      const [px, pz] = panFromScreenDelta(dx, dy, view);
      const alongRight = px * Math.cos(rad) - pz * Math.sin(rad);
      const alongForward = -px * Math.sin(rad) - pz * Math.cos(rad);
      expect(alongRight).toBeCloseTo(-dx * scale, 5);
      expect(alongForward).toBeCloseTo(dy * scale, 5);
    }
  });
});

describe("clampPan", () => {
  const farm = farmExtents([6]);
  const viewHeight = cameraViewHeight(430, 932, farm);
  const aspect = 430 / 932;
  const maxRight = (vh: number) =>
    Math.max(0, (vh * aspect - farm.width) / 2) + 3;

  test("keeps small in-bounds pans untouched", () => {
    const [x, z] = clampPan([0.4, -0.3], farm, viewHeight, aspect);
    expect(x).toBeCloseTo(0.4, 5);
    expect(z).toBeCloseTo(-0.3, 5);
  });

  test("far pans land exactly on the frustum bound plus slack", () => {
    const [x, z] = clampPan([500, 0], farm, viewHeight, aspect, 0, 38);
    expect(x).toBeCloseTo(maxRight(viewHeight), 5);
    expect(z).toBeCloseTo(0, 5);
  });

  test("zooming in (smaller view height) tightens the pan range", () => {
    const wide = clampPan([500, 0], farm, viewHeight, aspect, 0, 38);
    const tight = clampPan([500, 0], farm, viewHeight / 2.4, aspect, 0, 38);
    expect(tight[0]).toBeCloseTo(maxRight(viewHeight / 2.4), 5);
    expect(Math.abs(tight[0])).toBeLessThanOrEqual(Math.abs(wide[0]));
  });
});
