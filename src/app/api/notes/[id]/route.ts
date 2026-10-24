import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { notes } from "@/db/schema";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const { title, content } = (await req.json()) as { title?: string; content?: string };
  const patch: Record<string, unknown> = { updatedAt: Date.now() };
  if (title !== undefined) patch.title = title.trim();
  if (content !== undefined) patch.content = content;
  db.update(notes).set(patch).where(eq(notes.id, id)).run();
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  db.delete(notes).where(eq(notes.id, id)).run();
  return NextResponse.json({ ok: true });
}
