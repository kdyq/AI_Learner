import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { chatSessions } from "@/db/schema";

export const runtime = "nodejs";

export async function GET() {
  const rows = db.select().from(chatSessions).orderBy(desc(chatSessions.updatedAt)).all();
  return NextResponse.json({ sessions: rows });
}

export async function POST(req: Request) {
  const { courseId, title, mode } = (await req.json().catch(() => ({}))) as {
    courseId?: string;
    title?: string;
    mode?: "rag" | "feynman" | "socratic";
  };
  const row = {
    id: crypto.randomUUID(),
    courseId: courseId ?? null,
    title: title?.slice(0, 30) || "新会话",
    mode: mode ?? "rag",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  db.insert(chatSessions).values(row).run();
  return NextResponse.json({ session: row }, { status: 201 });
}
