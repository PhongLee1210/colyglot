import { mkdir, readdir, rename } from "node:fs/promises";
import path from "node:path";

import postgres from "postgres";

// One-off runbook script: moves flat local takes (.data/takes/<cardId>.webm)
// into the per-user layout (.data/takes/<userId>/<cardId>.webm) introduced by
// Epic 5. Run with:
//   bun --env-file=.env scripts/migrate-local-takes.ts <ownerUserId>
const ownerUserId = process.argv[2];
if (!ownerUserId) {
  console.error(
    "usage: bun --env-file=.env scripts/migrate-local-takes.ts <ownerUserId>"
  );
  process.exit(1);
}

const takesDir = path.join(process.cwd(), ".data", "takes");
const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });

try {
  const entries = await readdir(takesDir).catch(() => [] as string[]);
  const files = entries.filter(
    (name) => name.endsWith(".webm") && !name.includes(ownerUserId)
  );
  if (files.length === 0) {
    console.log("no flat takes to migrate");
  } else {
    await mkdir(path.join(takesDir, ownerUserId), { recursive: true });
    for (const file of files) {
      await rename(
        path.join(takesDir, file),
        path.join(takesDir, ownerUserId, file)
      );
    }
    console.log(`moved ${files.length} take(s) into ${ownerUserId}/`);
  }
  const updated = await sql`
    update card_recordings
    set storage_path = 'takes/' || ${ownerUserId} || '/' || card_id || '.webm'
    where storage_path = 'takes/' || card_id || '.webm'
    returning id
  `;
  console.log(`updated ${updated.length} storage path(s)`);
} finally {
  await sql.end();
}
