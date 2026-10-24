import { NextResponse } from "next/server";
import { generateMockExam } from "@/lib/quiz/variant";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const { courseId, count, timeLimitMin } = (await req.json()) as {
    courseId?: string;
    count?: number;
    timeLimitMin?: number;
  };
  if (!courseId) return NextResponse.json({ error: "缺少 courseId" }, { status: 400 });
  try {
    const result = await generateMockExam(
      courseId,
      Math.min(20, Math.max(5, count ?? 10)),
      Math.min(120, Math.max(15, timeLimitMin ?? 45))
    );
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
