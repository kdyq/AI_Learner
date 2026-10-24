import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { ArrowLeft, TrashSimple } from "@/components/icons";
import { db } from "@/db";
import { courses, documents } from "@/db/schema";
import { CourseDialog } from "@/components/courses/course-dialog";
import { UploadDialog } from "@/components/courses/upload-dialog";
import { DocumentsList, type DocRow } from "@/components/courses/documents-list";
import { KnowledgePanel, type KnowledgePointRow } from "@/components/courses/knowledge-panel";
import { CourseDeleteButton } from "@/components/courses/course-delete-button";
import { COURSE_STYLES } from "@/lib/course-colors";
import { latestKnowledgePoints } from "@/lib/ai/knowledge";

export const dynamic = "force-dynamic";

export default async function CourseDetailPage({
  params,
}: PageProps<"/courses/[id]">) {
  const { id } = await params;
  const course = db.select().from(courses).where(eq(courses.id, id)).get();
  if (!course) notFound();

  const docs = db
    .select()
    .from(documents)
    .where(eq(documents.courseId, id))
    .orderBy(desc(documents.createdAt))
    .all();

  const allCourses = db.select({ id: courses.id, name: courses.name, color: courses.color }).from(courses).all();
  const st = COURSE_STYLES[course.color];

  return (
    <div className="space-y-5">
      <Link href="/courses" className="inline-flex items-center gap-1 text-[13px] text-ink-2 hover:text-ink">
        <ArrowLeft size={14} /> 全部课程
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <span className={`size-3 rounded-full ${st.dot}`} />
        <h1 className="text-lg font-bold">{course.name}</h1>
        <span className={`rounded-full px-3 py-1 text-[12px] font-semibold ${st.chip}`}>
          <span className="num">{docs.length}</span> 份资料
        </span>
        <div className="ml-auto flex items-center gap-2">
          <CourseDialog course={course} />
          <CourseDeleteButton courseId={course.id} courseName={course.name} />
        </div>
      </div>
      {course.description && <p className="text-[13px] text-ink-2">{course.description}</p>}

      <div className="flex justify-end">
        <UploadDialog courses={allCourses} defaultCourseId={course.id} />
      </div>

      <DocumentsList courseId={course.id} initial={docs as DocRow[]} />

      <KnowledgePanel
        courseId={course.id}
        points={latestKnowledgePoints(course.id, 60).map((p) => ({
          id: p.id,
          title: p.title,
          content: p.content,
          importance: p.importance,
          keywords: p.keywords ?? [],
          documentId: p.documentId,
          mastery: p.mastery,
        })) as KnowledgePointRow[]}
      />
    </div>
  );
}
