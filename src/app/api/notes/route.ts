import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { notes } from "@/db/schema";

export const runtime = "nodejs";

export async function GET() {
  const rows = db.select().from(notes).orderBy(desc(notes.updatedAt)).all();
  return NextResponse.json({ notes: rows });
}

export async function POST(req: Request) {
  const { title, content, courseId } = (await req.json()) as {
    title?: string;
    content?: string;
    courseId?: string;
  };
  if (!title?.trim()) return NextResponse.json({ error: "标题不能为空" }, { status: 400 });
  const now = Date.now();
  const row = {
    id: crypto.randomUUID(),
    courseId: courseId ?? null,
    title: title.trim(),
    content: content ?? "",
    createdAt: now,
    updatedAt: now,
  };
  db.insert(notes).values(row).run();
  return NextResponse.json({ note: row }, { status: 201 });
}
