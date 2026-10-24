import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  chunks as chunksTable,
  documents,
  knowledgePoints,
  questions as questionsTable,
  quizSets,
  type QuizConfig,
} from "@/db/schema";
import { callJson } from "@/lib/ai/json";
import { QuestionsSchema } from "@/lib/ai/schemas";
import { QUIZ_PROMPT } from "@/lib/ai/prompts";

export type GenerateOptions = {
  courseId: string;
  scope: "course" | "document" | "knowledge";
  targetId?: string;
  types: string[]; // single|multiple|fill|judge|short 的子集
  count: number;
  difficulty: number; // 1-5
};

function capRows(
  rows: { id: string; content: string }[],
  maxChars = 9000
) {
  const out: typeof rows = [];
  let total = 0;
  for (const r of rows) {
    const content = r.content.length > 800 ? r.content.slice(0, 800) + "…" : r.content;
    if (total + content.length > maxChars) break;
    out.push({ ...r, content });
    total += content.length;
  }
  return out;
}

/** 出题：按范围检索块 → AI 结构化生成 → 入库 quiz_set + questions */
export async function generateQuiz(opts: GenerateOptions): Promise<{ quizSetId: string; created: number }> {
  let rows: { id: string; content: string }[] = [];
  let scopeLabel = "全课程";

  if (opts.scope === "document" && opts.targetId) {
    const doc = db.select().from(documents).where(eq(documents.id, opts.targetId)).get();
    if (!doc) throw new Error("文档不存在");
    scopeLabel = doc.title;
    rows = capRows(
      db
        .select({ id: chunksTable.id, content: chunksTable.content })
        .from(chunksTable)
        .where(eq(chunksTable.documentId, opts.targetId))
        .orderBy(asc(chunksTable.seq))
        .all()
    );
  } else if (opts.scope === "knowledge" && opts.targetId) {
    // 按知识点：取其 sourceChunkIds，不足则补 BM25 检索知识点标题
    const kp = db.select().from(knowledgePoints).where(eq(knowledgePoints.id, opts.targetId)).get();
    if (!kp) throw new Error("知识点不存在");
    scopeLabel = kp.title;
    const ids = kp.sourceChunkIds ?? [];
    rows = ids.length
      ? capRows(
          db
            .select({ id: chunksTable.id, content: chunksTable.content })
            .from(chunksTable)
            .where(inArray(chunksTable.id, ids))
            .all()
        )
      : [];
    if (rows.length < 2) {
      const { retrieve } = await import("@/lib/retrieval/hybrid");
      const found = await retrieve(opts.courseId, kp.title + " " + kp.keywords.join(" "), 6);
      rows = capRows(found.map((f) => ({ id: f.chunkId, content: f.content })));
    }
  } else {
    rows = capRows(
      db
        .select({ id: chunksTable.id, content: chunksTable.content })
        .from(chunksTable)
        .where(eq(chunksTable.courseId, opts.courseId))
        .orderBy(asc(chunksTable.seq))
        .all()
    );
  }

  if (rows.length === 0) throw new Error("该范围没有可用的文本分块（先上传并解析资料）");

  const numbered = rows.map((r, i) => `[${i + 1}] ${r.content}`).join("\n\n");
  const typeNote = opts.types.length
    ? `本次只需要这些题型：${opts.types.join("、")}。`
    : "";
  const generated = await callJson(QuestionsSchema, [
    {
      role: "user",
      content: `出题要求：共 ${opts.count} 道，整体难度 ${opts.difficulty}/5（1 最易 5 最难）。${typeNote}\n\n${QUIZ_PROMPT}${numbered}`,
    },
  ]);

  const now = Date.now();
  const quizSetId = crypto.randomUUID();
  const config: QuizConfig = {
    types: opts.types.length ? opts.types : generated.map((q) => q.type),
    count: generated.length,
    difficulty: opts.difficulty,
    scope: scopeLabel,
  };
  db.insert(quizSets)
    .values({ id: quizSetId, courseId: opts.courseId, title: `${scopeLabel} · 练习`, config, createdAt: now })
    .run();

  db.insert(questionsTable)
    .values(
      generated.map((q) => ({
        id: crypto.randomUUID(),
        quizSetId,
        courseId: opts.courseId,
        knowledgePointId:
          opts.scope === "knowledge" && opts.targetId ? opts.targetId : null,
        type: q.type,
        stem: q.stem,
        options: q.options ?? null,
        answer: q.answer,
        explanation: q.explanation,
        difficulty: q.difficulty,
        sourceChunkIds: q.sourceIndexes
          .map((n) => rows[n - 1]?.id)
          .filter((x): x is string => Boolean(x)),
        createdAt: now,
      }))
    )
    .run();

  return { quizSetId, created: generated.length };
}

/** 错题重练：把指定课程未解决的错题组成新题组 */
export async function buildRepracticeSet(courseId?: string): Promise<{ quizSetId: string; count: number }> {
  const { wrongItems, questions } = await import("@/db/schema");
  let rows = db
    .select({ questionId: wrongItems.questionId })
    .from(wrongItems)
    .where(eq(wrongItems.resolved, false))
    .all();
  if (courseId) {
    const qIds = rows.map((r) => r.questionId);
    const valid = qIds.length
      ? db
          .select({ id: questions.id })
          .from(questions)
          .where(inArray(questions.id, qIds))
          .all()
          .filter((q) => {
            const full = db.select().from(questions).where(eq(questions.id, q.id)).get();
            return full?.courseId === courseId;
          })
          .map((q) => q.id)
      : [];
    rows = rows.filter((r) => valid.includes(r.questionId));
  }
  if (rows.length === 0) throw new Error("没有待重练的错题");

  const now = Date.now();
  const quizSetId = crypto.randomUUID();
  const course = rows.length
    ? db.select().from(questions).where(eq(questions.id, rows[0].questionId)).get()?.courseId ?? courseId ?? ""
    : courseId ?? "";
  db.insert(quizSets)
    .values({
      id: quizSetId,
      courseId: course,
      title: "错题重练",
      config: { types: [], count: rows.length, difficulty: 3, scope: "错题" },
      createdAt: now,
    })
    .run();
  // 重练题：复制为新题目行挂到新题组（避免改原题组统计）
  for (const r of rows) {
    const q = db.select().from(questions).where(eq(questions.id, r.questionId)).get();
    if (!q) continue;
    db.insert(questions)
      .values({ ...q, id: crypto.randomUUID(), quizSetId, createdAt: now })
      .run();
  }
  const count = db.select().from(questions).where(eq(questions.quizSetId, quizSetId)).all().length;
  return { quizSetId, count };
}
