import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { chunks as chunksTable, documents } from "@/db/schema";
import { bm25Search } from "./bm25";
import { embeddingEnabled, embed, toBlob, fromBlob, cosine } from "@/lib/ai/embeddings";

export type RetrievedChunk = {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  seq: number;
  content: string;
  sourceRef: { page?: number; slide?: number; heading?: string };
  score: number;
};

/**
 * 混合检索：embedding 开启时 向量 topK + BM25 topK → RRF(k=60) 融合；
 * 未开启仅 BM25。返回前 6-8 块。
 */
export async function retrieve(
  courseId: string,
  query: string,
  topK = 6
): Promise<RetrievedChunk[]> {
  const bmHits = bm25Search(courseId, query, 8);

  let rr: Map<string, number> | null = null;
  if (embeddingEnabled()) {
    try {
      const rows = await loadRows(courseId);
      if (rows.length > 0) {
        const [qVec] = await embed([query]);
        const vecHits = rows
          .filter((r) => r.embedding)
          .map((r) => ({ chunkId: r.id, score: cosine(qVec, fromBlob(r.embedding)!) }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 8);
        // RRF 融合
        rr = new Map();
        const K = 60;
        bmHits.forEach((h, i) => rr!.set(h.chunkId, (rr!.get(h.chunkId) ?? 0) + 1 / (K + i + 1)));
        vecHits.forEach((h, i) => rr!.set(h.chunkId, (rr!.get(h.chunkId) ?? 0) + 1 / (K + i + 1)));
      }
    } catch {
      // embedding 失败降级 BM25
    }
  }

  const ranked: { chunkId: string; score: number }[] = rr
    ? [...rr.entries()].map(([chunkId, score]) => ({ chunkId, score })).sort((a, b) => b.score - a.score).slice(0, topK)
    : bmHits.slice(0, topK);

  if (ranked.length === 0) return [];
  const rows = db
    .select({
      id: chunksTable.id,
      documentId: chunksTable.documentId,
      seq: chunksTable.seq,
      content: chunksTable.content,
      sourceRef: chunksTable.sourceRef,
      documentTitle: documents.title,
    })
    .from(chunksTable)
    .innerJoin(documents, eq(chunksTable.documentId, documents.id))
    .where(inArray(chunksTable.id, ranked.map((r) => r.chunkId)))
    .all();

  const order = new Map(ranked.map((r, i) => [r.chunkId, i]));
  return rows
    .sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99))
    .map((r) => ({
      chunkId: r.id,
      documentId: r.documentId,
      documentTitle: r.documentTitle,
      seq: r.seq,
      content: r.content,
      sourceRef: r.sourceRef,
      score: 0,
    }));
}

type Row = { id: string; embedding: Buffer | null };

async function loadRows(courseId: string): Promise<Row[]> {
  // RAG 全量载入该课程分块向量（课程级数据量无压力）
  return db
    .select({ id: chunksTable.id, embedding: chunksTable.embedding })
    .from(chunksTable)
    .where(eq(chunksTable.courseId, courseId))
    .all();
}

/** 为课程全部分块补算 embedding（开启 embedding 后手动触发） */
export async function embedCourse(courseId: string): Promise<number> {
  const rows = await loadRows(courseId);
  const pending = rows.filter((r) => !r.embedding);
  for (let i = 0; i < pending.length; i += 32) {
    const batch = pending.slice(i, i + 32);
    const contents = await loadContents(batch.map((b) => b.id));
    const vecs = await embed(contents.map((c) => c.content));
    for (let j = 0; j < batch.length; j++) {
      db.update(chunksTable)
        .set({ embedding: toBlob(vecs[j]) })
        .where(inArray(chunksTable.id, [batch[j].id]))
        .run();
    }
  }
  return pending.length;
}

function loadContents(ids: string[]) {
  const rows = db
    .select({ id: chunksTable.id, content: chunksTable.content })
    .from(chunksTable)
    .where(inArray(chunksTable.id, ids))
    .all();
  const order = new Map(ids.map((id, i) => [id, i]));
  return rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}
