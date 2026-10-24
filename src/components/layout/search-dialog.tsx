"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, MagnifyingGlass, SpinnerGap } from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type Result = {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  content: string;
  sourceRef: { page?: number; slide?: number; heading?: string };
};

function refLabel(r: Result["sourceRef"]) {
  if (r.page) return `第 ${r.page} 页`;
  if (r.slide) return `页签 ${r.slide}`;
  if (r.heading) return `「${r.heading}」`;
  return "";
}

/** 跨课程全局搜索 */
export function SearchDialog() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[] | null>(null);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!q.trim()) return;
    setLoading(true);
    setResults(null);
    const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
    if (res.ok) {
      const d = (await res.json()) as { results: Result[] };
      setResults(d.results);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          aria-label="全局搜索"
          className="grid size-8 place-items-center rounded-full text-ink-2 transition-colors hover:bg-surface-hover hover:text-ink"
        >
          <MagnifyingGlass size={18} />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>全局搜索</DialogTitle>
          <DialogDescription>跨课程检索全部资料的分块内容</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <MagnifyingGlass size={15} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-3" />
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void search()}
            placeholder="输入关键词，Enter 搜索…"
            className="pl-10"
          />
        </div>
        <div className="max-h-[50vh] space-y-2 overflow-y-auto">
          {loading && (
            <p className="flex items-center justify-center gap-2 py-6 text-[13px] text-ink-3">
              <SpinnerGap className="animate-spin" size={14} /> 检索中…
            </p>
          )}
          {results?.length === 0 && (
            <p className="py-6 text-center text-[13px] text-ink-3">没有命中内容</p>
          )}
          {results?.map((r) => (
            <Link
              key={r.chunkId}
              href={`/documents/${r.documentId}?q=${encodeURIComponent(q.trim())}`}
              onClick={() => setOpen(false)}
              className="block rounded-[14px] px-3.5 py-2.5 ring-1 ring-line transition-colors hover:bg-surface-hover"
            >
              <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-sky-ink">
                <FileText size={12} />
                {r.documentTitle}
                {refLabel(r.sourceRef) && <span className="font-normal text-ink-3">· {refLabel(r.sourceRef)}</span>}
              </p>
              <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-ink-2">{r.content}</p>
            </Link>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
