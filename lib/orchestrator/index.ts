import { runPlanner } from "./planner";
import { runCoderTask } from "./coder";
import { runReviewer } from "./reviewer";
import { runToolCalls } from "../agent";
import { saveTasks, updateTask } from "../taskStore";
import { addEnhancedMemory } from "../enhancedMemory";
import {
  AgentTask,
  OrchestrationResult,
  OrchestrationStage,
  OrchestrationContext,
  ReviewResult
} from "./types";

const MEMORY_KEYWORDS = [
  "unutma", "hatırla", "beni hatırla", "bunu kaydet",
  "unutma ki", "not al", "remember", "note that"
];

function shouldAutoMemorize(text: string): boolean {
  const lower = text.toLowerCase();
  return MEMORY_KEYWORDS.some((k) => lower.includes(k));
}

function isSimpleRequest(query: string): boolean {
  const lower = query.trim().toLowerCase();
  const simplePatterns = [
    /^(teşekkür|sağ ?ol|eyvallah)/,
    /^(evet|hayır|ok|tamam|anladım)/,
    /^(merhaba|selam|naber)/,
    /^(devam|continue|ileri|next)/,
    /\b(kapat|sil|temizle)\b/,
  ];
  return simplePatterns.some((p) => p.test(lower)) || lower.length < 15;
}

export async function orchestrate(ctx: OrchestrationContext): Promise<OrchestrationResult> {
  const stages: OrchestrationStage[] = [];
  const allThinking: string[] = [];
  const allWrittenFiles: { path: string; size: number; updatedAt: string }[] = [];
  const lastUserMsg = [...ctx.messages].reverse().find((m) => m.role === "user");
  const userQuery = lastUserMsg?.content || "";
  const openaiKey = ctx.providerId === "openai" ? ctx.apiKey : ctx.openaiApiKey;

  if (shouldAutoMemorize(userQuery)) {
    addEnhancedMemory(ctx.sessionId, userQuery, { category: "explicit", importance: 8 }, openaiKey).catch(() => {});
  }

  if (isSimpleRequest(userQuery)) {
    return runSimpleResponse(ctx, stages, allThinking, allWrittenFiles, userQuery);
  }

  return runFullPipeline(ctx, stages, allThinking, allWrittenFiles, userQuery, openaiKey);
}

async function runSimpleResponse(
  ctx: OrchestrationContext,
  stages: OrchestrationStage[],
  allThinking: string[],
  allWrittenFiles: { path: string; size: number; updatedAt: string }[],
  userQuery: string
): Promise<OrchestrationResult> {
  const stage: OrchestrationStage = {
    role: "orchestrator",
    label: "Doğrudan yanıt",
    status: "running",
    detail: "Basit istek tespit edildi, doğrudan yanıtlanıyor",
    durationMs: 0
  };
  const start = Date.now();

  const { buildSystemPrompt } = await import("../systemPrompt");
  const { buildImageAttachments } = await import("../context");
  const { processAgentResponse } = await import("../agent");
  const { callProvider } = await import("../providers");

  const system = buildSystemPrompt(ctx.sessionId);
  const images = buildImageAttachments(ctx.sessionId);

  const rawText = await callProvider(
    ctx.providerId,
    ctx.apiKey,
    ctx.messages,
    system,
    ctx.model,
    images
  );

  const { chatText, writtenFiles, thinking } = processAgentResponse(ctx.sessionId, rawText);
  allThinking.push(...thinking);
  allWrittenFiles.push(...writtenFiles);

  stage.status = "completed";
  stage.durationMs = Date.now() - start;
  stages.push(stage);

  return {
    reply: chatText,
    thinking: allThinking,
    writtenFiles: allWrittenFiles,
    tasks: [],
    review: null,
    imagesSeen: images.map((i) => i.path),
    stages
  };
}

