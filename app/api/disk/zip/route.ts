import { NextRequest, NextResponse } from "next/server";
import archiver from "archiver";
import { PassThrough } from "stream";
import { diskRootForSession, listFiles } from "@/lib/virtualDisk";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId parametresi zorunludur." }, { status: 400 });
  }

  const files = listFiles(sessionId);
  if (files.length === 0) {
    return NextResponse.json({ error: "Sanal diskte henüz dosya yok." }, { status: 404 });
  }

  const root = diskRootForSession(sessionId);
  const archive = archiver("zip", { zlib: { level: 9 } });
  const stream = new PassThrough();
  archive.pipe(stream);
  archive.directory(root, false);
  archive.finalize();

  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk as Uint8Array);
  }
  const buffer = Buffer.concat(chunks);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="aether-project-${sessionId}.zip"`
    }
  });
}
