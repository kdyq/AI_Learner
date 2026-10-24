import { NextResponse } from "next/server";
import { db } from "@/db";
import { flashcards } from "@/db/schema";
import { todayQueue } from "@/lib/fsrs";

export const runtime = "nodejs";

export async function GET() {
  const queue = todayQueue();
  const all = db.select().from(flashcards).all();
  return NextResponse.json({
    queue: queue.map((r) => ({
      id: r.id,
      courseId: r.courseId,
      knowledgePointId: r.knowledgePointId,
      front: r.front,
      back: r.back,
      state: r.state,
      due: r.due,
      reps: r.reps,
    })),
    stats: {
      dueNow: queue.length,
      total: all.length,
      new: all.filter((r) => r.state === "new").length,
      learning: all.filter((r) => r.state === "learning" || r.state === "relearning").length,
      review: all.filter((r) => r.state === "review").length,
    },
  });
}
