import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { questions, quizSets } from "@/db/schema";
import { QuizRunner, type RunnerQuestion } from "@/components/quiz/quiz-runner";

export const dynamic = "force-dynamic";

export default async function QuizSetPage({
  params,
}: PageProps<"/quiz/[setId]">) {
  const { setId } = await params;
  const set = db.select().from(quizSets).where(eq(quizSets.id, setId)).get();
  if (!set) notFound();
  const rows = db
    .select()
    .from(questions)
    .where(eq(questions.quizSetId, setId))
    .orderBy(asc(questions.createdAt))
    .all();
  if (rows.length === 0) notFound();

  return (
    <QuizRunner
      quizSetId={set.id}
      setTitle={set.title}
      questions={rows.map((q) => ({
        id: q.id,
        type: q.type,
        stem: q.stem,
        options: q.options ?? null,
        difficulty: q.difficulty,
      })) as RunnerQuestion[]}
    />
  );
}
