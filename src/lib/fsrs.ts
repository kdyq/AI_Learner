import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { flashcards, knowledgePoints, reviewLogs } from "@/db/schema";
import {
  fsrs,
  generatorParameters,
  createEmptyCard,
  Rating,
  type Card as FsrsCard,
  type RecordLogItem,
} from "ts-fsrs";
import { recordEvent } from "./study";

const scheduler = fsrs(generatorParameters({ enable_fuzz: true }));

export type RatingName = "again" | "hard" | "good" | "easy";

const RATING_MAP: Record<RatingName, Rating> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

type FlashcardRow = typeof flashcards.$inferSelect;

/** 行 → ts-fsrs Card（due/lastReview 转 Date） */
function toFsrsCard(row: FlashcardRow): FsrsCard {
  const base = createEmptyCard(new Date(row.createdAt));
  return {
    ...base,
    due: new Date(row.due),
    stability: row.stability || base.stability,
    difficulty: row.difficulty || base.difficulty,
    elapsed_days: row.elapsedDays,
    scheduled_days: row.scheduledDays,
    reps: row.reps,
    lapses: row.lapses,
    state: ({ new: 0, learning: 1, review: 2, relearning: 3 } as const)[row.state],
    last_review: row.lastReviewAt ? new Date(row.lastReviewAt) : undefined,
  };
}

/** 评分一张卡：FSRS 调度 → 更新卡 + 写复习日志 + 联动知识点掌握度 */
export function answerCard(cardId: string, ratingName: RatingName) {
  const row = db.select().from(flashcards).where(eq(flashcards.id, cardId)).get();
  if (!row) throw new Error("卡片不存在");
  const rating = RATING_MAP[ratingName];
  const now = new Date();
  const prev = toFsrsCard(row);
  const log = scheduler.repeat(prev, now);
  const item = (log as unknown as Record<Rating, RecordLogItem>)[rating];
  const next = item.card;

  const elapsedDays = row.lastReviewAt
    ? Math.max(0, Math.floor((now.getTime() - row.lastReviewAt) / 86400000))
    : 0;

  db.update(flashcards)
    .set({
      due: next.due.getTime(),
      stability: next.stability,
      difficulty: next.difficulty,
      elapsedDays: next.elapsed_days,
      scheduledDays: next.scheduled_days,
      reps: next.reps,
      lapses: next.lapses,
      state: (["new", "learning", "review", "relearning"] as const)[next.state],
      lastReviewAt: now.getTime(),
    })
    .where(eq(flashcards.id, cardId))
    .run();

  db.insert(reviewLogs)
    .values({
      id: crypto.randomUUID(),
      cardId,
      rating: ratingName,
      reviewedAt: now.getTime(),
      scheduledDays: next.scheduled_days,
      elapsedDays,
    })
    .run();

  // 知识点掌握度联动：again -10 / hard +2 / good +6 / easy +8（上限 100）
  if (row.knowledgePointId) {
    const kp = db.select().from(knowledgePoints).where(eq(knowledgePoints.id, row.knowledgePointId)).get();
    if (kp) {
      const delta = { again: -10, hard: 2, good: 6, easy: 8 }[ratingName];
      db.update(knowledgePoints)
        .set({ mastery: Math.min(100, Math.max(0, kp.mastery + delta)), updatedAt: Date.now() })
        .where(eq(knowledgePoints.id, kp.id))
        .run();
    }
  }

  recordEvent("review", { courseId: row.courseId, meta: { cardId, rating: ratingName } });

  return {
    due: next.due.getTime(),
    scheduledDays: next.scheduled_days,
    state: (["new", "learning", "review", "relearning"] as const)[next.state],
  };
}

/** 今日到期队列（due <= 现在），新卡优先、其余按到期先后 */
export function todayQueue(limit = 50) {
  const now = Date.now();
  const rows = db.select().from(flashcards).all();
  return rows
    .filter((r) => r.due <= now)
    .sort((a, b) => {
      if ((a.state === "new") !== (b.state === "new")) return a.state === "new" ? -1 : 1;
      return a.due - b.due;
    })
    .slice(0, limit);
}

/** 知识点 → 闪卡（front=标题 back=内容；跳过已转过的） */
export function cardsFromKnowledge(knowledgePointIds: string[]) {
  const kps = knowledgePointIds.length
    ? db.select().from(knowledgePoints).where(inArray(knowledgePoints.id, knowledgePointIds)).all()
    : [];
  const existing = new Set(
    db.select({ kpid: flashcards.knowledgePointId }).from(flashcards).all()
      .map((r) => r.kpid)
      .filter(Boolean)
  );
  const created = [];
  for (const kp of kps) {
    if (existing.has(kp.id)) continue;
    const row = {
      id: crypto.randomUUID(),
      courseId: kp.courseId,
      knowledgePointId: kp.id,
      questionId: null,
      front: kp.title,
      back: kp.content,
      createdAt: Date.now(),
    };
    db.insert(flashcards).values(row).run();
    created.push(row);
  }
  return { created: created.length };
}

/** Anki CSV 导出（front,back,tag） */
export function ankiCsv(courseId?: string): string {
  const rows = courseId
    ? db.select().from(flashcards).where(eq(flashcards.courseId, courseId)).all()
    : db.select().from(flashcards).all();
  const esc = (s: string) => `"${s.replace(/"/g, '""').replace(/\n/g, "<br>")}"`;
  const lines = ["#separator:Comma", "#html:true", "#tags column:3"];
  for (const r of rows) {
    lines.push([esc(r.front), esc(r.back), esc("拾知")].join(","));
  }
  return lines.join("\n");
}
