CREATE TABLE "farm_beds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"world_id" uuid NOT NULL,
	"deck_id" uuid NOT NULL,
	"plot_count" integer DEFAULT 6 NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "farm_beds_world_position_key" UNIQUE("world_id","position"),
	CONSTRAINT "farm_beds_deck_id_key" UNIQUE("deck_id")
);
--> statement-breakpoint
CREATE TABLE "farm_harvest_claims" (
	"session_id" uuid PRIMARY KEY NOT NULL,
	"world_id" uuid NOT NULL,
	"gold_awarded" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "farm_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"world_id" uuid NOT NULL,
	"item_key" text NOT NULL,
	"qty" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "farm_items_world_item_key" UNIQUE("world_id","item_key")
);
--> statement-breakpoint
CREATE TABLE "farm_plots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bed_id" uuid NOT NULL,
	"slot_index" integer NOT NULL,
	"card_id" uuid,
	"planted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"variant" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "farm_plots_bed_slot_key" UNIQUE("bed_id","slot_index"),
	CONSTRAINT "farm_plots_card_id_key" UNIQUE("card_id")
);
--> statement-breakpoint
CREATE TABLE "farm_worlds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"lang_key" text NOT NULL,
	"tier" integer DEFAULT 0 NOT NULL,
	"gold" integer DEFAULT 40 NOT NULL,
	"unlocked_techs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"buildings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"stats" jsonb DEFAULT '{"planted":0,"harvested":0,"goldEarned":0}'::jsonb NOT NULL,
	"wonder_progress" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "farm_worlds_user_lang_key" UNIQUE("user_id","lang_key")
);
--> statement-breakpoint
ALTER TABLE "review_logs" ADD COLUMN "interval_days_before" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "farm_beds" ADD CONSTRAINT "farm_beds_world_id_farm_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."farm_worlds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farm_beds" ADD CONSTRAINT "farm_beds_deck_id_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farm_harvest_claims" ADD CONSTRAINT "farm_harvest_claims_session_id_study_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."study_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farm_harvest_claims" ADD CONSTRAINT "farm_harvest_claims_world_id_farm_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."farm_worlds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farm_items" ADD CONSTRAINT "farm_items_world_id_farm_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."farm_worlds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farm_plots" ADD CONSTRAINT "farm_plots_bed_id_farm_beds_id_fk" FOREIGN KEY ("bed_id") REFERENCES "public"."farm_beds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farm_plots" ADD CONSTRAINT "farm_plots_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "farm_harvest_claims_world_id_idx" ON "farm_harvest_claims" USING btree ("world_id");--> statement-breakpoint
CREATE INDEX "farm_worlds_user_id_idx" ON "farm_worlds" USING btree ("user_id");