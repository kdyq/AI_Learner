"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ListChecks, Play, Sparkle, SpinnerGap } from "@phosphor-icons/react";
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

type CourseOption = { id: string; name: string };
type DocOption = { id: string; title: string; courseId: string };
type KpOption = { id: string; title: string; courseId: string };
type SetRow = {
  id: string;
  title: string;
  createdAt: number;
  courseName: string;
  config: { count: number; scope: string };
};

const TYPES: { key: string; label: string }[] = [
  { key: "single", label: "单选" },
  { key: "multiple", label: "多选" },
  { key: "fill", label: "填空" },
  { key: "judge", label: "判断" },
  { key: "short", label: "简答" },
];

export function QuizHomeClient({
  courses,
  documents,
  knowledgePoints,
  sets,
}: {
  courses: CourseOption[];
  documents: DocOption[];
  knowledgePoints: KpOption[];
  sets: SetRow[];
}) {
  const router = useRouter();
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [scope, setScope] = useState<"course" | "document" | "knowledge">("course");
  const [targetId, setTargetId] = useState("");
  const [types, setTypes] = useState<string[]>(["single", "judge", "short"]);
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState(3);
  const [generating, setGenerating] = useState(false);

  const scopedDocs = useMemo(() => documents.filter((d) => d.courseId === courseId), [documents, courseId]);
  const scopedKps = useMemo(() => knowledgePoints.filter((k) => k.courseId === courseId), [knowledgePoints, courseId]);

  const toggleType = (t: string) =>
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const generate = async () => {
    if (!courseId) {
      toast.error("请先在「课程」页创建课程并上传资料");
      return;
    }
    if (types.length === 0) return toast.error("请至少选择一种题型");
    if (scope !== "course" && !targetId) return toast.error("请选择出题范围的具体目标");
    setGenerating(true);
    try {
      const res = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, scope, targetId: scope === "course" ? undefined : targetId, types, count, difficulty }),
      });
      const d = (await res.json()) as { quizSetId?: string; created?: number; error?: string };
      if (!res.ok) throw new Error(d.error ?? "生成失败");
      toast.success(`已生成 ${d.created} 道题，开始作答`);
      router.push(`/quiz/${d.quizSetId}`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold">题库</h1>
        <p className="mt-1 text-[13px] text-ink-2">基于课程资料 AI 出题：客观题自动判分，简答题要点评分</p>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-[18px] bg-surface p-5 ring-1 ring-line lg:grid-cols-[1fr_260px]">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>课程</Label>
              <Select value={courseId} onValueChange={(v) => { setCourseId(v); setTargetId(""); }}>
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
              <Label>范围</Label>
              <Select value={scope} onValueChange={(v) => { setScope(v as typeof scope); setTargetId(""); }}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="course">全课程</SelectItem>
                  <SelectItem value="document">指定文档</SelectItem>
                  <SelectItem value="knowledge">指定知识点</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {scope !== "course" && (
            <div className="space-y-1.5">
              <Label>{scope === "document" ? "文档" : "知识点"}</Label>
              <Select value={targetId} onValueChange={setTargetId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={scope === "document" ? "选择文档" : "选择知识点"} />
                </SelectTrigger>
                <SelectContent>
                  {(scope === "document" ? scopedDocs : scopedKps).map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>题型（可多选）</Label>
            <div className="flex flex-wrap gap-2">
              {TYPES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => toggleType(t.key)}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-all",
                    types.includes(t.key)
                      ? "bg-sky-bg text-sky-ink ring-2 ring-sky-line"
                      : "bg-surface-hover text-ink-2 hover:opacity-80"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>题量</Label>
              <Input type="number" min={1} max={20} className="num" value={count} onChange={(e) => setCount(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>难度 1-5</Label>
              <Input type="number" min={1} max={5} className="num" value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value))} />
            </div>
          </div>
          <Button size="lg" onClick={generate} disabled={generating}>
            {generating ? <SpinnerGap className="animate-spin" size={15} /> : <Sparkle size={15} />}
            {generating ? "生成中（约 10-30s）" : "AI 出题"}
          </Button>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-[15px] font-bold">最近题组</h2>
        {sets.length === 0 ? (
          <p className="rounded-[18px] border-2 border-dashed border-line py-10 text-center text-[13px] text-ink-3">
            还没有题组，配置上方选项生成第一套
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sets.map((s) => (
              <Link
                key={s.id}
                href={`/quiz/${s.id}`}
                className="group rounded-[14px] bg-surface px-4 py-3.5 ring-1 ring-line transition-[transform,box-shadow] hover:-translate-y-[3px] hover:shadow-soft"
              >
                <div className="flex items-center gap-2">
                  <ListChecks size={16} className="text-sky-ink" />
                  <h3 className="truncate text-[14px] font-semibold">{s.title}</h3>
                </div>
                <p className="mt-1 text-[12.5px] text-ink-3">
                  {s.courseName} · <span className="num">{s.config.count}</span> 题 ·{" "}
                  {new Date(s.createdAt).toLocaleDateString("zh-CN")}
                </p>
                <span className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-semibold text-primary">
                  <Play size={11} weight="fill" /> 作答
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
