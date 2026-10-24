import Link from "next/link";
import { desc, count } from "drizzle-orm";
import { BookOpen, FileText } from "@/components/icons";
import { db } from "@/db";
import { courses, documents } from "@/db/schema";
import { CourseDialog } from "@/components/courses/course-dialog";
import { COURSE_STYLES } from "@/lib/course-colors";

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const list = db.select().from(courses).orderBy(desc(courses.createdAt)).all();
  const counts = Object.fromEntries(
    db.select({ courseId: documents.courseId, n: count() }).from(documents).groupBy(documents.courseId).all().map((r) => [r.courseId, r.n])
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">课程</h1>
          <p className="mt-1 text-[13px] text-ink-2">按课程组织资料、问答与练习</p>
        </div>
        <CourseDialog />
      </div>

      {list.length === 0 ? (
        <div className="grid place-items-center gap-2 rounded-[18px] border-2 border-dashed border-line py-16 text-center">
          <BookOpen size={28} className="text-ink-3" />
          <p className="text-sm text-ink-2">还没有课程，点「新建课程」创建第一个</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => {
            const st = COURSE_STYLES[c.color];
            const n = counts[c.id] ?? 0;
            return (
              <Link
                key={c.id}
                href={`/courses/${c.id}`}
                className="group relative overflow-hidden rounded-[18px] bg-surface p-5 ring-1 ring-line transition-[transform,box-shadow] hover:-translate-y-[3px] hover:shadow-soft"
              >
                <span className={`absolute inset-y-0 left-0 w-1.5 ${st.band}`} />
                <div className="flex items-center gap-2">
                  <span className={`size-2.5 rounded-full ${st.dot}`} />
                  <h2 className="text-[15px] font-bold">{c.name}</h2>
                </div>
                {c.description && <p className="mt-1.5 line-clamp-2 text-[13px] text-ink-2">{c.description}</p>}
                <p className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] text-ink-3">
                  <FileText size={13} />
                  <span className="num">{n}</span> 份资料
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
