import { NextRequest, NextResponse } from "next/server";
import { callProvider, getProvider } from "@/lib/providers";
import { buildSystemPrompt } from "@/lib/systemPrompt";
import { buildImageAttachments } from "@/lib/context";
import { processAgentResponse } from "@/lib/agent";
import { addMemory } from "@/lib/memory";
import { buildMemoryContext } from "@/lib/memory";
import { buildRagContext } from "@/lib/vectorStore";
import { ChatMessage } from "@/lib/types";

export const runtime = "nodejs";

const MAX_TOOL_ROUNDS = 3;
const MEMORY_KEYWORDS = [
  "unutma", "hatırla", "beni hatırla", "bunu kaydet",
  "unutma ki", "not al", "remember", "note that"
];

interface ChatRequestBody {
  sessionId: string;
  providerId: string;
  apiKey: string;
  model?: string;
  messages: ChatMessage[];
}

function maybeAutoMemorize(sessionId: string, userText: string) {
  const lower = userText.toLowerCase();
  if (!MEMORY_KEYWORDS.some((k) => lower.includes(k))) return;
  const content = userText.trim().slice(0, 500);
  if (content.length > 10) {
    addMemory(sessionId, content, "explicit", 8).catch(() => {});
  }
}

export async function POST(req: NextRequest) {
  let body: ChatRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const { sessionId, providerId, apiKey, model, messages } = body;

  if (!sessionId || !providerId || !apiKey || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: "sessionId, providerId, apiKey ve messages alanları zorunludur." },
      { status: 400 }
    );
  }

  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  const userQuery = lastUserMsg?.content || "";
  const openaiKey = providerId === "openai" ? apiKey : undefined;

  maybeAutoMemorize(sessionId, userQuery);

  try {
    const provider = getProvider(providerId);
    let workingMessages = [...messages];
    const allWrittenFiles: { path: string; size: number; updatedAt: string }[] = [];
    const allThinking: string[] = [];
    let finalReply = "";
    let toolRound = 0;

    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const system = await buildEnhancedSystemPrompt(sessionId, userQuery, openaiKey);
      const images = buildImageAttachments(sessionId);
      const effectiveImages = provider.supportsVision ? images : [];

      const rawText = await callProvider(
        providerId,
        apiKey,
        workingMessages,
        system,
        model,
        effectiveImages
      );

      const { chatText, writtenFiles, thinking, toolCalls } = processAgentResponse(
        sessionId,
        rawText
      );
      allWrittenFiles.push(...writtenFiles);
      allThinking.push(...thinking);

      if (toolCalls.length === 0 || toolRound >= MAX_TOOL_ROUNDS) {
        finalReply = chatText;
        break;
      }

      toolRound++;
      const { runToolCalls } = await import("@/lib/agent");
      const toolResults = await runToolCalls(toolCalls, { sessionId, openaiApiKey: openaiKey });

      workingMessages = [
        ...workingMessages,
        { role: "assistant" as const, content: chatText },
        { role: "user" as const, content: `[Araç sonuçları]\n${toolResults}` }
      ];

      if (round === MAX_TOOL_ROUNDS - 1) {
        finalReply = chatText;
        break;
      }
    }

    return NextResponse.json({
      reply: finalReply,
      thinking: allThinking,
      writtenFiles: allWrittenFiles,
      imagesSeen: provider.supportsVision ? buildImageAttachments(sessionId).map((i) => i.path) : []
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Sağlayıcı isteği sırasında bilinmeyen bir hata oluştu." },
      { status: 502 }
    );
  }
}

async function buildEnhancedSystemPrompt(
  sessionId: string,
  userQuery: string,
  openaiKey?: string
): Promise<string> {
  const [memoryContext, ragContext] = await Promise.all([
    buildMemoryContext(sessionId),
    buildRagContext(sessionId, userQuery, openaiKey)
  ]);

  const base = buildSystemPrompt(sessionId);
  const ragBlock = ragContext ? `\n\n${ragContext}\n\n---\n\n` : "";

  return `${base}

---

${memoryContext}

---${ragBlock}
Şimdi kullanıcının isteğini bu bağlam ve kurallar çerçevesinde yanıtla.`;
}
