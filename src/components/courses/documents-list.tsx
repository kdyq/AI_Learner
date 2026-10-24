"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowsClockwise,
  FileDoc,
  FilePdf,
  FilePpt,
  FileText,
  SpinnerGap,
  TrashSimple,
  WarningCircle,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DocRow = {
  id: string;
  title: string;
  fileName: string;
  fileType: "pdf" | "docx" | "pptx" | "md" | "txt";
  fileSize: number;
  pageCount: number | null;
  charCount: number | null;
  status: "pending" | "parsing" | "ready" | "error";
  errorMessage: string | null;
  meta: Record<string, unknown> | null;
  createdAt: number;
};

const FILE_ICONS = { pdf: FilePdf, docx: FileDoc, pptx: FilePpt, md: FileText, txt: FileText };

const STATUS_UI: Record<DocRow["status"], { label: string; cls: string }> = {
  pending: { label: "排队中", cls: "bg-surface-hover text-ink-2" },
  parsing: { label: "解析中", cls: "bg-sky-bg text-sky-ink" },
  ready: { label: "就绪", cls: "bg-mint-bg text-mint-ink" },
  error: { label: "失败", cls: "bg-peach-bg text-peach-ink" },
};

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function DocumentsList({ courseId, initial }: { courseId: string; initial: DocRow[] }) {
  const router = useRouter();
  const [docs, setDocs] = useState(initial);

  // 解析中/排队中时轮询状态直至稳定
  const busy = docs.some((d) => d.status === "pending" || d.status === "parsing");
  useEffect(() => {
    if (!busy) return;
    const t = setInterval(async () => {
      const res = await fetch(`/api/documents?courseId=${courseId}`);
      if (res.ok) {
        const d = (await res.json()) as { documents: DocRow[] };
        setDocs(d.documents);
        router.refresh();
      }
    }, 1500);
    return () => clearInterval(t);
  }, [busy, courseId, router]);

  const reparse = async (id: string) => {
    const res = await fetch(`/api/documents/${id}/reparse`, { method: "POST" });
    if (res.ok) {
      toast.success("已重新加入解析队列");
      setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, status: "pending" } : d)));
    } else toast.error("操作失败");
  };

  const remove = async (id: string, title: string) => {
    if (!confirm(`删除「${title}」？其分块与引用将一并删除。`)) return;
    const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("已删除");
      setDocs((prev) => prev.filter((d) => d.id !== id));
      router.refresh();
    } else toast.error("删除失败");
  };

  if (docs.length === 0) {
    return (
      <div className="grid place-items-center gap-2 rounded-[18px] border-2 border-dashed border-line py-14 text-center">
        <FileText size={26} className="text-ink-3" />
        <p className="text-sm text-ink-2">还没有资料，点右上「上传资料」开始</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {docs.map((d) => {
        const Icon = FILE_ICONS[d.fileType];
        const st = STATUS_UI[d.status];
        const ocrPages = (d.meta?.needsOcrPages as number[] | undefined) ?? [];
        return (
          <li
            key={d.id}
            className={cn(
              "group rounded-[14px] bg-surface px-4 py-3 ring-1 ring-line transition-[transform,box-shadow] hover:-translate-y-[3px] hover:shadow-soft"
            )}
          >
            <div className="flex items-center gap-3">
              <Icon size={20} className="shrink-0 text-ink-2" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {d.status === "ready" ? (
                    <Link href={`/documents/${d.id}`} className="truncate text-[14px] font-semibold hover:text-primary">
                      {d.title}
                    </Link>
                  ) : (
                    <span className="truncate text-[14px] font-semibold">{d.title}</span>
                  )}
                  <span className={cn("rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold", st.cls)}>
                    {d.status === "parsing" && <SpinnerGap className="mr-1 inline animate-spin" size={11} />}
                    {st.label}
                  </span>
                </div>
                <p className="num mt-0.5 text-[12px] text-ink-3">
                  {fmtSize(d.fileSize)}
                  {d.pageCount ? ` · ${d.pageCount} ${d.fileType === "pptx" ? "页签" : "页"}` : ""}
                  {d.charCount ? ` · ${(d.charCount / 1000).toFixed(1)}k 字` : ""}
                  {d.status === "ready" && d.meta?.chunkCount ? ` · ${d.meta.chunkCount} 块` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                {d.status !== "pending" && d.status !== "parsing" && (
                  <Button variant="ghost" size="icon-sm" aria-label="重新解析" onClick={() => reparse(d.id)}>
                    <ArrowsClockwise size={15} />
                  </Button>
                )}
                <Button variant="ghost" size="icon-sm" aria-label="删除" className="hover:text-danger" onClick={() => remove(d.id, d.title)}>
                  <TrashSimple size={15} />
                </Button>
              </div>
            </div>
            {d.status === "error" && d.errorMessage && (
              <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-peach-bg px-3 py-2 text-[12.5px] text-peach-ink">
                <WarningCircle size={14} className="mt-0.5 shrink-0" />
                {d.errorMessage}
              </p>
            )}
            {d.status === "ready" && ocrPages.length > 0 && (
              <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-lemon-bg px-3 py-2 text-[12.5px] text-lemon-ink">
                <WarningCircle size={14} className="mt-0.5 shrink-0" />
                第 {ocrPages.join("、")} 页为扫描件，暂无法引用（OCR 将在后续版本提供）
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
