import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { courses, questions, wrongItems } from "@/db/schema";
import { WrongBookClient, type WrongRow } from "@/components/wrong-book/wrong-book-client";

export const dynamic = "force-dynamic";

export default async function WrongBookPage() {
  const rows = db
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
    })
    .from(wrongItems)
    .innerJoin(questions, eq(wrongItems.questionId, questions.id))
    .innerJoin(courses, eq(wrongItems.courseId, courses.id))
    .orderBy(desc(wrongItems.lastWrongAt))
    .all();

  return <WrongBookClient initial={rows as WrongRow[]} />;
}
