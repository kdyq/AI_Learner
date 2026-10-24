import { NextResponse } from "next/server";
import { generatePlan } from "@/lib/plan";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const { courseId, examDate } = (await req.json()) as { courseId?: string; examDate?: string };
  if (!courseId || !examDate) {
    return NextResponse.json({ error: "缺少 courseId 或 examDate" }, { status: 400 });
  }
  try {
    const result = await generatePlan(courseId, examDate);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
