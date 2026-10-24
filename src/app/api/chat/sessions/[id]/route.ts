import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { chatSessions } from "@/db/schema";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  db.delete(chatSessions).where(eq(chatSessions.id, id)).run();
  return NextResponse.json({ ok: true });
}
