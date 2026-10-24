import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { courses } from "@/db/schema";
import { retrieve } from "@/lib/retrieval/hybrid";

export const runtime = "nodejs";

/** 课程内块检索（M2 验收：返回正确块与 sourceRef；M6 扩展跨课程） */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const courseId = url.searchParams.get("courseId") ?? "";
  if (!q) return NextResponse.json({ error: "缺少 q" }, { status: 400 });
  if (!courseId) {
    // 无课程限定：逐课程检索合并（跨课程全局搜索的底层）
    const all = db.select().from(courses).all();
    const results = [];
    for (const c of all) {
      results.push(...(await retrieve(c.id, q, 4)));
    }
    results.sort((a, b) => b.score - a.score);
    return NextResponse.json({ results: results.slice(0, 12) });
  }
  const results = await retrieve(courseId, q, 8);
  return NextResponse.json({ results });
}
