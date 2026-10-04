import { eq } from "drizzle-orm";

import type { UserTier } from "@/lib/game/core/access";

import { getDb } from "../index";
import { userAccounts } from "../schema";

// Idempotent: an existing row always wins, so a re-run can never demote
// an already-upgraded account back to EARLY_ACCESS.
export async function ensureUserAccount(
  userId: string,
  tier: UserTier
): Promise<void> {
  await getDb()
    .insert(userAccounts)
    .values({ userId, tier })
    .onConflictDoNothing();
}

// Fail closed: every auth entry point guarantees a row, so a missing row
// is an anomaly — keep the card cap enforced rather than granting
// unlimited play.
export async function getUserTier(userId: string): Promise<UserTier> {
  const [row] = await getDb()
    .select({ tier: userAccounts.tier })
    .from(userAccounts)
    .where(eq(userAccounts.userId, userId))
    .limit(1);
  return row?.tier ?? "EARLY_ACCESS";
}

export async function promoteToStandard(userId: string): Promise<void> {
  await getDb()
    .insert(userAccounts)
    .values({ userId, tier: "STANDARD", upgradedAt: new Date() })
    .onConflictDoUpdate({
      target: userAccounts.userId,
      set: { tier: "STANDARD", upgradedAt: new Date() },
    });
}
