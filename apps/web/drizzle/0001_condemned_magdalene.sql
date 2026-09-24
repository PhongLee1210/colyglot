ALTER TABLE "study_sessions" ADD COLUMN "user_id" text;--> statement-breakpoint
-- Backfill owner = Supabase auth.users id for phonglee1210@gmail.com (epic 5.2.2).
UPDATE "decks" SET "user_id" = 'c1536e50-4a16-4b4f-942e-d2aabcce2bfb' WHERE "user_id" = 'local';--> statement-breakpoint
UPDATE "study_sessions" SET "user_id" = 'c1536e50-4a16-4b4f-942e-d2aabcce2bfb' WHERE "user_id" IS NULL;--> statement-breakpoint
ALTER TABLE "study_sessions" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "decks" ALTER COLUMN "user_id" DROP DEFAULT;--> statement-breakpoint
CREATE INDEX "study_sessions_user_id_idx" ON "study_sessions" USING btree ("user_id");
