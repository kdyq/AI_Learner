import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { ArrowLeft } from "@/components/icons";
import { db } from "@/db";
import { chunks as chunksTable, courses, documents } from "@/db/schema";
import { DocViewer, type ViewerChunk } from "@/components/documents/doc-viewer";
import { COURSE_STYLES } from "@/lib/course-colors";

export const dynamic = "force-dynamic";

export default async function DocumentPage({
  params,
  searchParams,
}: PageProps<"/documents/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const doc = db.select().from(documents).where(eq(documents.id, id)).get();
  if (!doc) notFound();
  const course = db.select().from(courses).where(eq(courses.id, doc.courseId)).get();
  const rows = db
    .select()
    .from(chunksTable)
    .where(eq(chunksTable.documentId, id))
    .orderBy(asc(chunksTable.seq))
    .all();

  const needsOcrPages = ((doc.meta as Record<string, unknown> | null)?.needsOcrPages as number[] | undefined) ?? [];
  const st = course ? COURSE_STYLES[course.color] : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {course && st && (
          <Link
            href={`/courses/${course.id}`}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold hover:opacity-80"
          >
            <span className={`size-2 rounded-full ${st.dot}`} />
            {course.name}
          </Link>
        )}
        <Link href={course ? `/courses/${course.id}` : "/courses"} className="inline-flex items-center gap-1 text-[13px] text-ink-2 hover:text-ink">
          <ArrowLeft size={14} /> 返回课程
        </Link>
      </div>

      <div>
        <h1 className="text-lg font-bold">{doc.title}</h1>
        <p className="num mt-1 text-[12.5px] text-ink-3">
          {doc.fileName} · {doc.fileType.toUpperCase()}
          {doc.pageCount ? ` · ${doc.pageCount} ${doc.fileType === "pptx" ? "页签" : "页"}` : ""}
          {doc.charCount ? ` · ${(doc.charCount / 1000).toFixed(1)}k 字` : ""}
        </p>
      </div>

      <DocViewer
        title={doc.title}
        fileType={doc.fileType}
        initialQuery={typeof sp.q === "string" ? sp.q : ""}
        needsOcrPages={needsOcrPages}
        chunks={rows.map((r) => ({
          id: r.id,
          seq: r.seq,
          content: r.content,
          sourceRef: r.sourceRef,
        })) as ViewerChunk[]}
      />
    </div>
  );
}
