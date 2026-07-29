import { NextRequest, NextResponse } from "next/server";
import { addMemory, getMemories, searchMemories, deleteMemory, clearSessionMemories } from "@/lib/memory";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  const q = req.nextUrl.searchParams.get("q");
  if (!sessionId) return NextResponse.json({ error: "sessionId zorunludur." }, { status: 400 });
  try {
    const memories = q ? await searchMemories(sessionId, q) : await getMemories(sessionId);
    return NextResponse.json({ memories });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Hafıza okunamadı." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.sessionId || !body?.content) return NextResponse.json({ error: "sessionId ve content zorunludur." }, { status: 400 });
  try {
    const memory = await addMemory(body.sessionId, body.content, body.category || "general", body.importance || 5);
    return NextResponse.json({ memory });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Hafıza eklenemedi." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.sessionId) return NextResponse.json({ error: "sessionId zorunludur." }, { status: 400 });
  try {
    if (body.memoryId) return NextResponse.json({ ok: await deleteMemory(body.memoryId) });
    return NextResponse.json({ ok: await clearSessionMemories(body.sessionId) });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Hafıza silinemedi." }, { status: 500 });
  }
}
