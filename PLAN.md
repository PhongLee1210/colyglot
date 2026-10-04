# Plan: STANDARD + EARLY_ACCESS user tiers

Replace the `DEV_BYPASS_USER_ID` dev-only auth escape hatch with a real,
production-safe anonymous play mode.

Two user tiers:

| Tier           | Identity                                    | Limitation                               |
| -------------- | ------------------------------------------- | ---------------------------------------- |
| `STANDARD`     | Supabase email magic link or Google OAuth   | none                                     |
| `EARLY_ACCESS` | Supabase anonymous sign-in (no credentials) | **50 cards total — the only limitation** |

An `EARLY_ACCESS` player keeps a real, durable session and plays the full
game: every farm, region, shop item, harvest, streak, and **audio take
recording** behaves exactly as it does for a `STANDARD` player. The card
cap is the single difference between the tiers.

## Key findings from exploration

- `plantSeeds` (`lib/db/repositories/farm.ts:560`) is the only path that
  ever creates a card. `createCard` has no non-test callers;
  `startFarmWorld` and `unlockRegion` create decks and beds but no cards.
  One choke point to enforce the cap.
- `userId` is a plain `text` column on every table, with no foreign key to
  `auth.users`. An anonymous Supabase uuid drops in with zero changes to
  any repository.
- Supabase anonymous sign-in mints a real JWT on a real `auth.users` row.
  Upgrading to `STANDARD` is `updateUser({ email })` on the **same uuid**,
  so all farm progress carries over with no data migration.

---

## 1. Constants — new file `lib/game/core/access.ts`

Client-safe layer, so the HUD and `schema.ts` can both read it. Matches the
existing pattern where `schema.ts` imports `STARTING_GOLD` and
`DEFAULT_MUSIC_VOLUME` from `lib/game`.

```ts
export const USER_TIERS = ["STANDARD", "EARLY_ACCESS"] as const;
export type UserTier = (typeof USER_TIERS)[number];
export const EARLY_ACCESS_CARD_LIMIT = 50;
```

## 2. Schema + migration `0008`

New table in `apps/web/lib/db/schema.ts` (the schema lives in exactly one
file — no duplicate model definitions):

```ts
export const userAccounts = pgTable(
  "user_accounts",
  {
    userId: text("user_id").primaryKey(),
    tier: text("tier").$type<UserTier>().notNull().default("EARLY_ACCESS"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    upgradedAt: timestamp("upgraded_at", { withTimezone: true }),
  },
  (table) => [
    check(
      "user_accounts_tier_check",
      sql`${table.tier} in ('STANDARD', 'EARLY_ACCESS')`
    ),
  ]
);

export type UserAccount = typeof userAccounts.$inferSelect;
```

Run `bun run db:generate`, then hand-append the backfill to the generated
SQL. Every existing user predates early access, so all are `STANDARD`:

```sql
insert into user_accounts (user_id, tier)
select distinct user_id from (
  select user_id from decks
  union select user_id from farm_worlds
  union select user_id from study_sessions
  union select user_id from user_settings
) existing
on conflict (user_id) do nothing;

update user_accounts set tier = 'STANDARD' where tier <> 'STANDARD';
```

New repository `lib/db/repositories/user-account.ts`:

- `ensureUserAccount(userId, tier)` — idempotent upsert
- `getUserTier(userId)`
- `promoteToStandard(userId)` — sets `tier` and `upgradedAt`

## 3. Remove the dev bypass

| File                                                           | Action                                          |
| -------------------------------------------------------------- | ----------------------------------------------- |
| `apps/web/lib/auth/dev-bypass.ts`                              | delete                                          |
| `apps/web/lib/auth/session.ts:16-19`                           | drop the bypass branch                          |
| `apps/web/proxy.ts:14-16`                                      | drop the `getDevBypassUserId()` early return    |
| `apps/web/.env.example:10`                                     | drop `DEV_BYPASS_USER_ID`                       |
| `apps/web/scripts/seed-dev-user.ts`                            | delete — it exists only to seed the bypass user |
| `apps/web/package.json` `db:seed:dev` script                   | delete alongside the script                     |
| `docs/superpowers/qa/2026-09-27-language-farm-phase-1-qa.md:4` | update the note                                 |

"Play now" becomes the new dev entry point, so the seed script loses its
purpose.

**Manual step for you:** remove `DEV_BYPASS_USER_ID` from your local
`apps/web/.env`. I will not edit env files.

## 4. Anonymous session path

**Manual prerequisite:** enable Anonymous Sign-Ins in the Supabase
dashboard (Auth -> Providers). Nothing in this plan works without it.

`lib/actions/auth.ts` gains two server actions:

- `startEarlyAccessAction()` — calls `supabase.auth.signInAnonymously()`,
  then `ensureUserAccount(user.id, "EARLY_ACCESS")`.
