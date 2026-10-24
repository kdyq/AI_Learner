import fs from "node:fs";
import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { chunks, documents } from "@/db/schema";
import { invalidateCourse } from "@/lib/retrieval/bm25";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** 文档详情：含全部分块（供预览/高亮/定位） */
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const doc = db.select().from(documents).where(eq(documents.id, id)).get();
  if (!doc) return NextResponse.json({ error: "文档不存在" }, { status: 404 });
  const rows = db.select().from(chunks).where(eq(chunks.documentId, id)).orderBy(asc(chunks.seq)).all();
  return NextResponse.json({
    document: doc,
    chunks: rows.map((r) => ({
      id: r.id,
      seq: r.seq,
      content: r.content,
      charCount: r.charCount,
      sourceRef: r.sourceRef,
    })),
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const doc = db.select().from(documents).where(eq(documents.id, id)).get();
  if (!doc) return NextResponse.json({ error: "文档不存在" }, { status: 404 });
  db.delete(documents).where(eq(documents.id, id)).run(); // 级联删 chunks
  try {
    fs.unlinkSync(doc.filePath);
  } catch {
    // 文件已不存在
  }
  invalidateCourse(doc.courseId);
  return NextResponse.json({ ok: true });
}
