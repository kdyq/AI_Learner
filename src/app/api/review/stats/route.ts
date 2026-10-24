import { NextResponse } from "next/server";
import { db } from "@/db";
import { flashcards, reviewLogs } from "@/db/schema";

export const runtime = "nodejs";

export async function GET() {
  const cards = db.select().from(flashcards).all();
  const logs = db.select().from(reviewLogs).all();
  const now = Date.now();
  return NextResponse.json({
    total: cards.length,
    dueNow: cards.filter((c) => c.due <= now).length,
    new: cards.filter((c) => c.state === "new").length,
    learning: cards.filter((c) => c.state === "learning" || c.state === "relearning").length,
    review: cards.filter((c) => c.state === "review").length,
    reviewsToday: logs.filter((l) => new Date(l.reviewedAt).toDateString() === new Date().toDateString()).length,
    reviewsTotal: logs.length,
  });
}