- `upgradeToStandardAction(email)` — calls
  `supabase.auth.updateUser({ email })` on the live anonymous session. The
  confirmation link lands on `/auth/callback`.

`app/auth/callback/route.ts` — after `exchangeCodeForSession` succeeds,
call `ensureUserAccount(user.id, "STANDARD")` when
`user.email && !user.is_anonymous`. One place covers magic link, Google,
and the anonymous upgrade confirmation. The uuid never changes, so farm
progress carries over with no data migration.

`lib/auth/session.ts`:

- `SessionUser` gains `isAnonymous: boolean`
- new `getUserAccess(): Promise<{ userId: string; tier: UserTier } | null>`,
  React-`cache`d alongside `getCurrentUser`

## 5. Open the front door

`proxy.ts` — `isPublicPath` makes `/` unconditionally public (drop the
`hasLangParam` carve-out). Every other path still redirects to `/sign-in`.

`components/farm/farm-game-screen.tsx:25-27` — stop redirecting when there
is no `userId`. Render `FarmGame` with `initialSnapshot={null}`, all worlds
unstarted, and a new `access` prop typed `"none" | UserTier`.

`components/farm/title-overlay.tsx` — with no session, the CTA reads
**Play now**: `startEarlyAccessAction()` -> `startWorldAction(langKey)` ->
`router.refresh()`. A secondary link to `/sign-in` serves returning
`STANDARD` players.

## 6. Enforce the card cap

`lib/db/repositories/content.ts` — add `countCardsForUser(userId)`
(`cards` inner join `decks` on owner).

`lib/db/repositories/farm.ts` `plantSeeds` — signature gains
`cardLimit: number | null`. Inside the existing transaction, before the
seed loop:

1. `select ... from user_accounts where user_id = $1 for update` —
   serializes concurrent plants for this user, so two parallel requests
   cannot both pass the check.
2. `remaining = cardLimit - countCardsForUser(userId)`, skipped entirely
   when `cardLimit` is null.
3. The loop plants at most `remaining` seeds; the rest join
   `result.skipped`.

`PlantSeedsResult` gains `capReached: boolean` and
`cardsRemaining: number | null`.

`lib/actions/farm.ts` `plantSeedsAction` resolves the tier via
`getUserAccess()` and passes
`tier === "EARLY_ACCESS" ? EARLY_ACCESS_CARD_LIMIT : null`.

## 7. Surface the quota

`FarmWorldSnapshot` (`lib/game/types.ts`) gains:

```ts
access: {
  tier: UserTier;
  cardsUsed: number;
  cardLimit: number | null;
}
```

filled by `loadFarmWorldDetail`.

`components/farm/hud/seeds-tab.tsx` — a "23 / 50 words" chip, plant buttons
disabled at the cap, and a `capReached` toast that opens an upgrade dialog
(email field wired to `upgradeToStandardAction`).

## 8. Explicitly NOT limited for EARLY_ACCESS

These behave identically to `STANDARD` and need no tier check:

- **Audio take recording and playback** —
  `app/api/cards/[id]/recording/route.ts` and `lib/storage/takes.ts` stay
  as they are. Storage paths are already keyed by `userId`, so an anonymous
  player's takes are isolated exactly like anyone else's.
- Harvest sessions, review scheduling, SRS grading
- Gold, shop purchases, building tiers, wonders
- Region unlocks, forest graduation, mastery plaques
- Streaks, sweep days, mementos
- Music settings and UI language

## 9. Validation

Per the validation hierarchy — skipping a level means not complete.

**Level 1/2 — unit and integration** (`bun run test`)

New `lib/db/__tests__/early-access.test.ts`:

- cap blocks the 51st card
- a partial plant fills exactly the remaining quota and skips the rest
- `STANDARD` plants past 50 freely
- `ensureUserAccount` is idempotent
- `promoteToStandard` preserves decks, cards, and farm rows on the same uuid

**Level 3 — E2E** (`bun run test:e2e`)

- rewrite `e2e/auth.spec.ts`: `/` no longer redirects to `/sign-in`; keep
  the off-site `next` rejection and the 401-recording cases
- new `e2e/early-access.spec.ts`: Play now -> farm boots -> cap reached
  toast; plus an anonymous take upload succeeding, to lock in that audio is
  not gated
- `e2e/auth-setup.ts` unchanged — it still exercises the `STANDARD` path
- `playwright.config.ts` — add the new spec to the `anonymous` project's
  `testMatch`

Then `bun run lint`, `bun run typecheck`, `bun run boundaries`.

## 10. Unrelated bug found along the way

`resetUserData` (`lib/db/repositories/user-data.ts`) never deletes
`farm_sweep_days`. Those rows are keyed by `user_id` with no foreign key,
so they survive an E2E reset and leak streaks between runs. Fixing it in
the same pass, together with the new `user_accounts` row.
