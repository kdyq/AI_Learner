import { NextResponse } from "next/server";
import { recordEvent } from "@/lib/study";

export const runtime = "nodejs";

type Body = {
  type: "chat" | "quiz" | "review" | "upload" | "flashcard";
  courseId?: string;
  durationSec?: number;
  meta?: Record<string, unknown>;
};

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  if (!body.type) return NextResponse.json({ error: "缺少 type" }, { status: 400 });
  recordEvent(body.type, { courseId: body.courseId, durationSec: body.durationSec, meta: body.meta });
  return NextResponse.json({ ok: true });
}
