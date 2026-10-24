import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { wrongItems } from "@/db/schema";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Ctx) {
  const { id } = await params;
  db.update(wrongItems)
    .set({ resolved: true, updatedAt: Date.now() })
    .where(eq(wrongItems.id, id))
    .run();
  return NextResponse.json({ ok: true });
}
