"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle,
  CheckSquare,
  Notebook,
  SquaresFour,
  TextAa,
  XCircle,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Markdown } from "@/components/chat/markdown";
import { CountUp } from "@/components/motion/count-up";
import { cn } from "@/lib/utils";

type QType = "single" | "multiple" | "fill" | "judge" | "short";

export type RunnerQuestion = {
  id: string;
  type: QType;
  stem: string;
  options: string[] | null;
  difficulty: number;
};

type Result = {
  questionId: string;
  isCorrect: boolean | null;
  score: number;
  aiFeedback?: string;
  correctAnswer: unknown;
  explanation: string;
};

const TYPE_LABEL: Record<QType, string> = {
  single: "单选",
  multiple: "多选",
  fill: "填空",
  judge: "判断",
  short: "简答",
};

function answerText(type: QType, answer: unknown, options: string[] | null): string {
  if (type === "single" && options) return `正确答案：${String.fromCharCode(65 + Number(answer))}. ${options[Number(answer)] ?? ""}`;
  if (type === "multiple" && options)
    return `正确答案：${(Array.isArray(answer) ? answer : []).map((i) => String.fromCharCode(65 + Number(i))).join("、")}`;
  if (type === "judge") return `正确答案：${answer ? "正确" : "错误"}`;
  if (type === "fill") return `正确答案：${Array.isArray(answer) ? answer.join(" / ") : String(answer)}`;
  return `参考要点：${String(answer)}`;
}

