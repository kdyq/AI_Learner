"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarCheck, CheckCircle, Sparkle, SpinnerGap } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Task = {
  id: string;
  date: string;
  title: string;
  detail: string;
  type: "study" | "review" | "quiz";
  done: boolean;
};

type Plan = {
  id: string;
  courseId: string;
  courseName: string;
  title: string;
  examDate: number | null;
  createdAt: number;
  tasks: Task[];
};

const TYPE_UI: Record<Task["type"], { label: string; cls: string }> = {
  study: { label: "学习", cls: "bg-sky-bg text-sky-ink" },
  review: { label: "复习", cls: "bg-mint-bg text-mint-ink" },
  quiz: { label: "做题", cls: "bg-peach-bg text-peach-ink" },
};

function daysLeft(examDate: number | null): number | null {
  if (!examDate) return null;
  return Math.max(0, Math.ceil((examDate - Date.now()) / 86400000));
}

export function PlanClient({
  courses,
  plans: initialPlans,
}: {
  courses: { id: string; name: string }[];
  plans: Plan[];
}) {
  const router = useRouter();
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [examDate, setExamDate] = useState("");
  const [generating, setGenerating] = useState(false);
  const [plans, setPlans] = useState(initialPlans);
  const [toggling, setToggling] = useState<string | null>(null);

  const generate = async () => {
    if (!courseId) return toast.error("请先选择课程");
    if (!examDate) return toast.error("请选择考试日期");
    setGenerating(true);
    try {
      const res = await fetch("/api/plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, examDate }),
      });
      const d = (await res.json()) as { tasks?: number; error?: string };
      if (!res.ok) throw new Error(d.error ?? "生成失败");
      toast.success(`计划已生成：${d.tasks} 个每日任务`);
      const refreshed = await fetch("/api/plans").then((r) => r.json());
      setPlans(refreshed.plans);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const toggle = async (planId: string, taskId: string) => {
    setToggling(taskId);
    const res = await fetch(`/api/plans/${planId}/tasks/${taskId}/toggle`, { method: "POST" });
    if (res.ok) {
      const d = (await res.json()) as { done: boolean };
      setPlans((ps) =>
        ps.map((p) =>
          p.id === planId
            ? { ...p, tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, done: d.done } : t)) }
            : p
        )
      );
    }
    setToggling(null);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold">学习计划</h1>
        <p className="mt-1 text-[13px] text-ink-2">输入考试日期，AI 结合资料与薄弱点倒排每日任务</p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-[18px] bg-surface p-5 ring-1 ring-line">
        <div className="min-w-[160px] space-y-1.5">
          <Label>课程</Label>
          <Select value={courseId} onValueChange={setCourseId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={courses.length ? "选择课程" : "暂无课程"} />
            </SelectTrigger>
            <SelectContent>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>考试日期</Label>
          <Input type="date" className="num" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
        </div>
        <Button onClick={generate} disabled={generating || !examDate || !courseId}>
          {generating ? <SpinnerGap className="animate-spin" size={14} /> : <Sparkle size={14} />}
          {generating ? "生成中…" : "生成计划"}
        </Button>
      </div>

      {plans.length === 0 ? (
        <div className="grid place-items-center gap-2 rounded-[18px] border-2 border-dashed border-line py-14 text-center">
          <CalendarCheck size={26} className="text-ink-3" />
          <p className="text-sm text-ink-2">还没有计划，选好课程和考试日期生成第一份</p>
        </div>
      ) : (
        plans.map((p) => {
          const byDate = new Map<string, Task[]>();
          for (const t of p.tasks) {
            byDate.set(t.date, [...(byDate.get(t.date) ?? []), t]);
          }
          const doneCount = p.tasks.filter((t) => t.done).length;
          const left = daysLeft(p.examDate);
          return (
            <section key={p.id} className="space-y-3 rounded-[18px] bg-surface p-5 ring-1 ring-line">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[15px] font-bold">{p.title}</h2>
                {left !== null && (
                  <span className="rounded-full bg-lemon-bg px-2.5 py-0.5 text-[11.5px] font-semibold text-lemon-ink">
                    距考试 <span className="num">{left}</span> 天
                  </span>
                )}
                <span className="text-[12.5px] text-ink-3">
                  完成 <b className="num text-ink">{doneCount}</b>/<span className="num">{p.tasks.length}</span>
                </span>
              </div>
              <div className="space-y-3">
                {[...byDate.entries()].map(([date, tasks]) => (
                  <div key={date} className="rounded-[14px] bg-page px-4 py-3">
                    <p className="num mb-2 text-[12px] font-semibold text-ink-2">
                      {date}
                      {date === new Date().toISOString().slice(0, 10) && (
                        <span className="ml-2 rounded-full bg-sky-bg px-2 py-0.5 text-[10.5px] text-sky-ink">今天</span>
                      )}
                    </p>
                    <ul className="space-y-1.5">
                      {tasks.map((t) => (
                        <li key={t.id} className="flex items-start gap-2.5">
                          <button
                            aria-label={t.done ? `取消完成 ${t.title}` : `完成 ${t.title}`}
                            disabled={toggling === t.id}
                            onClick={() => void toggle(p.id, t.id)}
                            className={cn(
                              "mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition-colors",
                              t.done ? "border-ok bg-ok text-white" : "border-line bg-white hover:border-ink-3"
                            )}
                          >
                            {t.done && <CheckCircle size={12} weight="bold" />}
                          </button>
                          <div className={cn("min-w-0", t.done && "opacity-55 line-through")}>
                            <p className="text-[13.5px] font-medium">
                              {t.title}
                              <span className={cn("ml-2 rounded-full px-2 py-0.5 text-[10.5px] font-semibold", TYPE_UI[t.type].cls)}>
                                {TYPE_UI[t.type].label}
                              </span>
                            </p>
                            {t.detail && <p className="text-[12px] text-ink-3">{t.detail}</p>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              {p.courseId && (
                <Link href="/review" className="inline-block text-[12.5px] font-medium text-primary">
                  今日复习队列 →
                </Link>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
