// Identity tiers gate exactly one thing: how many cards a player may own.
// Everything else — audio takes, harvests, shop, streaks — is identical
// across tiers, so nothing else may branch on this type.
export type UserTier = "STANDARD" | "EARLY_ACCESS";

// The single EARLY_ACCESS limitation: total cards across all decks.
// Past the cap the player must upgrade; planting is blocked, nothing is
// deleted.
export const EARLY_ACCESS_CARD_LIMIT = 50;
