import { NextRequest, NextResponse } from "next/server";
import { callProvider, getProvider } from "@/lib/providers";
import { buildSystemPrompt } from "@/lib/systemPrompt";
import { processAgentResponse } from "@/lib/agent";
import { readFileContent } from "@/lib/virtualDisk";
import { ChatMessage } from "@/lib/types";

export const runtime = "nodejs";

const MAX_HEAL_ROUNDS = 2;

interface RepairRequestBody {
  sessionId: string;
  providerId: string;
  apiKey: string;
  model?: string;
  filePath: string;
  error: {
    type?: string;
    message: string;
    filename?: string;
    lineno?: number;
    colno?: number;
    stack?: string;
  };
}

export async function POST(req: NextRequest) {
  let body: RepairRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const { sessionId, providerId, apiKey, model, filePath, error } = body;

  if (!sessionId || !providerId || !apiKey || !filePath || !error?.message) {
    return NextResponse.json(
      { error: "sessionId, providerId, apiKey, filePath ve error.message zorunludur." },
      { status: 400 }
    );
  }

  try {
    const provider = getProvider(providerId);
    let currentContent = "";
    try {
      currentContent = readFileContent(sessionId, filePath);
    } catch {
      return NextResponse.json({ error: "Dosya diskte bulunamadı." }, { status: 404 });
    }

    const errorReport = formatErrorReport(error, filePath);
    const healingSystem = buildHealingSystemPrompt(sessionId, filePath);

    let lastReply = "";
    let healed = false;
    const allThinking: string[] = [];
    const allWrittenFiles: { path: string; size: number; updatedAt: string }[] = [];

    for (let round = 0; round < MAX_HEAL_ROUNDS; round++) {
      const userPrompt = round === 0
        ? `Aşağıdaki HTML/JS dosyası canlı önizlemede çalıştırıldığında bir hata fırlattı.\n\nHATA RAPORU:\n${errorReport}\n\nMEVCUT DOSYA İÇERİĞİ (${filePath}):\n\`\`\`html\n${currentContent}\n\`\`\`\n\nLütfen hatayı analiz et, düzelt ve dosyanın TAMAMINI <file path="${filePath}"> etiketleri içinde yeniden üret. Yalnızca hatalı kısmı değil, tüm dosyayı ver.`
        : `Önceki düzeltme yeterli olmadı. Hata hâlâ devam ediyor:\n\nHATA RAPORU:\n${errorReport}\n\nDOSYANIN SON HALİ (${filePath}):\n\`\`\`html\n${currentContent}\n\`\`\`\n\nKök nedeni bul ve dosyanın TAMAMINI düzelt. <file path="${filePath}"> etiketleri içinde üret.`;

      const messages: ChatMessage[] = [{ role: "user", content: userPrompt }];
      const rawText = await callProvider(providerId, apiKey, messages, healingSystem, model, []);

      const { chatText, writtenFiles, thinking } = processAgentResponse(sessionId, rawText);
      allThinking.push(...thinking);
      allWrittenFiles.push(...writtenFiles);

      if (writtenFiles.length > 0) {
        try {
          currentContent = readFileContent(sessionId, filePath);
          healed = true;
          lastReply = chatText;
          break;
        } catch {
          // file wasn't written properly
        }
      }

      lastReply = chatText;
    }

    return NextResponse.json({
      healed,
      reply: lastReply,
      thinking: allThinking,
      writtenFiles: allWrittenFiles,
      rounds: allWrittenFiles.length > 0 ? 1 : 0
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Onarım sırasında bilinmeyen hata." },
      { status: 502 }
    );
  }
}

function formatErrorReport(error: RepairRequestBody["error"], filePath: string): string {
  const lines: string[] = [];
  lines.push(`Dosya: ${filePath}`);
  lines.push(`Hata tipi: ${error.type || "error"}`);
  lines.push(`Mesaj: ${error.message}`);
  if (error.lineno) lines.push(`Satır: ${error.lineno}${error.colno ? `, Sütun: ${error.colno}` : ""}`);
  if (error.filename) lines.push(`Kaynak: ${error.filename}`);
  if (error.stack) lines.push(`Stack trace:\n${error.stack}`);
  return lines.join("\n");
}

function buildHealingSystemPrompt(sessionId: string, filePath: string): string {
  const base = buildSystemPrompt(sessionId);
  return `${base}

---

## OTOMATİK HATA ONARIM MODU (Self-Healing)

Şu an canlı önizlemede patlayan bir JavaScript hatasını düzeltmen gerekiyor.
Dosya: ${filePath}

Kurallar:
1. Hatayı dikkatle analiz et — satır numarası ve hata mesajını kullan.
2. Kök nedeni bul, semptomu maskeleme.
3. Dosyanın TAMAMINI düzeltilmiş halde <file path="${filePath}"> etiketleri içinde üret.
4. Yalnızca hatalı satırı değil, tüm dosyayı ver — kısmi düzeltme kabul edilmez.
5. Düzeltmenin başka kısımları kırmadığından emin ol.
6. <think> bloğunda önce hatayı teşhis et, sonra düzeltme stratejisini yaz.`;
}
