import { NextRequest, NextResponse } from "next/server";
import { generateCommitMessage } from "@/lib/intelligence";
import { listFiles } from "@/lib/virtualDisk";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { sessionId: string; providerId: string; apiKey: string; model?: string; changes?: { path: string; action: string }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const { sessionId, providerId, apiKey, model, changes } = body;
  if (!sessionId || !providerId || !apiKey) {
    return NextResponse.json({ error: "sessionId, providerId ve apiKey zorunludur." }, { status: 400 });
  }

  const fileChanges = changes || listFiles(sessionId).map((f) => ({ path: f.path, action: "modified" as const }));

  try {
    const commit = await generateCommitMessage(sessionId, fileChanges as any, providerId, apiKey, model);
    return NextResponse.json(commit);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Commit mesajı oluşturulamadı" }, { status: 500 });
  }
}
