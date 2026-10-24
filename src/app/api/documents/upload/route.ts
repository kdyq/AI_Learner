import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { courses, documents } from "@/db/schema";
import { enqueueParse } from "@/lib/parsers/queue";

export const runtime = "nodejs";

const EXT_MAP: Record<string, "pdf" | "docx" | "pptx" | "md" | "txt"> = {
  pdf: "pdf",
  docx: "docx",
  pptx: "pptx",
  md: "md",
  markdown: "md",
  txt: "txt",
};

/** 上传：multipart 多文件 + courseId → data/uploads/{courseId}/{uuid}-{原名} → pending 入队 */
export async function POST(req: Request) {
  const form = await req.formData();
  const courseId = String(form.get("courseId") ?? "");
  if (!courseId) return NextResponse.json({ error: "缺少 courseId" }, { status: 400 });
  const course = db.select().from(courses).where(eq(courses.id, courseId)).get();
  if (!course) return NextResponse.json({ error: "课程不存在" }, { status: 404 });

  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) return NextResponse.json({ error: "未收到文件" }, { status: 400 });

  const dir = path.join(process.cwd(), "data", "uploads", courseId);
  fs.mkdirSync(dir, { recursive: true });

  const created = [];
  const rejected: { fileName: string; reason: string }[] = [];
  for (const file of files) {
    const ext = (file.name.split(".").pop() ?? "").toLowerCase();
    const fileType = EXT_MAP[ext];
    if (!fileType) {
      rejected.push({ fileName: file.name, reason: `不支持的格式 .${ext}` });
      continue;
    }
    const id = crypto.randomUUID();
    const safeName = file.name.replace(/[\\/:*?"<>|]/g, "_");
    const filePath = path.join(dir, `${id}-${safeName}`);
    fs.writeFileSync(filePath, Buffer.from(await file.arrayBuffer()));
    const row = {
      id,
      courseId,
      title: safeName.replace(/\.[^.]+$/, ""),
      fileName: safeName,
      fileType,
      filePath,
      fileSize: file.size,
      status: "pending" as const,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    db.insert(documents).values(row).run();
    enqueueParse(id);
    created.push(row);
  }

  return NextResponse.json({ documents: created, rejected }, { status: 201 });
}
