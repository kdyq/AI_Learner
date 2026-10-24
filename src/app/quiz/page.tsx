import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { courses, documents, knowledgePoints, quizSets } from "@/db/schema";
import { QuizHomeClient } from "@/components/quiz/quiz-home-client";

export const dynamic = "force-dynamic";

export default async function QuizPage() {
  const courseList = db.select({ id: courses.id, name: courses.name }).from(courses).all();
  const docs = db
    .select({ id: documents.id, title: documents.title, courseId: documents.courseId })
    .from(documents)
    .where(eq(documents.status, "ready"))
    .all();
  const kps = db
    .select({ id: knowledgePoints.id, title: knowledgePoints.title, courseId: knowledgePoints.courseId })
    .from(knowledgePoints)
    .all();
  const sets = db
    .select()
    .from(quizSets)
    .innerJoin(courses, eq(quizSets.courseId, courses.id))
    .orderBy(desc(quizSets.createdAt))
    .limit(12)
    .all();

  return (
    <QuizHomeClient
      courses={courseList}
      documents={docs}
      knowledgePoints={kps}
      sets={sets.map((s) => ({
        id: s.quiz_sets.id,
        title: s.quiz_sets.title,
        createdAt: s.quiz_sets.createdAt,
        courseName: s.courses.name,
        config: s.quiz_sets.config,
      }))}
    />
  );
}
