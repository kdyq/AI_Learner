import { NextResponse } from "next/server";
import { generateQuiz } from "@/lib/quiz/generate";

export const runtime = "nodejs";
export const maxDuration = 300;

const VALID_TYPES = ["single", "multiple", "fill", "judge", "short"];

export async function POST(req: Request) {
  const body = (await req.json()) as {
    courseId?: string;
    scope?: string;
    targetId?: string;
    types?: string[];
    count?: number;
    difficulty?: number;
  };
  if (!body.courseId) return NextResponse.json({ error: "缺少 courseId" }, { status: 400 });
  const types = (body.types ?? []).filter((t) => VALID_TYPES.includes(t));
  try {
    const result = await generateQuiz({
      courseId: body.courseId,
      scope: (body.scope as "course" | "document" | "knowledge") ?? "course",
      targetId: body.targetId,
      types,
      count: Math.min(20, Math.max(1, body.count ?? 5)),
      difficulty: Math.min(5, Math.max(1, body.difficulty ?? 3)),
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
