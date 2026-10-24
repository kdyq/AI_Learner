import { db } from "@/db";
import { studyEvents } from "@/db/schema";

type EventType = "chat" | "quiz" | "review" | "upload" | "flashcard";

/** 学习事件埋点（热力图/统计用） */
export function recordEvent(
  type: EventType,
  opts: { courseId?: string | null; durationSec?: number; meta?: Record<string, unknown> } = {}
) {
  try {
    db.insert(studyEvents)
      .values({
        id: crypto.randomUUID(),
        type,
        courseId: opts.courseId ?? null,
        durationSec: opts.durationSec ?? 0,
        meta: opts.meta ?? null,
        createdAt: Date.now(),
      })
      .run();
  } catch {
    // 埋点失败不影响主流程
  }
}
