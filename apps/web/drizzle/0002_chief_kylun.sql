CREATE TABLE "deck_progress" (
	"deck_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "deck_progress_deck_id_key" UNIQUE("deck_id")
);
--> statement-breakpoint
ALTER TABLE "deck_progress" ADD CONSTRAINT "deck_progress_deck_id_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deck_progress_user_id_idx" ON "deck_progress" USING btree ("user_id");