"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Cards, Lightning, Sparkle, SpinnerGap } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type KnowledgePointRow = {
  id: string;
  title: string;
  content: string;
  importance: "core" | "normal";
  keywords: string[];
  documentId: string | null;
  mastery: number;
};

export function KnowledgePanel({
  courseId,
  points,
}: {
  courseId: string;
  points: KnowledgePointRow[];
}) {
  const router = useRouter();
  const [extracting, setExtracting] = useState(false);
  const [carding, setCarding] = useState(false);

  const makeCards = async () => {
    if (points.length === 0) return;
    setCarding(true);
    try {
      const res = await fetch("/api/flashcards/from-knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ knowledgePointIds: points.map((p) => p.id) }),
      });
      const d = (await res.json()) as { created?: number; error?: string };
      if (!res.ok) throw new Error(d.error ?? "转换失败");
      toast.success(`新增 ${d.created ?? 0} 张闪卡（已跳过转过的），去「复习」页开始`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCarding(false);
    }
  };

  const extract = async () => {
    setExtracting(true);
    try {
      const res = await fetch("/api/ai/knowledge-points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });
      const d = (await res.json()) as { created?: number; error?: string };
      if (!res.ok) throw new Error(d.error ?? "提取失败");
      toast.success(`全课程知识点提取完成：新增 ${d.created ?? 0} 个（同名已跳过）`);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setExtracting(false);
    }
  };

  const coreCount = points.filter((p) => p.importance === "core").length;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <h2 className="text-[15px] font-bold">知识点</h2>
        <span className="text-[12.5px] text-ink-3">
          共 <b className="num text-ink">{points.length}</b> 个 · 核心 <b className="num text-peach-ink">{coreCount}</b>
        </span>
        <Button variant="outline" size="sm" onClick={makeCards} disabled={carding || points.length === 0}>
          {carding ? <SpinnerGap className="animate-spin" size={14} /> : <Cards size={14} />}
          一键转闪卡
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={extract}
          disabled={extracting}
        >
          {extracting ? <SpinnerGap className="animate-spin" size={14} /> : <Sparkle size={14} />}
          全课程提取知识点
        </Button>
      </div>

      {points.length === 0 ? (
        <div className="grid place-items-center gap-1.5 rounded-[18px] border-2 border-dashed border-line py-10 text-center">
          <Lightning size={22} className="text-ink-3" />
          <p className="text-[13px] text-ink-2">还没有知识点：解析资料后点上方按钮，或对单个文档「AI 加工」</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {points.map((p) => (
            <article
              key={p.id}
              id={`kp-${encodeURIComponent(p.title)}`}
              className="scroll-mt-24 rounded-[14px] bg-surface px-4 py-3.5 ring-1 ring-line transition-[transform,box-shadow] hover:-translate-y-[3px] hover:shadow-soft"
            >
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[14px] font-semibold">{p.title}</h3>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                    p.importance === "core" ? "bg-peach-bg text-peach-ink" : "bg-surface-hover text-ink-2"
                  )}
                >
                  {p.importance === "core" ? "核心" : "了解"}
                </span>
                <span className="ml-auto num text-[11px] text-ink-3">掌握 {p.mastery}%</span>
              </div>
              <p className="mt-1.5 line-clamp-3 text-[13px] leading-relaxed text-ink-2">{p.content}</p>
              {p.keywords.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {p.keywords.slice(0, 6).map((k) => (
                    <span key={k} className="rounded-full bg-sky-bg px-2.5 py-0.5 text-[11px] text-sky-ink">
                      {k}
                    </span>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
