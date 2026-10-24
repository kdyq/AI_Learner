import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { chunks as chunksTable, courses, documents } from "@/db/schema";
import { ocrImage } from "@/lib/ai/ocr";
import { parseMarkdownSource } from "@/lib/parsers/md";
import { chunkSegments } from "@/lib/retrieval/chunker";
import { invalidateCourse } from "@/lib/retrieval/bm25";
import { recordEvent } from "@/lib/study";

export const runtime = "nodejs";
export const maxDuration = 300;

/** 图片上传 → 视觉 OCR → 作为文档入库（可检索/引用） */
export async function POST(req: Request) {
  const { courseId, dataUrl, fileName } = (await req.json()) as {
    courseId?: string;
    dataUrl?: string;
    fileName?: string;
  };
  if (!courseId || !dataUrl?.startsWith("data:image/")) {
    return NextResponse.json({ error: "缺少 courseId 或图片 dataUrl" }, { status: 400 });
  }
  const course = db.select().from(courses).where(eq(courses.id, courseId)).get();
  if (!course) return NextResponse.json({ error: "课程不存在" }, { status: 404 });

  try {
    const text = await ocrImage(dataUrl);
    const parsed = parseMarkdownSource(text, true);
    const drafts = chunkSegments(parsed.segments);
    if (drafts.length === 0) throw new Error("OCR 结果无有效文本");

    const now = Date.now();
    const id = crypto.randomUUID();
    const title = (fileName ?? "图片识别").replace(/\.[^.]+$/, "");
    db.insert(documents)
      .values({
        id,
        courseId,
        title: `📷 ${title}`,
        fileName: fileName ?? "image",
        fileType: "txt",
        filePath: "",
        fileSize: Math.round((dataUrl.length * 3) / 4),
        charCount: text.length,
        status: "ready",
        meta: { ocr: true, chunkCount: drafts.length },
        createdAt: now,
        updatedAt: now,
      })
      .run();
    db.insert(chunksTable)
      .values(
        drafts.map((d, i) => ({
          id: crypto.randomUUID(),
          documentId: id,
          courseId,
          seq: i + 1,
          content: d.content,
          charCount: d.content.length,
          sourceRef: { heading: "图片识别" },
          createdAt: now,
        }))
      )
      .run();
    invalidateCourse(courseId);
    recordEvent("upload", { courseId, meta: { documentId: id, ocr: true } });
    return NextResponse.json({ documentId: id, title, charCount: text.length }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
