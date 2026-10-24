import { NextResponse } from "next/server";
import { getStatsOverview } from "@/lib/stats";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(getStatsOverview());
}
