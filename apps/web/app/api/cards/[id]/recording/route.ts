import { NextResponse } from "next/server";

import { getUserId } from "@/lib/auth/session";
import {
  getCard,
  getCardRecording,
  saveCardRecording,
} from "@/lib/db/repositories/content";
import { readTake, saveTake } from "@/lib/storage/takes";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: "Invalid card id" }, { status: 400 });
  }

  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const card = await getCard(userId, id);
  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  const form = await request.formData().catch(() => null);
  const take = form?.get("take");
  if (!(take instanceof File)) {
    return NextResponse.json({ error: "Missing take file" }, { status: 400 });
  }

  try {
    const bytes = Buffer.from(await take.arrayBuffer());
    const storagePath = await saveTake(userId, id, bytes);
    const durationHeader = request.headers.get("x-take-duration-ms");
    const durationMs = durationHeader ? Number.parseInt(durationHeader, 10) : 0;
    await saveCardRecording(userId, {
      cardId: id,
      storagePath,
      durationMs: Number.isFinite(durationMs) ? durationMs : 0,
    });
    return NextResponse.json({ ok: true, storagePath });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: "Invalid card id" }, { status: 400 });
  }

  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const recording = await getCardRecording(userId, id).catch(() => undefined);
  if (!recording) {
    return NextResponse.json(
      { error: "No take for this card" },
      { status: 404 }
    );
  }
  const stored = await readTake(userId, id);
  if (!stored) {
    return NextResponse.json(
      { error: "No take for this card" },
      { status: 404 }
    );
  }
  return new NextResponse(new Uint8Array(stored.bytes), {
    headers: {
      "content-type": stored.contentType,
      "cache-control": "no-store",
    },
  });
}

export async function HEAD(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) {
    return new NextResponse(null, { status: 400 });
  }

  const userId = await getUserId();
  if (!userId) {
    return new NextResponse(null, { status: 401 });
  }
  const recording = await getCardRecording(userId, id).catch(() => undefined);
  if (!recording) {
    return new NextResponse(null, { status: 404 });
  }
  const stored = await readTake(userId, id).catch(() => null);
  return new NextResponse(null, { status: stored ? 200 : 404 });
}
