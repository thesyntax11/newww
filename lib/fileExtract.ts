// pdf-parse ve mammoth'un tip tanımları eksik/uyumsuz olabildiği için
// içe aktarımlar require ile yapılır.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require("pdf-parse");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mammoth = require("mammoth");

const MAX_EXTRACTED_CHARS = 40_000;

/** PDF içeriğini düz metne çevirir. Başarısız olursa boş döner. */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer);
    return (data.text || "").trim().slice(0, MAX_EXTRACTED_CHARS);
  } catch {
    return "";
  }
}

/** DOCX içeriğini düz metne çevirir. Başarısız olursa boş döner. */
export async function extractDocxText(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return (result.value || "").trim().slice(0, MAX_EXTRACTED_CHARS);
  } catch {
    return "";
  }
}
