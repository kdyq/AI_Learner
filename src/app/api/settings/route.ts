import { NextResponse } from "next/server";
import { getAiSettings, saveAiSettings, type AiSettings } from "@/lib/ai/settings";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ ai: getAiSettings() });
}

export async function PUT(req: Request) {
  const body = (await req.json()) as Partial<AiSettings>;
  const saved = saveAiSettings(body);
  return NextResponse.json({ ai: saved });
}
