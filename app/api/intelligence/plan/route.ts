import { NextRequest, NextResponse } from "next/server";
import { createProjectPlan } from "@/lib/intelligence";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { sessionId: string; query: string; providerId: string; apiKey: string; model?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const { sessionId, query, providerId, apiKey, model } = body;
  if (!sessionId || !query || !providerId || !apiKey) {
    return NextResponse.json({ error: "sessionId, query, providerId ve apiKey zorunludur." }, { status: 400 });
  }

  try {
    const plan = await createProjectPlan(sessionId, query, providerId, apiKey, model);
    return NextResponse.json(plan);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Plan oluşturulamadı" }, { status: 500 });
  }
}
