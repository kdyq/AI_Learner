import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { courses, quizSets } from "@/db/schema";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const courseId = new URL(req.url).searchParams.get("courseId");
  const rows = db
    .select({
      id: quizSets.id,
      title: quizSets.title,
      config: quizSets.config,
      createdAt: quizSets.createdAt,
      courseId: quizSets.courseId,
      courseName: courses.name,
      courseColor: courses.color,
    })
    .from(quizSets)
    .innerJoin(courses, eq(quizSets.courseId, courses.id))
    .orderBy(desc(quizSets.createdAt))
    .limit(50)
    .all();
  const list = courseId ? rows.filter((r) => r.courseId === courseId) : rows;
  return NextResponse.json({ sets: list });
}
