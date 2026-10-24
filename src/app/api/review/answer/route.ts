import { NextResponse } from "next/server";
import { answerCard, type RatingName } from "@/lib/fsrs";

export const runtime = "nodejs";

const VALID: RatingName[] = ["again", "hard", "good", "easy"];

export async function POST(req: Request) {
  const { cardId, rating } = (await req.json()) as { cardId?: string; rating?: string };
  if (!cardId || !VALID.includes(rating as RatingName)) {
    return NextResponse.json({ error: "缺少 cardId 或 rating 非法" }, { status: 400 });
  }
  try {
    const result = answerCard(cardId, rating as RatingName);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 404 });
  }
}
