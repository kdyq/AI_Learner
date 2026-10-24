import { NextResponse } from "next/server";
import { submitQuiz, type SubmitAnswer } from "@/lib/quiz/grade";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const { quizSetId, answers } = (await req.json()) as {
    quizSetId?: string;
    answers?: SubmitAnswer[];
  };
  if (!quizSetId || !Array.isArray(answers)) {
    return NextResponse.json({ error: "缺少 quizSetId 或 answers" }, { status: 400 });
  }
  try {
    const result = await submitQuiz(quizSetId, answers);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
