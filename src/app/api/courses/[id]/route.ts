import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { courses } from "@/db/schema";

export const runtime = "nodejs";

const COLORS = ["mint", "sky", "peach", "lemon", "rose"] as const;

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = (await req.json()) as { name?: string; description?: string; color?: string };
  const patch: Record<string, unknown> = { updatedAt: Date.now() };
  if (body.name !== undefined) {
    if (!body.name.trim()) return NextResponse.json({ error: "课程名不能为空" }, { status: 400 });
    patch.name = body.name.trim();
  }
  if (body.description !== undefined) patch.description = body.description.trim();
  if (body.color !== undefined) {
    if (!COLORS.includes(body.color as (typeof COLORS)[number]))
      return NextResponse.json({ error: "非法课程色" }, { status: 400 });
    patch.color = body.color;
  }
  db.update(courses).set(patch).where(eq(courses.id, id)).run();
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  db.delete(courses).where(eq(courses.id, id)).run();
  return NextResponse.json({ ok: true });
}
