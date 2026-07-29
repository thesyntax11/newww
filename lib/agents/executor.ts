import { callProvider } from "../providers";
import { buildSystemPrompt } from "../systemPrompt";
import { buildReferenceContext, buildImageAttachments } from "../context";
import { processAgentResponse, runToolCalls } from "../agent";
import { buildEnhancedMemoryContext } from "../enhancedMemory";
import { buildRagContext } from "../vectorStore";
import { AgentTask, TaskResult, WorkflowContext } from "./types";

const MAX_TOOL_ROUNDS = 3;
const MAX_RETRIES = 2;

function buildExecutorSystem(
  sessionId: string,
  task: AgentTask,
  allTasks: AgentTask[],
  memoryContext: string,
  ragContext: string,
  extraInstructions?: string
): string {
  const base = buildSystemPrompt(sessionId);
  const referenceContext = buildReferenceContext(sessionId);

  const taskList = allTasks
    .map((t) => `- [${t.status}] ${t.index + 1}. ${t.title}${t.resultSummary ? ` → ${t.resultSummary}` : ""}`)
    .join("\n");

  const previousResults = allTasks
    .filter((t) => t.index < task.index && t.resultSummary)
    .map((t) => `- ${t.title}: ${t.resultSummary}`)
    .join("\n") || "(bu ilk görev)";

  return `${base}

---

## EXECUTOR AGENT ROLÜ

Şu an çoklu-agent hattının EXECUTOR aşamasındasın. Sana tek bir alt-görev verildi.

### Mevcut Görev
**${task.title}**
${task.description}

### Tüm Görev Listesi (bağlam için)
${taskList}

### Önceki Görevlerin Sonuçları
${previousResults}

### Kurallar
1. Yalnızca sana verilen görevle ilgilen — diğer görevleri sen değil diğer agent'lar yapacak.
2. Önceki görevlerin ürettiği dosyaları referans al, onlarla tutarlı kal.
3. Dosyaları <file path="..."> etiketleriyle üret.
4. Sohbette kısa bir özet yaz: ne yaptın, hangi dosyalar etkilendi.
5. Eğer görev bir dosya üretmeyi gerektirmiyorsa (sadece soru-cevap ise), normal bir cevap yaz.
6. Hata yapmamak için dikkatli ol — önce düşün (</think>), sonra üret.
${extraInstructions ? `\n### EK TALİMATLAR (Reviewer düzeltme talebi)\n${extraInstructions}\n` : ""}
---

PROJE BAĞLAMI:
${referenceContext}

---

${memoryContext}
${ragContext ? `\n${ragContext}\n` : ""}

---

Şimdi "${task.title}" görevini yerine getir.`;
}

export async function executeTask(
  ctx: WorkflowContext,
  task: AgentTask,
  allTasks: AgentTask[],
  fixInstructions?: string
): Promise<TaskResult> {
  const openaiKey = ctx.providerId === "openai" ? ctx.apiKey : ctx.openaiApiKey;
  const [memoryContext, ragContext] = await Promise.all([
    buildEnhancedMemoryContext(ctx.sessionId, task.title + " " + task.description, openaiKey),
    buildRagContext(ctx.sessionId, task.title, openaiKey)
  ]);

  const system = buildExecutorSystem(ctx.sessionId, task, allTasks, memoryContext, ragContext, fixInstructions);
  const images = buildImageAttachments(ctx.sessionId);

  let workingMessages = [
    ...ctx.messages,
    { role: "user" as const, content: `Alt-görev: ${task.title}\n\n${task.description}` }
  ];

  let retryCount = 0;
  let lastError = "";

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      let allWrittenFiles: { path: string; size: number; updatedAt: string }[] = [];
      let allThinking: string[] = [];
      let finalReply = "";
      let toolRound = 0;

      for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
        const rawText = await callProvider(
          ctx.providerId,
          ctx.apiKey,
          workingMessages,
          attempt === 0 ? system : system + `\n\nÖNCEKI DENEME HATA VERDI: ${lastError}\nLütfen daha dikkatli ol.`,
          ctx.model,
          images
        );

        const { chatText, writtenFiles, thinking, toolCalls } = processAgentResponse(
          ctx.sessionId,
          rawText
        );
        allWrittenFiles.push(...writtenFiles);
        allThinking.push(...thinking);

        if (toolCalls.length === 0 || toolRound >= MAX_TOOL_ROUNDS) {
          finalReply = chatText;
          break;
        }

        toolRound++;
        const toolResults = await runToolCalls(toolCalls, { sessionId: ctx.sessionId, openaiApiKey: openaiKey });
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

      return {
        task: { ...task, status: "completed", resultSummary: finalReply.slice(0, 200), filesProduced: allWrittenFiles.map((f) => f.path) },
        reply: finalReply,
        writtenFiles: allWrittenFiles,
        thinking: allThinking,
        success: true,
        retryCount
      };
    } catch (err: any) {
      lastError = err?.message || "Bilinmeyen hata";
      retryCount++;
      if (attempt >= MAX_RETRIES) {
        return {
          task: { ...task, status: "failed", error: lastError },
          reply: `Görev başarısız: ${lastError}`,
          writtenFiles: [],
          thinking: [],
          success: false,
          retryCount
        };
      }
    }
  }

  return {
    task: { ...task, status: "failed", error: lastError },
    reply: `Görev başarısız: ${lastError}`,
    writtenFiles: [],
    thinking: [],
    success: false,
    retryCount
  };
}
