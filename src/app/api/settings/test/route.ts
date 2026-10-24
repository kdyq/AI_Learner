import { NextResponse } from "next/server";
import { testConnection } from "@/lib/ai/test-connection";
import type { SlotName } from "@/lib/ai/settings";

export const runtime = "nodejs";

const SLOTS: SlotName[] = ["chat", "vision", "embedding"];

export async function POST(req: Request) {
  const { slot } = (await req.json()) as { slot: string };
  if (!SLOTS.includes(slot as SlotName)) {
    return NextResponse.json({ error: "未知槽位" }, { status: 400 });
  }
  const result = await testConnection(slot as SlotName);
  return NextResponse.json(result);
}
