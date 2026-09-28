import { describe, expect, test } from "bun:test";

import { cropGeometries, cropHeight } from "./geometry-factory";

describe("cropGeometries", () => {
  test("builds one merged geometry per stage with vertex colors", () => {
    const set = cropGeometries("#e07b2a");
    for (const stage of ["fresh", "growing", "ready", "urgent"] as const) {
      const geometry = set[stage];
      expect(geometry.getAttribute("position")).toBeDefined();
      expect(geometry.getAttribute("color")).toBeDefined();
      expect(geometry.getAttribute("position").count).toBeGreaterThan(10);
    }
  });

  test("crops grow taller until they wilt", () => {
    expect(cropHeight("fresh")).toBeLessThan(cropHeight("growing"));
    expect(cropHeight("growing")).toBeLessThan(cropHeight("ready"));
    expect(cropHeight("urgent")).toBeLessThan(cropHeight("ready"));
  });

  test("geometries are cached per accent color", () => {
    expect(cropGeometries("#e07b2a")).toBe(cropGeometries("#e07b2a"));
    expect(cropGeometries("#ff0000")).not.toBe(cropGeometries("#e07b2a"));
  });

  test("ready geometry bounding height matches the ready stage height", () => {
    const set = cropGeometries("#e07b2a");
    set.ready.computeBoundingBox();
    expect(set.ready.boundingBox!.max.y).toBeGreaterThan(0.8);
  });
});
