import path from "path";
import { listFiles, readFileContent, readFileBuffer } from "./virtualDisk";
import { ImageAttachment } from "./types";

const READABLE_EXT = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".mdx", ".css", ".scss",
  ".html", ".txt", ".yml", ".yaml", ".py", ".sql", ".sh", ".env", ".xml",
  ".csv", ".graphql", ".prisma"
]);

const IMAGE_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif"
};

const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 3_500_000;

const MAX_FILE_CHARS = 6000;
const MAX_TOTAL_CHARS = 32000;

/**
 * Sanal diskteki mevcut proje dosyalarını ve /_uploads altındaki
 * yüklenmiş dosyaları modele "okutmak" için tek bir bağlam metni üretir.
 * Böylece agent, sohbet geçmişinden bağımsız olarak projenin tamamını
 * ve kullanıcının yüklediği referans dosyaları görerek karar verir.
 */
export function buildReferenceContext(sessionId: string): string {
  const files = listFiles(sessionId);
  if (files.length === 0) return "Sanal disk şu an boş, yüklenmiş referans dosyası yok.";

  let total = 0;
  const included: string[] = [];
  const skipped: string[] = [];

  for (const file of files) {
    const ext = path.extname(file.path).toLowerCase();
    const isUpload = file.path.startsWith("_uploads/");
    const tag = isUpload ? "uploaded-file" : "existing-file";

    if (!READABLE_EXT.has(ext) || file.size > 60_000 || total >= MAX_TOTAL_CHARS) {
      skipped.push(`${file.path} (${file.size} bayt)`);
      continue;
    }

    try {
      const content = readFileContent(sessionId, file.path).slice(0, MAX_FILE_CHARS);
      total += content.length;
      included.push(`<${tag} path="${file.path}">\n${content}\n</${tag}>`);
    } catch {
      skipped.push(file.path);
    }
  }

  const skippedBlock =
    skipped.length > 0
      ? `\n\nİçeriği taşınmayan (yalnızca yol/boyut bilgisi verilen) dosyalar:\n${skipped
          .map((s) => `- ${s}`)
          .join("\n")}`
      : "";

  return `${included.join("\n\n")}${skippedBlock}`;
}

/**
 * `_uploads/` altındaki görsel dosyaları base64 olarak toplar. Bu ekler,
 * vision destekleyen sağlayıcılara (OpenAI, Anthropic, Gemini) sohbet
 * isteğiyle birlikte gönderilir; model görseli gerçekten "görür".
 * En fazla MAX_IMAGES adet, en yeni yüklenenden başlanarak eklenir.
 */
export function buildImageAttachments(sessionId: string): ImageAttachment[] {
  const files = listFiles(sessionId)
    .filter((f) => f.path.startsWith("_uploads/"))
    .filter((f) => IMAGE_MIME[path.extname(f.path).toLowerCase()])
    .filter((f) => f.size <= MAX_IMAGE_BYTES)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, MAX_IMAGES);

  const images: ImageAttachment[] = [];
  for (const file of files) {
    try {
      const buffer = readFileBuffer(sessionId, file.path);
      images.push({
        path: file.path,
        mime: IMAGE_MIME[path.extname(file.path).toLowerCase()],
        base64: buffer.toString("base64")
      });
    } catch {
      // okunamayan görsel sessizce atlanır
    }
  }
  return images;
}
