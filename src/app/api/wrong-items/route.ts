import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { courses, questions, wrongItems } from "@/db/schema";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const courseId = url.searchParams.get("courseId");
  const includeResolved = url.searchParams.get("all") === "1";
  const base = db
    .select({
      id: wrongItems.id,
      questionId: wrongItems.questionId,
      courseId: wrongItems.courseId,
      wrongCount: wrongItems.wrongCount,
      lastWrongAt: wrongItems.lastWrongAt,
      reason: wrongItems.reason,
      resolved: wrongItems.resolved,
      type: questions.type,
      stem: questions.stem,
      options: questions.options,
      explanation: questions.explanation,
      courseName: courses.name,
      courseColor: courses.color,
    })
    .from(wrongItems)
    .innerJoin(questions, eq(wrongItems.questionId, questions.id))
    .innerJoin(courses, eq(wrongItems.courseId, courses.id))
    .orderBy(desc(wrongItems.lastWrongAt))
    .all();
  const list = base.filter((r) => (includeResolved ? true : !r.resolved)).filter((r) => !courseId || r.courseId === courseId);
  return NextResponse.json({ items: list });
}
