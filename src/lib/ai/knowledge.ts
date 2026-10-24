import { asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { chunks as chunksTable, documents, knowledgePoints } from "@/db/schema";
import { chatComplete } from "./chat";
import { callJson } from "./json";
import { KnowledgePointsSchema } from "./schemas";
import { KNOWLEDGE_POINTS_PROMPT, SUMMARIZE_PROMPT } from "./prompts";

/** 单块截断 + 总量截断，控制 prompt 长度 */
function capChunks(
  rows: { id: string; content: string; seq: number }[],
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

function numberedText(rows: { content: string; seq: number }[]): string {
  return rows.map((r, i) => `[${i + 1}] ${r.content}`).join("\n\n");
}

/** 文档摘要：存 documents.summary */
export async function summarizeDocument(documentId: string): Promise<string> {
  const doc = db.select().from(documents).where(eq(documents.id, documentId)).get();
  if (!doc) throw new Error("文档不存在");
  const rows = capChunks(
    db
      .select({ id: chunksTable.id, content: chunksTable.content, seq: chunksTable.seq })
      .from(chunksTable)
      .where(eq(chunksTable.documentId, documentId))
      .orderBy(asc(chunksTable.seq))
      .all()
  );
  if (rows.length === 0) throw new Error("文档没有可用的文本分块");
  const summary = await chatComplete(
    [{ role: "user", content: SUMMARIZE_PROMPT + numberedText(rows) }],
    { temperature: 0.3 }
  );
  db.update(documents)
    .set({ summary, updatedAt: Date.now() })
    .where(eq(documents.id, documentId))
    .run();
  return summary;
}

/** 知识点提取：documentId 单文档 或 courseId 全课程；返回新增条数 */
export async function extractKnowledgePoints(target: {
  documentId?: string;
  courseId?: string;
}): Promise<{ created: number }> {
  let courseId: string;
  let scopeLabel: string;
  let rows: { id: string; content: string; seq: number }[];
  let documentId: string | null = null;

  if (target.documentId) {
    const doc = db.select().from(documents).where(eq(documents.id, target.documentId)).get();
    if (!doc) throw new Error("文档不存在");
    courseId = doc.courseId;
    documentId = doc.id;
    scopeLabel = doc.title;
    rows = capChunks(
      db
        .select({ id: chunksTable.id, content: chunksTable.content, seq: chunksTable.seq })
        .from(chunksTable)
        .where(eq(chunksTable.documentId, documentId))
        .orderBy(asc(chunksTable.seq))
        .all()
    );
  } else {
    courseId = target.courseId!;
    scopeLabel = "全课程";
    rows = capChunks(
      db
        .select({ id: chunksTable.id, content: chunksTable.content, seq: chunksTable.seq })
        .from(chunksTable)
        .where(eq(chunksTable.courseId, courseId))
        .orderBy(asc(chunksTable.seq))
        .all()
    );
  }
  if (rows.length === 0) throw new Error("没有可用的文本分块（先上传并解析资料）");

  const points = await callJson(
    KnowledgePointsSchema,
    [
      {
        role: "user",
        content: `课程范围：${scopeLabel}\n\n${KNOWLEDGE_POINTS_PROMPT}${numberedText(rows)}`,
      },
    ]
  );

  // 同范围去重：已有同名知识点跳过
  const existing = db
    .select({ title: knowledgePoints.title })
    .from(knowledgePoints)
    .where(eq(knowledgePoints.courseId, courseId))
    .all()
    .map((r) => r.title);
  const seen = new Set(existing);

  const toInsert = points.filter((p) => {
    if (seen.has(p.title)) return false;
    seen.add(p.title);
    return true;
  });

  if (toInsert.length > 0) {
    const now = Date.now();
    db.insert(knowledgePoints)
      .values(
        toInsert.map((p) => ({
          id: crypto.randomUUID(),
          courseId,
          documentId,
          title: p.title,
          content: p.content,
          importance: p.importance,
          keywords: p.keywords,
          sourceChunkIds: p.sourceIndexes
            .map((n) => rows[n - 1]?.id)
            .filter((x): x is string => Boolean(x)),
          createdAt: now,
          updatedAt: now,
        }))
      )
      .run();
  }
  return { created: toInsert.length };
}

/** 引用块详情（来源抽屉用） */
export function getChunksByIds(ids: string[]) {
  if (ids.length === 0) return [];
  return db
    .select({
      id: chunksTable.id,
      content: chunksTable.content,
      sourceRef: chunksTable.sourceRef,
      documentId: chunksTable.documentId,
      documentTitle: documents.title,
    })
    .from(chunksTable)
    .innerJoin(documents, eq(chunksTable.documentId, documents.id))
    .where(inArray(chunksTable.id, ids))
    .orderBy(asc(chunksTable.seq))
    .all();
}

export function latestKnowledgePoints(courseId: string, limit = 100) {
  return db
    .select()
    .from(knowledgePoints)
    .where(eq(knowledgePoints.courseId, courseId))
    .orderBy(desc(knowledgePoints.createdAt))
    .limit(limit)
    .all();
}
