import { describe, expect, test } from "bun:test";

import { useSceneStore } from "./scene-store";

describe("useSceneStore", () => {
  test("starts not ready and becomes ready idempotently", () => {
    expect(useSceneStore.getState().sceneReady).toBe(false);
    useSceneStore.getState().markSceneReady();
    useSceneStore.getState().markSceneReady();
    expect(useSceneStore.getState().sceneReady).toBe(true);
  });
});
