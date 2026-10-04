import { eq } from "drizzle-orm";

import { getDb } from "../index";
import {
  decks,
  farmSweepDays,
  farmWorlds,
  studySessions,
  userSettings,
} from "../schema";

// FK cascades tear down cards, schedules, review logs, beds, plots, items,
// harvest claims, and deck progress with these parent rows. The
// user_accounts tier deliberately survives a reset — it is identity, not
// game data.
export async function resetUserData(userId: string): Promise<void> {
  const db = getDb();
  await db.delete(decks).where(eq(decks.userId, userId));
  await db.delete(farmWorlds).where(eq(farmWorlds.userId, userId));
  await db.delete(farmSweepDays).where(eq(farmSweepDays.userId, userId));
  await db.delete(studySessions).where(eq(studySessions.userId, userId));
  await db.delete(userSettings).where(eq(userSettings.userId, userId));
}
