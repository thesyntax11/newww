import { NextRequest, NextResponse } from "next/server";
import { analyzeCodeQuality } from "@/lib/intelligence";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { sessionId: string; providerId: string; apiKey: string; model?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const { sessionId, providerId, apiKey, model } = body;
  if (!sessionId || !providerId || !apiKey) {
    return NextResponse.json({ error: "sessionId, providerId ve apiKey zorunludur." }, { status: 400 });
  }

  try {
    const report = await analyzeCodeQuality(sessionId, providerId, apiKey, model);
    return NextResponse.json(report);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Kalite analizi başarısız" }, { status: 500 });
  }
}
