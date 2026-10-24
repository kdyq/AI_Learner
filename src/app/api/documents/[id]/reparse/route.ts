import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { enqueueParse } from "@/lib/parsers/queue";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const doc = db.select().from(documents).where(eq(documents.id, id)).get();
  if (!doc) return NextResponse.json({ error: "文档不存在" }, { status: 404 });
  db.update(documents)
    .set({ status: "pending", errorMessage: null, updatedAt: Date.now() })
    .where(eq(documents.id, id))
    .run();
  enqueueParse(id);
  return NextResponse.json({ ok: true });
}
