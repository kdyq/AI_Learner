import { ankiCsv } from "@/lib/fsrs";

export const runtime = "nodejs";

/** Anki CSV 导出（可直接导入 Anki） */
export async function GET(req: Request) {
  const courseId = new URL(req.url).searchParams.get("courseId") ?? undefined;
  const csv = ankiCsv(courseId || undefined);
  return new Response("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="shizhi-anki-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
