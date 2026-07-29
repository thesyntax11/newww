import { NextRequest, NextResponse } from "next/server";
import { readFileContent, readFileBuffer, listFiles } from "@/lib/virtualDisk";
import path from "path";

export const runtime = "nodejs";

const HTML_EXT = [".html", ".htm"];

/**
 * GET ?sessionId=...&file=index.html
 * Assembles a self-contained HTML document for live preview by:
 * 1. Reading the target HTML file
 * 2. Inlining any local <script src="..."> and <link href="..."> references
 *    that exist on the virtual disk
 * 3. Returning the result as text/html
 */
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  const filePath = req.nextUrl.searchParams.get("file");
  if (!sessionId || !filePath) {
    return NextResponse.json({ error: "sessionId ve file zorunludur." }, { status: 400 });
  }

  try {
    const ext = path.extname(filePath).toLowerCase();
    if (!HTML_EXT.includes(ext)) {
      return NextResponse.json(
        { error: "Canlı önizleme yalnızca HTML dosyaları için desteklenir." },
        { status: 400 }
      );
    }

    let html = readFileContent(sessionId, filePath);
    const dir = path.dirname(filePath);

    // Inline local <script src="..."> references
    html = html.replace(
      /<script\s+src=["']([^"']+)["']\s*><\/script>/g,
      (match, src: string) => {
        if (/^https?:\/\//.test(src)) return match; // skip external
        const resolved = resolvePath(dir, src);
        try {
          const content = readFileContent(sessionId, resolved);
          return `<script>\n${content}\n</script>`;
        } catch {
          return match;
        }
      }
    );

    // Inline local <link href="..."> references
    html = html.replace(
      /<link\s+[^>]*href=["']([^"']+)["'][^>]*>/g,
      (match, href: string) => {
        if (/^https?:\/\//.test(href)) return match;
        const resolved = resolvePath(dir, href);
        try {
          const content = readFileContent(sessionId, resolved);
          return `<style>\n${content}\n</style>`;
        } catch {
          return match;
        }
      }
    );

    // Inline local <img src="..."> references as base64
    html = html.replace(
      /(<img\s+[^>]*src=["'])([^"']+)(["'])/g,
      (match, prefix: string, src: string, suffix: string) => {
        if (/^https?:\/\//.test(src) || src.startsWith("data:")) return match;
        const resolved = resolvePath(dir, src);
        try {
          const buffer = readFileBuffer(sessionId, resolved);
          const ext = path.extname(resolved).toLowerCase();
          const mime =
            ext === ".png" ? "image/png" :
            ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" :
            ext === ".webp" ? "image/webp" :
            ext === ".gif" ? "image/gif" : "application/octet-stream";
          return `${prefix}data:${mime};base64,${buffer.toString("base64")}${suffix}`;
        } catch {
          return match;
        }
      }
    );

    // --- Self-healing: inject error capture script ---
    const healingScript = `<script>
(function(){
  var __sent = [];
  window.addEventListener('error', function(e){
    var detail = {
      type: e.type,
      message: e.message,
      filename: e.filename,
      lineno: e.lineno,
      colno: e.colno,
      stack: e.error && e.error.stack ? e.error.stack : ''
    };
    var key = detail.message + ':' + detail.lineno;
    if (__sent.indexOf(key) !== -1) return;
    __sent.push(key);
    parent.postMessage({ __aetherError: true, detail: detail }, '*');
  });
  window.addEventListener('unhandledrejection', function(e){
    var msg = e.reason && e.reason.message ? e.reason.message : String(e.reason);
    var stack = e.reason && e.reason.stack ? e.reason.stack : '';
    var key = 'rejection:' + msg;
    if (__sent.indexOf(key) !== -1) return;
    __sent.push(key);
    parent.postMessage({ __aetherError: true, detail: { type: 'unhandledrejection', message: msg, stack: stack, filename: '', lineno: 0, colno: 0 } }, '*');
  });
})();
</script>`;
    if (/<head[^>]*>/i.test(html)) {
      html = html.replace(/<head[^>]*>/i, (m) => m + healingScript);
    } else if (/<html[^>]*>/i.test(html)) {
      html = html.replace(/<html[^>]*>/i, (m) => m + `<head>${healingScript}</head>`);
    } else {
      html = healingScript + html;
    }

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Security-Policy": "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https: http:",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Önizleme oluşturulamadı." },
      { status: 500 }
    );
  }
}

function resolvePath(dir: string, rel: string): string {
  if (rel.startsWith("/")) return rel.slice(1);
  const parts = [...dir.split("/"), ...rel.split("/")];
  const resolved: string[] = [];
  for (const part of parts) {
    if (part === "" || part === ".") continue;
    if (part === "..") resolved.pop();
    else resolved.push(part);
  }
  return resolved.join("/");
}
