import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { useFxStore, type HarvestFxInput } from "@/lib/game/store/fx-store";

const ENTRIES: HarvestFxInput[] = [
  {
    key: "b1:0",
    bedId: "b1",
    slotIndex: 0,
    hanzi: "谢谢",
    stage: "ready",
  },
];

describe("fx-store", () => {
  beforeEach(() => {
    useFxStore.setState({
      motionScale: 1,
      harvests: [],
      coinOrigins: [],
      coinFlights: [],
      reaction: null,
    });
  });

  afterEach(() => {
    useFxStore.setState({
      motionScale: 1,
      harvests: [],
      coinOrigins: [],
      coinFlights: [],
      reaction: null,
    });
  });

  test("celebrateHarvest spawns ghosts, coin origins, and a cheer", () => {
    useFxStore.getState().celebrateHarvest(ENTRIES, 12);
    const state = useFxStore.getState();
    expect(state.harvests).toHaveLength(1);
    expect(state.harvests[0].key).toBe("b1:0");
    expect(typeof state.harvests[0].startedAt).toBe("number");
    expect(state.coinOrigins).toEqual([{ key: "b1:0", amount: 12 }]);
    expect(state.reaction?.clip).toBe("cheer");
  });

  test("reduced motion suppresses the whole celebration", () => {
    useFxStore.getState().setMotionScale(0);
    useFxStore.getState().celebrateHarvest(ENTRIES, 12);
    const state = useFxStore.getState();
    expect(state.harvests).toHaveLength(0);
    expect(state.coinOrigins).toHaveLength(0);
    expect(state.reaction).toBeNull();
  });

  test("harvests reap once their window passes", () => {
    useFxStore.getState().celebrateHarvest(ENTRIES, 6);
    const startedAt = useFxStore.getState().harvests[0].startedAt;
    useFxStore.getState().reapHarvests(startedAt + 500, 800);
    expect(useFxStore.getState().harvests).toHaveLength(1);
    useFxStore.getState().reapHarvests(startedAt + 900, 800);
    expect(useFxStore.getState().harvests).toHaveLength(0);
  });

  test("takeCoinOrigins drains pending projections exactly once", () => {
    useFxStore.getState().celebrateHarvest(ENTRIES, 6);
    const first = useFxStore.getState().takeCoinOrigins();
    expect(first).toHaveLength(1);
    expect(useFxStore.getState().takeCoinOrigins()).toHaveLength(0);
  });

  test("coin flights settle one at a time", () => {
    const { addCoinFlights, settleCoinFlight } = useFxStore.getState();
    addCoinFlights([
      { id: 1, x: 10, y: 20, amount: 4 },
      { id: 2, x: 30, y: 40, amount: 6 },
    ]);
    settleCoinFlight(1);
    expect(useFxStore.getState().coinFlights).toEqual([
      { id: 2, x: 30, y: 40, amount: 6 },
    ]);
    settleCoinFlight(2);
    expect(useFxStore.getState().coinFlights).toHaveLength(0);
  });

  test("reactions re-trigger with fresh ids and respect reduced motion", () => {
    useFxStore.getState().react("wave");
    const first = useFxStore.getState().reaction;
    expect(first?.clip).toBe("wave");
    useFxStore.getState().react("wave");
    expect(useFxStore.getState().reaction?.id).toBeGreaterThan(first!.id);
    useFxStore.getState().setMotionScale(0);
    useFxStore.getState().react("hop");
    expect(useFxStore.getState().reaction?.clip).toBe("wave");
  });
});
