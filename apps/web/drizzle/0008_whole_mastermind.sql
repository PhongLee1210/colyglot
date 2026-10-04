CREATE TABLE "user_accounts" (
	"user_id" text PRIMARY KEY NOT NULL,
	"tier" text DEFAULT 'EARLY_ACCESS' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"upgraded_at" timestamp with time zone,
	CONSTRAINT "user_accounts_tier_check" CHECK ("user_accounts"."tier" in ('STANDARD', 'EARLY_ACCESS'))
);--> statement-breakpoint
-- Backfill: every existing user predates early access, so they keep
-- unlimited play as STANDARD rather than inheriting the column default.
insert into "user_accounts" ("user_id", "tier")
select distinct "user_id", 'STANDARD'
from (
  select "user_id" from "decks"
  union select "user_id" from "farm_worlds"
  union select "user_id" from "study_sessions"
  union select "user_id" from "user_settings"
) existing
on conflict ("user_id") do nothing;
