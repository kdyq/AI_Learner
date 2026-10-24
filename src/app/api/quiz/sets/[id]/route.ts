import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { questions, quizSets } from "@/db/schema";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** 题组详情：答题前不下发 answer/explanation（防作弊，提交后由 submit 返回） */
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const set = db.select().from(quizSets).where(eq(quizSets.id, id)).get();
  if (!set) return NextResponse.json({ error: "题组不存在" }, { status: 404 });
  const rows = db.select().from(questions).where(eq(questions.quizSetId, id)).orderBy(asc(questions.createdAt)).all();
  return NextResponse.json({
    set: { id: set.id, title: set.title, config: set.config, courseId: set.courseId, createdAt: set.createdAt },
    questions: rows.map((q) => ({
      id: q.id,
      type: q.type,
      stem: q.stem,
      options: q.options,
      difficulty: q.difficulty,
    })),
  });
}
