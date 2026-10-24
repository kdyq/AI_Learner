import { Suspense } from "react";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { courses } from "@/db/schema";
import { GraphClient } from "@/components/graph/graph-client";

export const dynamic = "force-dynamic";

export default function GraphPage() {
  const courseList = db.select({ id: courses.id, name: courses.name }).from(courses).orderBy(desc(courses.createdAt)).all();
  return (
    <Suspense fallback={<p className="py-20 text-center text-sm text-ink-3">加载图谱…</p>}>
      <GraphClient courses={courseList} initialCourseId={courseList[0]?.id ?? null} />
    </Suspense>
  );
}
