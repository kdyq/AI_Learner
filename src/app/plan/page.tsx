import { desc } from "drizzle-orm";
import { db } from "@/db";
import { courses } from "@/db/schema";
import { PlanClient } from "@/components/plan/plan-client";
import { listPlans } from "@/lib/plan";

export const dynamic = "force-dynamic";

export default function PlanPage() {
  const courseList = db.select({ id: courses.id, name: courses.name }).from(courses).orderBy(desc(courses.createdAt)).all();
  const plans = listPlans();
  return (
    <PlanClient
      courses={courseList}
      plans={plans.map((p) => ({
        id: p.id,
        courseId: p.courseId,
        courseName: p.courseName,
        title: p.title,
        examDate: p.examDate,
        createdAt: p.createdAt,
        tasks: p.tasks,
      }))}
    />
  );
}
