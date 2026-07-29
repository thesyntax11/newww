import { NextRequest, NextResponse } from "next/server";
import { readFileContent, readFileBuffer, writeFile, buildTree } from "@/lib/virtualDisk";
import path from "path";

export const runtime = "nodejs";

const BINARY_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".pdf", ".docx", ".zip", ".glb", ".gltf", ".bin"]);

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  const filePath = req.nextUrl.searchParams.get("path");
  if (!sessionId || !filePath) return NextResponse.json({ error: "sessionId ve path zorunludur." }, { status: 400 });
  try {
    const ext = path.extname(filePath).toLowerCase();
    if (BINARY_EXT.has(ext)) {
      const buffer = readFileBuffer(sessionId, filePath);
      return NextResponse.json({ path: filePath, binary: true, base64: buffer.toString("base64"), size: buffer.length, mime: getMime(ext) });
    }
    const content = readFileContent(sessionId, filePath);
    return NextResponse.json({ path: filePath, binary: false, content, size: content.length });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Dosya okunamadı." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: { sessionId: string; path: string; content: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 }); }
  const { sessionId, path: filePath, content } = body;
  if (!sessionId || !filePath || typeof content !== "string") return NextResponse.json({ error: "sessionId, path ve content zorunludur." }, { status: 400 });
  try {
    const file = writeFile(sessionId, filePath, content);
    return NextResponse.json({ ok: true, file, tree: buildTree(sessionId) });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Dosya yazılamadı." }, { status: 500 });
  }
}

function getMime(ext: string): string {
  const map: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".pdf": "application/pdf", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".zip": "application/zip" };
  return map[ext] || "application/octet-stream";
}
