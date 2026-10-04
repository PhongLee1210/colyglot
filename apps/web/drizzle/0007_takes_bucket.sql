INSERT INTO "storage"."buckets" ("id", "name", "public", "file_size_limit", "allowed_mime_types")
VALUES ('takes', 'takes', false, 2097152, ARRAY['audio/webm']::text[])
ON CONFLICT ("id") DO UPDATE
  SET "public" = false,
      "file_size_limit" = 2097152,
      "allowed_mime_types" = ARRAY['audio/webm']::text[];--> statement-breakpoint
-- Grants for the service role are pre-provisioned by Supabase on every
-- storage.buckets row; no extra storage.objects policies are needed because
-- all reads/writes go through the server-side admin client.
