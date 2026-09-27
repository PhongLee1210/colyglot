CREATE TABLE "user_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"music_volume" integer DEFAULT 20 NOT NULL,
	"music_muted" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_settings_music_volume_check" CHECK ("user_settings"."music_volume" between 0 and 100)
);
