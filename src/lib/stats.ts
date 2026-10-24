import { db } from "@/db";
import { attempts, flashcards, knowledgePoints, studyEvents } from "@/db/schema";

export type StatsOverview = {
  heatmap: { date: string; count: number }[]; // 最近 84 天
  trend: { date: string; correct: number; total: number }[]; // 最近 30 天正确率
  mastery: { title: string; mastery: number; importance: "core" | "normal" }[]; // 掌握度 Top
  totals: {
    events: number;
    studyMinutes: number;
    cards: number;
    quizAttempts: number;
    quizCorrect: number;
    knowledgePoints: number;
  };
  streak: number;
};

function dayKey(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** 连续学习天数（今天或昨天起往前数） */
export function calcStreak(): number {
  const events = db.select({ createdAt: studyEvents.createdAt }).from(studyEvents).all();
  const days = new Set(events.map((e) => dayKey(e.createdAt)));
  let streak = 0;
  const cursor = new Date();
  // 今天没有学习不打断连续性（从昨天继续算）
  if (!days.has(dayKey(cursor.getTime()))) cursor.setDate(cursor.getDate() - 1);
  for (;;) {
    if (days.has(dayKey(cursor.getTime()))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else break;
  }
  return streak;
}

export function getStatsOverview(): StatsOverview {
  const now = Date.now();
  const DAY = 86400000;

  const events = db.select().from(studyEvents).all();
  const byDay = new Map<string, number>();
  for (const e of events) {
    const k = dayKey(e.createdAt);
    byDay.set(k, (byDay.get(k) ?? 0) + 1);
  }
  const heatmap: StatsOverview["heatmap"] = [];
  for (let i = 83; i >= 0; i--) {
    const k = dayKey(now - i * DAY);
    heatmap.push({ date: k, count: byDay.get(k) ?? 0 });
  }

  const quizAttempts = db.select().from(attempts).all();
  const quizByDay = new Map<string, { correct: number; total: number }>();
  for (const a of quizAttempts) {
    if (a.isCorrect === null) continue;
    const k = dayKey(a.createdAt);
    const cur = quizByDay.get(k) ?? { correct: 0, total: 0 };
    cur.total++;
    if (a.isCorrect) cur.correct++;
    quizByDay.set(k, cur);
  }
  const trend: StatsOverview["trend"] = [];
  for (let i = 29; i >= 0; i--) {
    const k = dayKey(now - i * DAY);
    const v = quizByDay.get(k);
    if (v && v.total > 0) trend.push({ date: k, correct: v.correct, total: v.total });
  }

  const mastery = db
    .select({ title: knowledgePoints.title, mastery: knowledgePoints.mastery, importance: knowledgePoints.importance })
    .from(knowledgePoints)
    .all()
    .sort((a, b) => b.mastery - a.mastery)
    .slice(0, 15);

  const cards = db.select().from(flashcards).all();
  const kps = db.select().from(knowledgePoints).all();

  return {
    heatmap,
    trend,
    mastery,
    totals: {
      events: events.length,
      studyMinutes: Math.round(events.reduce((s, e) => s + e.durationSec, 0) / 60),
      cards: cards.length,
      quizAttempts: quizAttempts.length,
      quizCorrect: quizAttempts.filter((a) => a.isCorrect).length,
      knowledgePoints: kps.length,
    },
    streak: calcStreak(),
  };
}
