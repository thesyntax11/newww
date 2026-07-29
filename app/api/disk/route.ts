import { NextRequest, NextResponse } from "next/server";
import { buildTree, listFiles } from "@/lib/virtualDisk";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId parametresi zorunludur." }, { status: 400 });
  }

  try {
    return NextResponse.json({
      tree: buildTree(sessionId),
      files: listFiles(sessionId)
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Disk okunamadı." }, { status: 500 });
  }
}
