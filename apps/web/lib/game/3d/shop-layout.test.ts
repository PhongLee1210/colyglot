import { describe, expect, test } from "bun:test";

import { farmExtents } from "@/lib/game/3d/positioning";

import { houseSpecFor, lampPlacements } from "./shop-layout";

describe("houseSpecFor", () => {
  test("the house grows with each paid tier", () => {
    for (let tier = 0; tier <= 2; tier += 1) {
      const current = houseSpecFor(tier);
      const next = houseSpecFor(tier + 1);
      expect(next.bodyWidth).toBeGreaterThan(current.bodyWidth);
      expect(next.bodyHeight).toBeGreaterThan(current.bodyHeight);
    }
  });

  test("chimney and wings arrive on schedule", () => {
    expect(houseSpecFor(0).chimney).toBe(false);
    expect(houseSpecFor(1).chimney).toBe(false);
    expect(houseSpecFor(2).chimney).toBe(true);
    expect(houseSpecFor(3).chimney).toBe(true);
    expect(houseSpecFor(0).wings).toBe(0);
    expect(houseSpecFor(3).wings).toBe(2);
  });
});

describe("lampPlacements", () => {
  test("three lamps sit on the front edge, spanning the gate", () => {
    const farm = farmExtents([6]);
    const lamps = lampPlacements(farm);
    expect(lamps).toHaveLength(3);
    const maxZ = farm.center[1] + farm.depth / 2;
    for (const lamp of lamps) {
      expect(lamp.position[2]).toBeGreaterThan(maxZ - 0.01);
      expect(lamp.position[2]).toBeLessThan(maxZ + 3.01);
      // spread across the width, none inside the gate gap center
      expect(Math.abs(lamp.position[0] - farm.center[0])).toBeGreaterThan(1);
    }
    // left, middle-right, right — ordered so instancing stays stable
    expect(lamps[0].position[0]).toBeLessThan(lamps[1].position[0]);
    expect(lamps[1].position[0]).toBeLessThan(lamps[2].position[0]);
  });
});
