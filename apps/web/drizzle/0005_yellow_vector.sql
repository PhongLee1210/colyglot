CREATE TABLE "farm_sweep_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"lang_key" text NOT NULL,
	"day_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "farm_sweep_days_user_lang_day_key" UNIQUE("user_id","lang_key","day_key")
);
--> statement-breakpoint
ALTER TABLE "farm_beds" ADD COLUMN "kind" text DEFAULT 'garden' NOT NULL;--> statement-breakpoint
CREATE INDEX "farm_sweep_days_user_lang_idx" ON "farm_sweep_days" USING btree ("user_id","lang_key");