import { NextResponse } from "next/server";
import { cardsFromKnowledge } from "@/lib/fsrs";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { knowledgePointIds } = (await req.json()) as { knowledgePointIds?: string[] };
  if (!Array.isArray(knowledgePointIds) || knowledgePointIds.length === 0) {
    return NextResponse.json({ error: "缺少 knowledgePointIds" }, { status: 400 });
  }
  const result = cardsFromKnowledge(knowledgePointIds);
  return NextResponse.json(result, { status: 201 });
}
