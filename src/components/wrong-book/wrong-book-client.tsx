"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle, Lightning, SpinnerGap } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/chat/markdown";
import { cn } from "@/lib/utils";

export type WrongRow = {
  id: string;
  questionId: string;
  courseId: string;
  wrongCount: number;
  lastWrongAt: number;
  reason: string | null;
  resolved: boolean;
  type: "single" | "multiple" | "fill" | "judge" | "short";
  stem: string;
  options: string[] | null;
  explanation: string | null;
  courseName: string;
};

const TYPE_LABEL: Record<WrongRow["type"], string> = {
  single: "单选",
  multiple: "多选",
  fill: "填空",
  judge: "判断",
  short: "简答",
};

export function WrongBookClient({ initial, courseName }: { initial: WrongRow[]; courseName?: string }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [showResolved, setShowResolved] = useState(false);
  const [repracticing, setRepracticing] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [varianting, setVarianting] = useState<string | null>(null);

  const makeVariant = async (id: string) => {
    setVarianting(id);
    try {
      const res = await fetch(`/api/wrong-items/${id}/variant`, { method: "POST" });
      const d = (await res.json()) as { quizSetId?: string; error?: string };
      if (!res.ok) throw new Error(d.error ?? "生成变式失败");
      toast.success("变式题已生成");
      router.push(`/quiz/${d.quizSetId}`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setVarianting(null);
    }
  };

  const visible = items.filter((i) => (showResolved ? true : !i.resolved));
  const pendingCount = items.filter((i) => !i.resolved).length;

  const repractice = async () => {
    setRepracticing(true);
    try {
      const res = await fetch("/api/wrong-items/repractice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const d = (await res.json()) as { quizSetId?: string; count?: number; error?: string };
      if (!res.ok) throw new Error(d.error ?? "生成重练失败");
      toast.success(`已组好 ${d.count} 道错题重练卷`);
      router.push(`/quiz/${d.quizSetId}`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setRepracticing(false);
    }
  };

  const resolve = async (id: string) => {
    const res = await fetch(`/api/wrong-items/${id}/resolve`, { method: "POST" });
    if (!res.ok) return toast.error("操作失败");
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, resolved: true } : i)));
    toast.success("已标记为掌握");
    router.refresh();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-lg font-bold">错题本</h1>
          <p className="mt-1 text-[13px] text-ink-2">
            待攻克 <b className="num text-peach-ink">{pendingCount}</b> 道{courseName ? ` · ${courseName}` : ""}
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowResolved((v) => !v)}>
            {showResolved ? "隐藏已掌握" : "显示已掌握"}
          </Button>
          <Button size="sm" onClick={repractice} disabled={repracticing || pendingCount === 0}>
            {repracticing ? <SpinnerGap className="animate-spin" size={14} /> : <Lightning size={14} weight="fill" />}
            错题重练
          </Button>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="grid place-items-center gap-2 rounded-[18px] border-2 border-dashed border-line py-14 text-center">
          <CheckCircle size={26} className="text-mint-ink" />
          <p className="text-sm text-ink-2">没有待处理的错题，去题库练一套吧</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((w) => (
            <li key={w.id} className={cn("rounded-[18px] bg-surface p-4 ring-1 ring-line", w.resolved && "opacity-60")}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-sky-bg px-2.5 py-0.5 text-[11px] font-semibold text-sky-ink">{TYPE_LABEL[w.type]}</span>
                <span className="text-[11.5px] text-ink-3">
                  {w.courseName} · 错 <b className="num text-peach-ink">{w.wrongCount}</b> 次
                </span>
                {w.resolved && <span className="rounded-full bg-mint-bg px-2.5 py-0.5 text-[11px] font-semibold text-mint-ink">已掌握</span>}
                <div className="ml-auto flex gap-1.5">
                  {!w.resolved && (
                    <>
                      <Button variant="outline" size="xs" onClick={() => void makeVariant(w.id)} disabled={varianting === w.id}>
                        {varianting === w.id ? <SpinnerGap className="animate-spin" size={12} /> : <Lightning size={12} />}
                        举一反三
                      </Button>
                      <Button variant="outline" size="xs" onClick={() => void resolve(w.id)}>
                        <CheckCircle size={12} /> 标记掌握
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <button
                className="mt-2 w-full text-left text-[14px] leading-relaxed"
                onClick={() => setExpanded((e) => (e === w.id ? null : w.id))}
              >
                <Markdown content={w.stem} />
                <span className="mt-1 inline-block text-[12px] font-medium text-primary">
                  {expanded === w.id ? "收起解析 ▲" : "查看解析 ▼"}
                </span>
              </button>
              {expanded === w.id && (
                <div className="mt-2 space-y-2 rounded-[14px] bg-page px-4 py-3 text-[13px] text-ink-2">
                  {w.options && w.options.length > 0 && (
                    <ul className="space-y-1">
                      {w.options.map((o, i) => (
                        <li key={i} className="text-[12.5px]">
                          <b className="num mr-1.5">{String.fromCharCode(65 + i)}.</b>
                          {o}
                        </li>
                      ))}
                    </ul>
                  )}
                  {w.explanation && (
                    <p className="leading-relaxed">
                      <span className="font-semibold text-ink">解析：</span>
                      {w.explanation}
                    </p>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="text-center text-[12.5px] text-ink-3">
        提示：错题重练会生成一张只含错题的试卷；答对后可在解析处「标记掌握」
      </p>
    </div>
  );
}
