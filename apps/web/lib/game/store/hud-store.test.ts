import { beforeEach, describe, expect, test } from "bun:test";

import { DEFAULT_PANEL_TAB, useHudStore } from "./hud-store";

function resetHud() {
  useHudStore.setState({ openTab: null, lastTab: DEFAULT_PANEL_TAB });
}

describe("hud store", () => {
  beforeEach(resetHud);

  test("starts with the panel closed", () => {
    expect(useHudStore.getState().openTab).toBeNull();
  });

  test("opening a tab remembers it as the last tab", () => {
    useHudStore.getState().openPanel("progress");
    expect(useHudStore.getState().openTab).toBe("progress");
    useHudStore.getState().closePanel();
    expect(useHudStore.getState().openTab).toBeNull();
    expect(useHudStore.getState().lastTab).toBe("progress");
  });

  test("toggle without a tab reopens the last tab", () => {
    useHudStore.getState().openPanel("orders");
    useHudStore.getState().togglePanel();
    expect(useHudStore.getState().openTab).toBeNull();
    useHudStore.getState().togglePanel();
    expect(useHudStore.getState().openTab).toBe("orders");
  });

  test("toggle to a different tab switches instead of closing", () => {
    useHudStore.getState().openPanel("seeds");
    useHudStore.getState().togglePanel("workshop");
    expect(useHudStore.getState().openTab).toBe("workshop");
  });
});
