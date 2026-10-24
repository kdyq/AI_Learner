import { eq } from "drizzle-orm";
import { db } from "@/db";
import { notes } from "@/db/schema";
import { Document, Packer, Paragraph } from "docx";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** 笔记导出：Markdown 或 Word */
export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params;
  const note = db.select().from(notes).where(eq(notes.id, id)).get();
  if (!note) return new Response(JSON.stringify({ error: "笔记不存在" }), { status: 404 });
  const format = new URL(req.url).searchParams.get("format") ?? "md";
  const safeTitle = note.title.replace(/[\\/:*?"<>|]/g, "_");

  if (format === "docx") {
    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({ text: note.title, heading: "Heading1" as never }),
            ...note.content
              .split("\n")
              .map((line) => new Paragraph(line.replace(/^#+\s*/, ""))),
          ],
        },
      ],
    });
    const buf = await Packer.toBuffer(doc);
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(safeTitle)}.docx`,
      },
    });
  }

  return new Response(`# ${note.title}\n\n${note.content}`, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(safeTitle)}.md`,
    },
  });
}
