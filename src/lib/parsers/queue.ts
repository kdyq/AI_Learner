import fs from "node:fs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { chunks as chunksTable, documents } from "@/db/schema";
import { parseDocument } from "./index";
import { chunkSegments } from "@/lib/retrieval/chunker";
import { invalidateCourse } from "@/lib/retrieval/bm25";
import { recordEvent } from "@/lib/study";

/** 进程内串行解析队列（本地单用户足够，无需 BullMQ） */
const queue: string[] = [];
let running = false;
const listeners = new Set<() => void>();

export function onQueueDrained(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  for (const fn of listeners) fn();
}

export function enqueueParse(documentId: string) {
  if (!queue.includes(documentId)) queue.push(documentId);
  void drain();
}

async function drain() {
  if (running) return;
  running = true;
  try {
    while (queue.length > 0) {
      const id = queue.shift();
      if (!id) break;
      try {
        await processDocument(id);
      } catch (err) {
        console.error(`[parse] document ${id} failed:`, err);
        db.update(documents)
          .set({
            status: "error",
            errorMessage: (err as Error).message?.slice(0, 500) ?? "解析失败",
            updatedAt: Date.now(),
          })
          .where(eq(documents.id, id))
          .run();
      }
      notify();
    }
  } finally {
    running = false;
  }
}

async function processDocument(documentId: string) {
  const doc = db.select().from(documents).where(eq(documents.id, documentId)).get();
  if (!doc || (doc.status !== "pending" && doc.status !== "error")) return;

  db.update(documents).set({ status: "parsing", errorMessage: null, updatedAt: Date.now() }).where(eq(documents.id, documentId)).run();

  const parsed = await parseDocument(doc.fileType, doc.filePath);
  const drafts = chunkSegments(parsed.segments);
  if (drafts.length === 0) {
    throw new Error(
      parsed.needsOcrPages.length > 0
        ? `未抽取到文本：全部 ${parsed.needsOcrPages.length} 页均为扫描件（需 OCR，暂不支持引用）`
        : "未抽取到文本内容"
    );
  }

  const totalChars = drafts.reduce((s, d) => s + d.content.length, 0);

  db.delete(chunksTable).where(eq(chunksTable.documentId, documentId)).run();
  const rows = drafts.map((d, i) => ({
    id: crypto.randomUUID(),
    documentId,
    courseId: doc.courseId,
    seq: i + 1,
    content: d.content,
    charCount: d.content.length,
    sourceRef: d.sourceRef,
    createdAt: Date.now(),
  }));
  for (let i = 0; i < rows.length; i += 100) {
    db.insert(chunksTable).values(rows.slice(i, i + 100)).run();
  }

  db.update(documents)
    .set({
      status: "ready",
      pageCount: parsed.pageCount,
      charCount: totalChars,
      meta: {
        ...(doc.meta ?? {}),
        needsOcrPages: parsed.needsOcrPages,
        chunkCount: rows.length,
      },
      errorMessage: null,
      updatedAt: Date.now(),
    })
    .where(eq(documents.id, documentId))
    .run();

  invalidateCourse(doc.courseId);
  recordEvent("upload", { courseId: doc.courseId, meta: { documentId, title: doc.title } });
}
