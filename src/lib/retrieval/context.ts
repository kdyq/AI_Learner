import type { RetrievedChunk } from "./hybrid";

export type ContextCitation = {
  n: number;
  chunkId: string;
  documentId: string;
  label: string;
  page?: number;
  slide?: number;
};

function refText(c: RetrievedChunk): string {
  const r = c.sourceRef;
  if (r.page) return `第 ${r.page} 页`;
  if (r.slide) return `页签 ${r.slide}`;
  if (r.heading) return `「${r.heading}」`;
  return "全文";
}

/** 检索块 → 编号上下文文本 + 引用映射（[n] 角标依据） */
export function buildNumberedContext(chunks: RetrievedChunk[]): {
  text: string;
  citations: ContextCitation[];
} {
  const parts: string[] = [];
  const citations: ContextCitation[] = [];
  chunks.forEach((c, i) => {
    const n = i + 1;
    parts.push(`[${n}] 来源：${c.documentTitle} · ${refText(c)}\n${c.content}`);
    citations.push({
      n,
      chunkId: c.chunkId,
      documentId: c.documentId,
      label: `${c.documentTitle} · ${refText(c)}`,
      page: c.sourceRef.page,
      slide: c.sourceRef.slide,
    });
  });
  return { text: parts.join("\n\n"), citations };
}
