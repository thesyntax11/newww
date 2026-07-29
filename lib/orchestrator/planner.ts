import { callProvider } from "../providers";
import { buildSystemPrompt } from "../systemPrompt";
import { buildReferenceContext } from "../context";
import { buildEnhancedMemoryContext } from "../enhancedMemory";
import { buildRagContext } from "../vectorStore";
import { AgentTask, PlanResult } from "./types";

const PLANNER_SYSTEM = `Sen Aether Planner Agent'sın — bir kullanıcı isteğini bağımsız, sıralı alt-görevlere (task list) ayırırsın.

Kurallar:
1. Kullanıcının isteğini analiz et ve 2-8 arası somut alt-görev üret.
2. Her görev bir başlık (title) ve 1-2 cümlelik açıklama (description) içermeli.
3. Görevler mantıksal sırayla olmalı (ör. önce veri modeli, sonra bileşen, sonra API).
4. Çok küçük istekler (ör. "bu butonun rengini değiştir") için 1-2 görev yeterli.
5. Büyük istekler (ör. "Instagram clone yap") için 5-8 görev üret.
6. Mevcut diskteki dosyaları dikkate al — zaten var olan şeyleri tekrar oluşturma görevi yazma.
7. Her görev bağımsız çalıştırılabilir olmalı ama önceki görevlerin çıktısına güvenebilir.

ÇIKTI FORMATI (kesinlikle bu formatı kullan):
<plan>
<reasoning>
Kısa bir muhakeme: neden bu görevleri seçtin, sıralama mantığı ne?
</reasoning>
<task>
<title>Görev başlığı</title>
<description>Bu görev ne yapacak, hangi dosyalar etkilenyecek.</description>
</task>
<task>
<title>Görev başlığı</title>
<description>Açıklama...</description>
</task>
</plan>

Sadece <plan> bloğu üret. Blok dışında metin yazma.`;

const PLAN_RE = /<plan>([\s\S]*?)<\/plan>/;
const TASK_RE = /<task>([\s\S]*?)<\/task>/g;
const TITLE_RE = /<title>([\s\S]*?)<\/title>/;
const DESC_RE = /<description>([\s\S]*?)<\/description>/;
const REASONING_RE = /<reasoning>([\s\S]*?)<\/reasoning>/;

export async function runPlanner(
  sessionId: string,
  userQuery: string,
  providerId: string,
  apiKey: string,
  model?: string,
  openaiApiKey?: string
): Promise<PlanResult> {
  const referenceContext = buildReferenceContext(sessionId);

  const [memoryContext, ragContext] = await Promise.all([
    buildEnhancedMemoryContext(sessionId, userQuery, openaiApiKey),
    buildRagContext(sessionId, userQuery, openaiApiKey)
  ]);

  const system = `${PLANNER_SYSTEM}

---

PROJE BAĞLAMI (sanal diskteki mevcut dosyalar):
${referenceContext}

---

${memoryContext}
${ragContext ? `\n${ragContext}\n` : ""}`;

  const userPrompt = `Kullanıcının isteği: "${userQuery}"

Bu isteği alt-görevlere ayır. Mevcut dosyaları dikkate al.`;

  const rawText = await callProvider(
    providerId,
    apiKey,
    [{ role: "user", content: userPrompt }],
    system,
    model,
    []
  );

  const planMatch = rawText.match(PLAN_RE);
  const planContent = planMatch ? planMatch[1] : rawText;

  const reasoningMatch = planContent.match(REASONING_RE);
  const reasoning = reasoningMatch ? reasoningMatch[1].trim() : "";

  const tasks: AgentTask[] = [];
  let taskMatch: RegExpExecArray | null;
  const taskRe = new RegExp(TASK_RE.source, "g");
  let index = 0;
  while ((taskMatch = taskRe.exec(planContent)) !== null) {
    const taskBlock = taskMatch[1];
    const titleMatch = taskBlock.match(TITLE_RE);
    const descMatch = taskBlock.match(DESC_RE);
    const title = titleMatch ? titleMatch[1].trim() : `Görev ${index + 1}`;
    const description = descMatch ? descMatch[1].trim() : "";
    if (title) {
      tasks.push({
        id: `${Date.now()}-${index}`,
        index,
        title,
        description,
        status: "pending",
        resultSummary: "",
        confidence: 0,
        filesProduced: [],
        error: ""
      });
      index++;
    }
  }

  if (tasks.length === 0) {
    tasks.push({
      id: `${Date.now()}-0`,
      index: 0,
      title: "İsteği uygula",
      description: userQuery,
      status: "pending",
      resultSummary: "",
      confidence: 0,
      filesProduced: [],
      error: ""
    });
  }

  return {
    tasks,
    reasoning,
    requestId: `req-${Date.now()}`
  };
}
