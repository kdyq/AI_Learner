"use client";

import { useMemo, useState } from "react";
import { MagnifyingGlass, WarningCircle } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type ViewerChunk = {
  id: string;
  seq: number;
  content: string;
  sourceRef: { page?: number; slide?: number; heading?: string };
};

function refLabel(ref: ViewerChunk["sourceRef"]) {
  if (ref.page) return `第 ${ref.page} 页`;
  if (ref.slide) return `页签 ${ref.slide}`;
  if (ref.heading) return ref.heading;
  return "全文";
}

/** 关键词命中高亮（大小写不敏感；支持多关键词空格分隔） */
function highlight(text: string, query: string) {
  const terms = query.trim().split(/\s+/).filter((t) => t.length > 0);
  if (terms.length === 0) return [{ text, hit: false }];
  const pattern = new RegExp(
    `(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
    "gi"
  );
  return text
    .split(pattern)
    .filter((p) => p !== "")
    .map((part) => ({ text: part, hit: pattern.test(part) }));
}

export function DocViewer({
  title,
  fileType,
  chunks,
  needsOcrPages,
  initialQuery = "",
}: {
  title: string;
  fileType: string;
  chunks: ViewerChunk[];
  needsOcrPages: number[];
  initialQuery?: string;
}) {
  const [q, setQ] = useState(initialQuery);
  const query = q.trim();

  const filtered = useMemo(() => {
    if (!query) return chunks;
    const terms = query.toLowerCase().split(/\s+/);
    return chunks.filter((c) => terms.every((t) => c.content.toLowerCase().includes(t)));
  }, [chunks, query]);

  const hitCount = query ? filtered.length : null;

  return (
    <div className="space-y-4">
      {needsOcrPages.length > 0 && (
        <p className="flex items-start gap-2 rounded-[14px] bg-lemon-bg px-4 py-3 text-[13px] text-lemon-ink">
          <WarningCircle size={16} className="mt-0.5 shrink-0" />
          第 {needsOcrPages.join("、")} 页为扫描件（无文字层），暂无法检索与引用；OCR 将在后续版本提供。
        </p>
      )}

      <div className="relative">
        <MagnifyingGlass size={15} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-3" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="在本文档中查找关键词…"
          className="pl-10"
        />
      </div>
      {hitCount !== null && (
        <p className="text-[13px] text-ink-2">
          命中 <b className="num">{hitCount}</b> / <span className="num">{chunks.length}</span> 块
        </p>
      )}

      <div className="space-y-3">
        {filtered.map((c) => {
          const parts = highlight(c.content, query);
          return (
            <section
              key={c.id}
              className={cn(
                "rounded-[14px] bg-surface px-4 py-3.5 ring-1 ring-line",
                query && "has-[mark]:ring-sky-line"
              )}
            >
              <div className="mb-1.5 flex items-center gap-2">
                <span className="num rounded-full bg-surface-hover px-2.5 py-0.5 text-[11px] font-semibold text-ink-2">
                  #{c.seq}
                </span>
                <span className="rounded-full bg-sky-bg px-2.5 py-0.5 text-[11px] font-semibold text-sky-ink">
                  {refLabel(c.sourceRef)}
                </span>
              </div>
              <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap text-ink">
                {parts.map((p, i) =>
                  p.hit ? (
                    <mark key={i} className="rounded-[3px] bg-lemon-bg px-0.5 text-lemon-ink">
                      {p.text}
                    </mark>
                  ) : (
                    <span key={i}>{p.text}</span>
                  )
                )}
              </p>
            </section>
          );
        })}
        {filtered.length === 0 && (
          <p className="py-10 text-center text-sm text-ink-3">没有命中「{query}」的块</p>
        )}
      </div>
      <p className="text-center text-xs text-ink-3">
        {title} · {fileType.toUpperCase()} · 共 {chunks.length} 块
      </p>
    </div>
  );
}
