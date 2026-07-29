import { NextRequest, NextResponse } from "next/server";
import {
  addEnhancedMemory,
  getEnhancedMemories,
  searchEnhancedMemories,
  deleteEnhancedMemory,
  clearEnhancedSessionMemories
} from "@/lib/enhancedMemory";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  const q = req.nextUrl.searchParams.get("q");
  if (!sessionId) return NextResponse.json({ error: "sessionId zorunludur." }, { status: 400 });
  try {
    const memories = q ? await searchEnhancedMemories(sessionId, q) : await getEnhancedMemories(sessionId);
    return NextResponse.json({ memories });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Hafıza okunamadı." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.sessionId || !body?.content) return NextResponse.json({ error: "sessionId ve content zorunludur." }, { status: 400 });
  try {
    const memory = await addEnhancedMemory(
      body.sessionId,
      body.content,
      {
        category: body.category || "general",
        importance: body.importance || 5,
        tags: body.tags || [],
        project: body.project || "",
        language: body.language || "",
        summary: body.summary || ""
      },
      body.openaiKey
    );
    return NextResponse.json({ memory });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Hafıza eklenemedi." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.sessionId) return NextResponse.json({ error: "sessionId zorunludur." }, { status: 400 });
  try {
    if (body.memoryId) return NextResponse.json({ ok: await deleteEnhancedMemory(body.memoryId) });
    return NextResponse.json({ ok: await clearEnhancedSessionMemories(body.sessionId) });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Hafıza silinemedi." }, { status: 500 });
  }
}
