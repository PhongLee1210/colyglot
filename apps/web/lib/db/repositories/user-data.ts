import { eq } from "drizzle-orm";

import { getDb } from "../index";
import { decks, farmWorlds, studySessions, userSettings } from "../schema";

// FK cascades tear down cards, schedules, review logs, beds, plots, items,
// harvest claims, and deck progress with these four parent rows.
export async function resetUserData(userId: string): Promise<void> {
  const db = getDb();
  await db.delete(decks).where(eq(decks.userId, userId));
  await db.delete(farmWorlds).where(eq(farmWorlds.userId, userId));
  await db.delete(studySessions).where(eq(studySessions.userId, userId));
  await db.delete(userSettings).where(eq(userSettings.userId, userId));
}
