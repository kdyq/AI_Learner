import { eq } from "drizzle-orm";
import { db } from "@/db";
import { chunks as chunksTable } from "@/db/schema";
import { tokenize } from "./tokenizer";

/** BM25 参数（DEV.md §8） */
const K1 = 1.5;
const B = 0.75;

type IndexedChunk = {
  chunkId: string;
  documentId: string;
  tf: Map<string, number>;
  len: number;
};

type CourseIndex = {
  chunks: IndexedChunk[];
  df: Map<string, number>;
  totalLen: number;
};

type Cache = Map<string, CourseIndex | null>;

const globalForIndex = globalThis as unknown as { __shizhiBm25?: Cache };
const cache: Cache = (globalForIndex.__shizhiBm25 ??= new Map());

function buildIndex(rows: { id: string; documentId: string; content: string }[]): CourseIndex {
  const idx: CourseIndex = { chunks: [], df: new Map(), totalLen: 0 };
  for (const row of rows) {
    const tokens = tokenize(row.content);
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    for (const t of tf.keys()) idx.df.set(t, (idx.df.get(t) ?? 0) + 1);
    idx.chunks.push({ chunkId: row.id, documentId: row.documentId, tf, len: tokens.length });
    idx.totalLen += tokens.length;
  }
  return idx;
}

function getCourseIndex(courseId: string): CourseIndex | null {
  if (!cache.has(courseId)) {
    const rows = db
      .select({ id: chunksTable.id, documentId: chunksTable.documentId, content: chunksTable.content })
      .from(chunksTable)
      .where(eq(chunksTable.courseId, courseId))
      .all();
    cache.set(courseId, buildIndex(rows));
  }
  return cache.get(courseId) ?? null;
}

/** 文档增删后调用：让该课程索引下次访问时重建 */
export function invalidateCourse(courseId: string) {
  cache.delete(courseId);
}

export type SearchHit = {
  chunkId: string;
  documentId: string;
  score: number;
};

/** BM25 检索：返回按得分降序的 topK */
export function bm25Search(courseId: string, query: string, topK = 8): SearchHit[] {
  const idx = getCourseIndex(courseId);
  if (!idx || idx.chunks.length === 0) return [];
  const qTokens = tokenize(query);
  if (qTokens.length === 0) return [];
  const N = idx.chunks.length;
  const avgLen = idx.totalLen / N;
  const hits: SearchHit[] = [];
  for (const c of idx.chunks) {
    let score = 0;
    for (const t of qTokens) {
      const f = c.tf.get(t);
      if (!f) continue;
      const df = idx.df.get(t) ?? 0;
      const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
      score +=
        (idf * (f * (K1 + 1))) / (f + K1 * (1 - B + B * (c.len / avgLen)));
    }
    if (score > 0) hits.push({ chunkId: c.chunkId, documentId: c.documentId, score });
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, topK);
}

export function indexStats(courseId: string): { chunks: number } {
  const idx = getCourseIndex(courseId);
  return { chunks: idx?.chunks.length ?? 0 };
}
