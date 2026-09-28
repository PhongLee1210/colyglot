import { describe, expect, test } from "bun:test";

import { farmExtents } from "./positioning";
import { sceneLayout } from "./scene-layout";

const FARM = farmExtents([6, 6, 6]);

function insideFarmKeepOut(x: number, z: number, farm = FARM): boolean {
  const margin = 2.2;
  return (
    x >= farm.center[0] - farm.width / 2 - margin &&
    x <= farm.center[0] + farm.width / 2 + margin &&
    z >= farm.center[1] - farm.depth / 2 - margin &&
    z <= farm.center[1] + farm.depth / 2 + margin
  );
}

describe("sceneLayout", () => {
  test("same world id produces an identical layout", () => {
    expect(sceneLayout("world-1", FARM)).toEqual(sceneLayout("world-1", FARM));
  });

  test("every placement lands on the island", () => {
    const layout = sceneLayout("world-1", FARM);
    const placements = [
      ...layout.trees,
      ...layout.bushes,
      ...layout.rocks,
      ...layout.flowers,
      ...layout.groundFlora,
    ];
    expect(placements.length).toBeGreaterThan(20);
    for (const placement of placements) {
      const radius = Math.hypot(placement.position[0], placement.position[2]);
      expect(radius).toBeLessThanOrEqual(layout.islandRadius);
    }
  });

  test("decor never spawns on top of the farm beds", () => {
    const layout = sceneLayout("world-2", FARM);
    const placements = [
      ...layout.trees,
      ...layout.bushes,
      ...layout.rocks,
      ...layout.flowers,
      ...layout.groundFlora,
    ];
    for (const placement of placements) {
      expect(
        insideFarmKeepOut(placement.position[0], placement.position[2])
      ).toBe(false);
    }
  });

  test("pond, campfire, and path are always present", () => {
    const layout = sceneLayout("world-3", FARM);
    expect(layout.campfire.length).toBeGreaterThanOrEqual(3);
    expect(layout.path.length).toBeGreaterThanOrEqual(3);
    expect(layout.pond.scale).toBeGreaterThan(0);
  });

  test("layout follows the farm footprint", () => {
    const bigger = sceneLayout("world-4", farmExtents([12, 12, 12]));
    const small = sceneLayout("world-4", FARM);
    expect(bigger.islandRadius).toBeGreaterThan(small.islandRadius);
  });
});
