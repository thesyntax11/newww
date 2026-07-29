import { ToolResult, ToolContext } from "./types";
import { writeBinaryFile } from "../virtualDisk";

const MAX_IMAGE_BYTES = 4_000_000;

export async function generateImage(prompt: string, ctx: ToolContext): Promise<ToolResult> {
  if (!ctx.openaiApiKey) return { tool: "image_generation", ok: false, output: "Görsel üretimi için OpenAI API anahtarı gerekli." };
  const clean = prompt.trim().slice(0, 1000);
  if (!clean) return { tool: "image_generation", ok: false, output: "Boş prompt." };
  try {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${ctx.openaiApiKey}` },
      body: JSON.stringify({ model: "gpt-image-1", prompt: clean, n: 1, size: "1024x1024", response_format: "b64_json" }),
      signal: AbortSignal.timeout(60_000)
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return { tool: "image_generation", ok: false, output: `Görsel üretimi başarısız (${res.status}): ${t.slice(0, 200)}` };
    }
    const json = await res.json();
    const b64 = json?.data?.[0]?.b64_json;
    const url = json?.data?.[0]?.url;
    if (b64) {
      const buffer = Buffer.from(b64, "base64");
      if (buffer.length > MAX_IMAGE_BYTES) return { tool: "image_generation", ok: false, output: "Üretilen görsel boyut limitini aşıyor." };
      const relPath = `_generated/img_${Date.now()}.png`;
      writeBinaryFile(ctx.sessionId, relPath, buffer);
      return { tool: "image_generation", ok: true, output: `Görsel üretildi ve sanal diske yazıldı: ${relPath}`, data: { path: relPath } };
    }
    if (url) return { tool: "image_generation", ok: true, output: `Görsel üretildi (URL): ${url}` };
    return { tool: "image_generation", ok: false, output: "Görsel API boş yanıt döndü." };
  } catch (err: any) {
    return { tool: "image_generation", ok: false, output: `Görsel üretim hatası: ${err?.message || "bilinmeyen hata"}` };
  }
}
