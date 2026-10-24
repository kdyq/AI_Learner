import { eq } from "drizzle-orm";
import { db } from "@/db";
import { attempts, questions, quizSets, wrongItems } from "@/db/schema";
import { callJson } from "@/lib/ai/json";
import { QuestionSchema } from "@/lib/ai/schemas";
import { VARIANT_PROMPT, MOCK_EXAM_PROMPT, QUIZ_PROMPT } from "@/lib/ai/prompts";

/** 错题举一反三：基于原题+学生错误生成一道变式题，组成新题组 */
export async function generateVariant(wrongItemId: string): Promise<{ quizSetId: string }> {
  const wrong = db.select().from(wrongItems).where(eq(wrongItems.id, wrongItemId)).get();
  if (!wrong) throw new Error("错题不存在");
  const q = db.select().from(questions).where(eq(questions.id, wrong.questionId)).get();
  if (!q) throw new Error("原题不存在");
  const lastAttempt = db
    .select()
    .from(attempts)
    .where(eq(attempts.questionId, q.id))
    .orderBy(attempts.createdAt)
    .all()
    .at(-1);

  const variant = await callJson(QuestionSchema, [
    {
      role: "user",
      content: `${VARIANT_PROMPT}
【题型】${q.type}；题干：${q.stem}
【选项】${(q.options ?? []).join(" | ") || "无"}
【正确答案】${JSON.stringify(q.answer)}
【学生上次答案】${JSON.stringify(lastAttempt?.userAnswer ?? "未作答")}

${QUIZ_PROMPT}（只需 1 道变式题）`,
    },
  ]);

  const quizSetId = crypto.randomUUID();
  const now = Date.now();
  db.insert(quizSets)
    .values({
      id: quizSetId,
      courseId: wrong.courseId,
      title: `变式练习 · ${q.stem.slice(0, 14)}…`,
      config: { types: [variant.type], count: 1, difficulty: variant.difficulty, scope: "错题变式" },
      createdAt: now,
    })
    .run();
  db.insert(questions)
    .values({
      id: crypto.randomUUID(),
      quizSetId,
      courseId: wrong.courseId,
      knowledgePointId: q.knowledgePointId,
      type: variant.type,
      stem: variant.stem,
      options: variant.options ?? null,
      answer: variant.answer,
      explanation: variant.explanation,
      difficulty: variant.difficulty,
      sourceChunkIds: q.sourceChunkIds ?? [],
      createdAt: now,
    })
    .run();
  return { quizSetId };
}

/** 考前冲刺模拟卷：薄弱点占比 ≥40%，难度递增，限时 */
export async function generateMockExam(
  courseId: string,
  count = 10,
  timeLimitMin = 45
): Promise<{ quizSetId: string; created: number }> {
  const { chunks: chunksTable, documents, knowledgePoints } = await import("@/db/schema");
  const { asc } = await import("drizzle-orm");
  const courseRows = db.select().from(documents).where(eq(documents.courseId, courseId)).all();

  const wrongs = db
    .select({ stem: questions.stem, explanation: questions.explanation })
    .from(wrongItems)
    .innerJoin(questions, eq(wrongItems.questionId, questions.id))
    .where(eq(wrongItems.resolved, false))
    .all();
  const weakKps = db
    .select()
    .from(knowledgePoints)
    .where(eq(knowledgePoints.courseId, courseId))
    .all()
    .filter((k) => k.mastery < 40)
    .sort((a, b) => a.mastery - b.mastery);

  const weakText = [
    ...wrongs.slice(0, 8).map((w) => `- 错题：${w.stem.slice(0, 60)}`),
    ...weakKps.slice(0, 8).map((k) => `- 薄弱知识点：${k.title}（掌握 ${k.mastery}%）`),
  ].join("\n");

  const chunkRows = db
    .select({ id: chunksTable.id, content: chunksTable.content })
    .from(chunksTable)
    .where(eq(chunksTable.courseId, courseId))
    .orderBy(asc(chunksTable.seq))
    .all()
    .slice(0, 14)
    .map((c) => ({ ...c, content: c.content.slice(0, 700) }));

  if (chunkRows.length === 0) throw new Error("课程没有资料分块");

  const generated = await callJson(
    (await import("@/lib/ai/schemas")).QuestionsSchema,
    [
      {
        role: "user",
        content: `出 ${count} 道题组成模拟卷。\n\n${MOCK_EXAM_PROMPT}${weakText || "（暂无明确薄弱点）"}\n\n${QUIZ_PROMPT}\n【课程资料片段】\n${chunkRows.map((c, i) => `[${i + 1}] ${c.content}`).join("\n\n")}`,
      },
    ]
  );

  const quizSetId = crypto.randomUUID();
  const now = Date.now();
  const course_ = courseRows[0]?.courseId ?? courseId;
  db.insert(quizSets)
    .values({
      id: quizSetId,
      courseId: course_,
      title: `考前冲刺模拟卷 · ${count} 题 · 限时 ${timeLimitMin} 分钟`,
      config: { types: generated.map((g) => g.type), count: generated.length, difficulty: 4, scope: "模拟卷", timeLimitMin },
      createdAt: now,
    })
    .run();
  db.insert(questions)
    .values(
      generated.map((g) => ({
        id: crypto.randomUUID(),
        quizSetId,
        courseId: course_,
        knowledgePointId: null,
        type: g.type,
        stem: g.stem,
        options: g.options ?? null,
        answer: g.answer,
        explanation: g.explanation,
        difficulty: g.difficulty,
        sourceChunkIds: g.sourceIndexes
          .map((n) => chunkRows[n - 1]?.id)
          .filter((x): x is string => Boolean(x)),
        createdAt: now,
      }))
    )
    .run();
  return { quizSetId, created: generated.length };
}
