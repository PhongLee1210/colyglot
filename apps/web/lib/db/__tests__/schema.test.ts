import { describe, expect, test } from "bun:test";

import { STARTING_GOLD } from "@/lib/game/core/economy";
import { farmHarvestClaims, farmWorlds } from "../schema";

describe("farm defaults", () => {
  test("starts every farmer with starting gold on tier 0", () => {
    expect(farmWorlds.gold.default).toBe(STARTING_GOLD);
    expect(farmWorlds.tier.default).toBe(0);
    expect(farmHarvestClaims.sessionId.primary).toBe(true);
  });
});
