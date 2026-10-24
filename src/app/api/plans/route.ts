import { NextResponse } from "next/server";
import { listPlans } from "@/lib/plan";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ plans: listPlans() });
}
