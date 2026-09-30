ALTER TABLE "cards" ADD COLUMN "graduated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "farm_beds" ADD COLUMN "region_key" text DEFAULT 'homestead' NOT NULL;--> statement-breakpoint
ALTER TABLE "review_logs" ADD COLUMN "elapsed_ms" integer;--> statement-breakpoint
ALTER TABLE "review_logs" ADD COLUMN "hesitated" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "ui_lang" text DEFAULT 'vi' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_ui_lang_check" CHECK ("user_settings"."ui_lang" in ('en', 'vi'));--> statement-breakpoint
-- Backfill: cards that already graduated under the old derivation
-- (interval >= 21 and not sitting in a plot) become explicit Forest trees.
UPDATE "cards" SET "graduated_at" = now()
WHERE EXISTS (SELECT 1 FROM "card_schedules" s WHERE s.card_id = "cards"."id" AND s.interval_days >= 21)
  AND NOT EXISTS (SELECT 1 FROM "farm_plots" p WHERE p.card_id = "cards"."id");--> statement-breakpoint
-- Worlds with any graduated tree have used up the 15-day first-graduation
-- exception (GAME_PLAY §10.2).
UPDATE "farm_worlds" w SET "stats" = jsonb_set(w.stats, '{firstGraduation}', 'true'::jsonb)
WHERE EXISTS (
  SELECT 1 FROM "cards" c
  JOIN "card_schedules" s ON s.card_id = c.id AND s.interval_days >= 21
  JOIN "decks" d ON d.id = c.deck_id AND d.user_id = w.user_id
  WHERE c.graduated_at IS NOT NULL
);