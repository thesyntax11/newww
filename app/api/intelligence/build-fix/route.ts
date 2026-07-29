import { NextRequest, NextResponse } from "next/server";
import { diagnoseBuildError } from "@/lib/intelligence";
import { writeFile } from "@/lib/virtualDisk";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { sessionId: string; buildLog: string; providerId: string; apiKey: string; model?: string; applyFixes?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const { sessionId, buildLog, providerId, apiKey, model, applyFixes } = body;
  if (!sessionId || !buildLog || !providerId || !apiKey) {
    return NextResponse.json({ error: "sessionId, buildLog, providerId ve apiKey zorunludur." }, { status: 400 });
  }

  try {
    const result = await diagnoseBuildError(sessionId, buildLog, providerId, apiKey, model);

    if (applyFixes && result.fixedFiles.length > 0) {
      for (const file of result.fixedFiles) {
        try {
          writeFile(sessionId, file.path, file.content);
        } catch {}
      }
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Build hatası analizi başarısız" }, { status: 500 });
  }
}