async function runFullPipeline(
  ctx: OrchestrationContext,
  stages: OrchestrationStage[],
  allThinking: string[],
  allWrittenFiles: { path: string; size: number; updatedAt: string }[],
  userQuery: string,
  openaiKey?: string
): Promise<OrchestrationResult> {
  let tasks: AgentTask[] = [];

  // --- Stage 1: Planner ---
  const planStage: OrchestrationStage = {
    role: "planner",
    label: "Planlama",
    status: "running",
    detail: "İstek alt-görevlere ayrılıyor",
    durationMs: 0
  };
  const planStart = Date.now();

  try {
    const plan = await runPlanner(
      ctx.sessionId,
      userQuery,
      ctx.providerId,
      ctx.apiKey,
      ctx.model,
      openaiKey
    );
    tasks = plan.tasks;
    planStage.detail = `${tasks.length} görev planlandı: ${tasks.map((t) => t.title).join(", ")}`;
    planStage.status = "completed";
    planStage.durationMs = Date.now() - planStart;
    allThinking.push(`Planner: ${plan.reasoning}`);
    saveTasks(ctx.sessionId, plan.requestId, tasks).catch(() => {});
  } catch (err: any) {
    planStage.status = "failed";
    planStage.detail = `Planlama hatası: ${err?.message || "bilinmeyen"}`;
    planStage.durationMs = Date.now() - planStart;
    stages.push(planStage);
    return {
      reply: `Planlama aşamasında hata oluştu: ${err?.message || "bilinmeyen hata"}`,
      thinking: allThinking,
      writtenFiles: [],
      tasks: [],
      review: null,
      imagesSeen: [],
      stages
    };
  }
  stages.push(planStage);

  // --- Stage 2: Coder (per task) ---
  for (const task of tasks) {
    const taskStage: OrchestrationStage = {
      role: "coder",
      label: `Görev ${task.index + 1}: ${task.title}`,
      status: "running",
      detail: task.description,
      durationMs: 0
    };
    const taskStart = Date.now();

    try {
      const result = await runCoderTask(ctx, task, tasks);
      allThinking.push(...result.thinking);
      allWrittenFiles.push(...result.writtenFiles);

      tasks[task.index] = result.task;
      updateTask(ctx.sessionId, `req-${Date.now()}`, task.index, {
        status: result.task.status,
        resultSummary: result.task.resultSummary,
        filesProduced: result.task.filesProduced,
        error: result.task.error
      }).catch(() => {});

      taskStage.status = result.success ? "completed" : "failed";
      taskStage.detail = result.success
        ? `Tamamlandı${result.writtenFiles.length > 0 ? ` (${result.writtenFiles.length} dosya)` : ""}`
        : `Başarısız: ${result.task.error}`;
      taskStage.durationMs = Date.now() - taskStart;
    } catch (err: any) {
      tasks[task.index] = { ...task, status: "failed", error: err?.message || "bilinmeyen hata" };
      taskStage.status = "failed";
      taskStage.detail = `Hata: ${err?.message || "bilinmeyen"}`;
      taskStage.durationMs = Date.now() - taskStart;
    }
    stages.push(taskStage);
  }

  // --- Stage 3: Reviewer ---
  const reviewStage: OrchestrationStage = {
    role: "reviewer",
    label: "Değerlendirme",
    status: "running",
    detail: "Üretim denetleniyor ve güven skoru hesaplanıyor",
    durationMs: 0
  };
  const reviewStart = Date.now();

  let review: ReviewResult | null = null;
  try {
    review = await runReviewer(ctx, userQuery, tasks, allWrittenFiles);
    reviewStage.status = "completed";
    reviewStage.detail = `Güven: %${review.confidence}${review.approved ? " — onaylandı" : " — düzeltme önerildi"}`;
    reviewStage.durationMs = Date.now() - reviewStart;
    allThinking.push(`Reviewer: ${review.critique}`);
  } catch (err: any) {
    reviewStage.status = "failed";
    reviewStage.detail = `Değerlendirme hatası: ${err?.message || "bilinmeyen"}`;
    reviewStage.durationMs = Date.now() - reviewStart;
  }
  stages.push(reviewStage);

  // --- Stage 4: Web search if reviewer says it's needed ---
  if (review?.needsWebSearch && review.confidence < 60) {
    const searchStage: OrchestrationStage = {
      role: "orchestrator",
      label: "Web araması",
      status: "running",
      detail: "Düşük güven nedeniyle ek bilgi aranıyor",
      durationMs: 0
    };
    const searchStart = Date.now();
    try {
      const searchResult = await runToolCalls(
        [{ id: "web_search", args: { query: userQuery }, raw: "" }],
        { sessionId: ctx.sessionId, openaiApiKey: openaiKey }
      );
      searchStage.status = "completed";
      searchStage.detail = "Web araması tamamlandı, sonuçlar bağlama eklendi";
      searchStage.durationMs = Date.now() - searchStart;
      allThinking.push(`Web arama sonuçları: ${searchResult.slice(0, 500)}`);
    } catch {
      searchStage.status = "failed";
      searchStage.detail = "Web araması başarısız";
      searchStage.durationMs = Date.now() - searchStart;
    }
    stages.push(searchStage);
  }

  // --- Build final reply ---
  const completedTasks = tasks.filter((t) => t.status === "completed");
  const failedTasks = tasks.filter((t) => t.status === "failed");
  const fileCount = allWrittenFiles.length;

  let reply = "";
  if (completedTasks.length > 0) {
    reply += completedTasks.map((t) => `✓ ${t.title}`).join("\n");
    if (fileCount > 0) {
      reply += `\n\n📄 ${fileCount} dosya sanal diske yazıldı.`;
    }
  }
  if (failedTasks.length > 0) {
    reply += `\n\n${failedTasks.map((t) => `✗ ${t.title}: ${t.error}`).join("\n")}`;
  }

  if (review) {
    reply += `\n\n**Değerlendirme:** Güven %${review.confidence}`;
    if (review.issues.length > 0) {
      const critical = review.issues.filter((i) => i.severity === "critical" || i.severity === "high");
      if (critical.length > 0) {
        reply += `\n⚠ ${critical.length} önemli sorun tespit edildi:`;
        reply += `\n${critical.map((i) => `- [${i.severity}] ${i.description}`).join("\n")}`;
      }
    }
    if (review.missingRequirements.length > 0) {
      reply += `\n\nEksik: ${review.missingRequirements.join(", ")}`;
    }
    if (review.suggestedFixes.trim()) {
      reply += `\n\nÖnerilen düzeltmeler:\n${review.suggestedFixes}`;
    }
  }

  if (!reply.trim()) {
    reply = "İsteğiniz işlendi ancak çıktı üretilmedi.";
  }

  return {
    reply: reply.trim(),
    thinking: allThinking,
    writtenFiles: allWrittenFiles,
    tasks,
    review,
    imagesSeen: [],
    stages
  };
}
