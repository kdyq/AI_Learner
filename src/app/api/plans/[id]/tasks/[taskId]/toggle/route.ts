import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { planTasks } from "@/db/schema";
import { recordEvent } from "@/lib/study";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string; taskId: string }> };

export async function POST(_req: Request, { params }: Ctx) {
  const { taskId } = await params;
  const task = db.select().from(planTasks).where(eq(planTasks.id, taskId)).get();
  if (!task) return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  const done = !task.done;
  db.update(planTasks)
    .set({ done, doneAt: done ? Date.now() : null })
    .where(eq(planTasks.id, taskId))
    .run();
  if (done) recordEvent("review", { meta: { planTask: task.title } });
  return NextResponse.json({ ok: true, done });
}
