import { NextResponse } from "next/server";
import { buildRepracticeSet } from "@/lib/quiz/generate";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { courseId } = (await req.json().catch(() => ({}))) as { courseId?: string };
  try {
    const result = await buildRepracticeSet(courseId);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
