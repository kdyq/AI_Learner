import type { Segment, SourceRef } from "@/lib/parsers/types";

/** 分块参数：目标 600 字 ±200，相邻重叠 80 字（DEV.md §8） */
const TARGET = 600;
const MAX = 800;
const OVERLAP = 80;

export type ChunkDraft = {
  content: string;
  sourceRef: SourceRef;
};

/** 按句子切分长文本（中文句读优先） */
function splitSentences(text: string): string[] {
  const parts = text
    .split(/(?<=[。！？；!?;\n])/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts : [text];
}

/**
 * 段落 → 块：结构段（页/页签/标题）不超过 MAX 直接成块；
 * 超长段按句子累积到 ~TARGET，相邻块间重叠 OVERLAP 字。
 */
export function chunkSegments(segments: Segment[]): ChunkDraft[] {
  const chunks: ChunkDraft[] = [];
  for (const seg of segments) {
    if (seg.text.length <= MAX) {
      chunks.push({ content: seg.text, sourceRef: seg.sourceRef });
      continue;
    }
    const sentences = splitSentences(seg.text);
    let buf = "";
    let prevTail = "";
    const push = () => {
      if (!buf) return;
      const body = prevTail ? prevTail + buf : buf;
      chunks.push({ content: body, sourceRef: seg.sourceRef });
      prevTail = buf.slice(Math.max(0, buf.length - OVERLAP));
      buf = "";
    };
    for (const s of sentences) {
      // 单句超长（无句读的极端情况）：硬切
      if (s.length > MAX) {
        for (let i = 0; i < s.length; i += TARGET) {
          buf += s.slice(i, i + TARGET);
          push();
        }
        continue;
      }
      if (buf.length + s.length > TARGET && buf.length >= TARGET - 200) {
        push();
      }
      buf += s;
    }
    push();
  }
  return chunks;
}
