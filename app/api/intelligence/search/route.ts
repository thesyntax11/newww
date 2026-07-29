import { NextRequest, NextResponse } from "next/server";
import { searchCode } from "@/lib/intelligence";

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
    const results = await searchCode(sessionId, query, providerId, apiKey, model);
    return NextResponse.json({ results });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Arama başarısız" }, { status: 500 });
  }
}