export function QuizRunner({
  quizSetId,
  setTitle,
  questions,
}: {
  quizSetId: string;
  setTitle: string;
  questions: RunnerQuestion[];
}) {
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState<{ total: number; score: number; correctCount: number } | null>(null);
  const [results, setResults] = useState<Result[] | null>(null);

  const setAnswer = (id: string, v: unknown) => setAnswers((prev) => ({ ...prev, [id]: v }));

  const toggleMulti = (id: string, i: number) => {
    const cur = ((answers[id] as number[]) ?? []);
    setAnswer(id, cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i].sort((a, b) => a - b));
  };

  const submit = async () => {
    const unanswered = questions.filter((q) => answers[q.id] === undefined || answers[q.id] === "" || (Array.isArray(answers[q.id]) && (answers[q.id] as unknown[]).length === 0));
    if (unanswered.length > 0 && !confirm(`还有 ${unanswered.length} 题未作答，确定提交？`)) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizSetId,
          answers: questions.map((q) => ({ questionId: q.id, answer: answers[q.id] ?? null })),
        }),
      });
      const d = (await res.json()) as { score?: number; correctCount?: number; total?: number; results?: Result[]; error?: string };
      if (!res.ok) throw new Error(d.error ?? "提交失败");
      setSummary({ total: d.total!, score: d.score!, correctCount: d.correctCount! });
      setResults(d.results ?? []);
      toast.success(`批改完成：${d.score} 分`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const resultOf = (id: string) => results?.find((r) => r.questionId === id);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/quiz" className="inline-flex items-center gap-1 text-[13px] text-ink-2 hover:text-ink">
          <ArrowLeft size={14} /> 题库
        </Link>
        <h1 className="text-lg font-bold">{setTitle}</h1>
        <span className="text-[12.5px] text-ink-3">
          共 <b className="num text-ink">{questions.length}</b> 题
        </span>
      </div>

      {summary && (
        <div className="flex items-center gap-5 rounded-[18px] bg-surface px-6 py-5 ring-1 ring-line">
          <div className="flex items-end gap-1.5">
            <span className="text-[40px] leading-none font-bold text-primary">
              <CountUp value={summary.score} />
            </span>
            <span className="pb-1.5 text-[14px] text-ink-2">分</span>
          </div>
          <div className="text-[13px] text-ink-2">
            答对 <b className="num text-ink">{summary.correctCount}</b> / <span className="num">{summary.total}</span> · 简答题已按要点给分
          </div>
          <Link href="/wrong-book" className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-peach-bg px-4 py-2 text-[13px] font-semibold text-peach-ink transition-opacity hover:opacity-80">
            <Notebook size={14} /> 查看错题本
          </Link>
        </div>
      )}

      <ol className="space-y-4">
        {questions.map((q, idx) => {
          const r = resultOf(q.id);
          return (
            <li key={q.id} className="rounded-[18px] bg-surface p-5 ring-1 ring-line">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="num grid size-6 place-items-center rounded-full bg-ink text-[12px] font-bold text-white">{idx + 1}</span>
                <span className="rounded-full bg-sky-bg px-2.5 py-0.5 text-[11px] font-semibold text-sky-ink">{TYPE_LABEL[q.type]}</span>
                <span className="text-[11px] text-ink-3">难度 <span className="num">{q.difficulty}</span>/5</span>
                {r && (
                  <span className={cn("ml-auto inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-[12px] font-semibold", r.isCorrect ? "bg-mint-bg text-mint-ink" : "bg-peach-bg text-peach-ink")}>
                    {r.isCorrect ? <CheckCircle size={12} weight="fill" /> : <XCircle size={12} weight="fill" />}
                    {r.isCorrect ? "答对" : q.type === "short" && r.score >= 60 ? "部分正确" : "答错"}
                  </span>
                )}
              </div>

              <div className="text-[14px] leading-relaxed">
                <Markdown content={q.stem} />
              </div>

              <div className="mt-3 space-y-2">
                {q.type === "single" &&
                  (q.options ?? []).map((opt, i) => (
                    <button
                      key={i}
                      type="button"
                      disabled={!!results}
                      onClick={() => setAnswer(q.id, i)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-[12px] border px-3.5 py-2.5 text-left text-[13.5px] transition-colors",
                        answers[q.id] === i
                          ? "border-sky-ink bg-sky-bg font-medium text-sky-ink"
                          : "border-line hover:bg-surface-hover"
                      )}
                    >
                      <span className="num grid size-6 shrink-0 place-items-center rounded-full border border-current text-[12px] font-bold">
                        {String.fromCharCode(65 + i)}
                      </span>
                      {opt}
                    </button>
                  ))}

                {q.type === "multiple" &&
                  (q.options ?? []).map((opt, i) => {
                    const on = ((answers[q.id] as number[]) ?? []).includes(i);
                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={!!results}
                        onClick={() => toggleMulti(q.id, i)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-[12px] border px-3.5 py-2.5 text-left text-[13.5px] transition-colors",
                          on ? "border-sky-ink bg-sky-bg font-medium text-sky-ink" : "border-line hover:bg-surface-hover"
                        )}
                      >
                        <CheckSquare size={17} weight={on ? "fill" : "regular"} className="shrink-0" />
                        {opt}
                      </button>
                    );
                  })}

                {q.type === "fill" && (
                  <div className="flex items-center gap-2">
                    <TextAa size={16} className="text-ink-3" />
                    <Input
                      disabled={!!results}
                      value={(answers[q.id] as string) ?? ""}
                      onChange={(e) => setAnswer(q.id, e.target.value)}
                      placeholder="填写答案"
                    />
                  </div>
                )}

                {q.type === "judge" && (
                  <div className="flex gap-2">
                    {[true, false].map((v) => (
                      <button
                        key={String(v)}
                        type="button"
                        disabled={!!results}
                        onClick={() => setAnswer(q.id, v)}
                        className={cn(
                          "rounded-full px-5 py-2 text-[13px] font-semibold transition-colors",
                          answers[q.id] === v ? "bg-sky-ink text-white" : "bg-surface-hover text-ink-2 hover:opacity-80"
                        )}
                      >
                        {v ? "正确 √" : "错误 ×"}
                      </button>
                    ))}
                  </div>
                )}

                {q.type === "short" && (
                  <Textarea
                    disabled={!!results}
                    rows={4}
                    value={(answers[q.id] as string) ?? ""}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                    placeholder="用自己的话回答，AI 将按要点给分"
                  />
                )}
              </div>

              {r && (
                <div className="mt-3 space-y-2 rounded-[14px] bg-page px-4 py-3 text-[13px]">
                  <p className="font-semibold text-ink">{answerText(q.type, r.correctAnswer, q.options)}</p>
                  {r.explanation && (
                    <p className="leading-relaxed text-ink-2">
                      <span className="font-semibold">解析：</span>
                      {r.explanation}
                    </p>
                  )}
                  {r.aiFeedback && (
                    <div className="rounded-xl bg-lemon-bg px-3 py-2 leading-relaxed text-lemon-ink">
                      <span className="font-semibold">AI 评分（<span className="num">{r.score}</span>/100）：</span>
                      {r.aiFeedback}
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {!results && (
        <div className="sticky bottom-4 flex justify-center">
          <Button size="lg" onClick={submit} disabled={submitting} className="shadow-soft-lg">
            {submitting ? "批改中…（简答题需 AI 评分）" : "提交答卷"}
          </Button>
        </div>
      )}
    </div>
  );
}
