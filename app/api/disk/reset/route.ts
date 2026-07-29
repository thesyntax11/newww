import { NextRequest, NextResponse } from "next/server";
import { resetDisk } from "@/lib/virtualDisk";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { sessionId } = await req.json().catch(() => ({ sessionId: null }));
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId zorunludur." }, { status: 400 });
  }

  try {
    resetDisk(sessionId);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Disk sıfırlanamadı." }, { status: 500 });
  }
}
