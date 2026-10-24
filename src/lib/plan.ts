import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  courses,
  documents,
  knowledgePoints,
  planTasks,
  questions,
  studyPlans,
  wrongItems,
} from "@/db/schema";
import { callJson } from "@/lib/ai/json";
import { PlanTasksSchema } from "@/lib/ai/schemas";
import { planPrompt } from "@/lib/ai/prompts";

/** 生成学习计划：考试日倒排每日任务 */
export async function generatePlan(courseId: string, examDate: string): Promise<{ planId: string; days: number; tasks: number }> {
  const course = db.select().from(courses).where(eq(courses.id, courseId)).get();
  if (!course) throw new Error("课程不存在");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(examDate)) throw new Error("考试日期格式应为 YYYY-MM-DD");
  const start = new Date();
  const end = new Date(examDate + "T23:59:59");
  if (end.getTime() <= start.getTime()) throw new Error("考试日期必须晚于今天");
  const days = Math.min(30, Math.ceil((end.getTime() - start.getTime()) / 86400000));
  if (days < 1) throw new Error("日期范围无效");

  const summaries = db
    .select({ title: documents.title, summary: documents.summary })
    .from(documents)
    .where(eq(documents.courseId, courseId))
    .all()
    .filter((d) => d.summary)
    .map((d) => `《${d.title}》：${d.summary!.slice(0, 120)}`)
    .join("\n");
  const kps = db.select().from(knowledgePoints).where(eq(knowledgePoints.courseId, courseId)).all();
  const wrongTitles = db
    .select({ stem: questions.stem })
    .from(wrongItems)
    .innerJoin(questions, eq(wrongItems.questionId, questions.id))
    .where(eq(wrongItems.resolved, false))
    .all()
    .slice(0, 10)
    .map((w) => w.stem.slice(0, 40));

  const overview = [
    summaries ? `【文档摘要】\n${summaries}` : "",
    kps.length ? `【知识点（${kps.length} 个）】\n${kps.map((k) => `${k.importance === "core" ? "★" : "·"}${k.title}（掌握${k.mastery}%）`).join("；")}` : "",
    wrongTitles.length ? `【薄弱点（错题）】\n${wrongTitles.join("\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const today = new Date().toISOString().slice(0, 10);
  const planEnd = new Date(Date.now() + (days - 1) * 86400000).toISOString().slice(0, 10);
  const tasks = await callJson(PlanTasksSchema, [
    { role: "user", content: planPrompt(course.name, examDate, today, overview || "（暂无资料概览）") + `\n计划区间：${today} 至 ${planEnd}（共 ${days} 天）。` },
  ]);

  const planId = crypto.randomUUID();
  db.insert(studyPlans)
    .values({
      id: planId,
      courseId,
      title: `${course.name} · 考前计划（${today} → ${examDate}）`,
      examDate: end.getTime(),
      startDate: start.getTime(),
      content: { days, generatedTasks: tasks.length },
      createdAt: Date.now(),
    })
    .run();
  db.insert(planTasks)
    .values(
      tasks.map((t) => ({
        id: crypto.randomUUID(),
        planId,
        date: t.date,
        title: t.title,
        detail: t.detail ?? "",
        type: t.type,
        done: false,
        doneAt: null,
      }))
    )
    .run();

  return { planId, days, tasks: tasks.length };
}

export function listPlans() {
  const plans = db.select().from(studyPlans).orderBy(desc(studyPlans.createdAt)).all();
  const allTasks = db.select().from(planTasks).all();
  const courseMap = Object.fromEntries(db.select({ id: courses.id, name: courses.name }).from(courses).all().map((c) => [c.id, c.name]));
  return plans.map((p) => ({
    ...p,
    courseName: courseMap[p.courseId] ?? "",
    tasks: allTasks
      .filter((t) => t.planId === p.id)
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)),
  }));
}
