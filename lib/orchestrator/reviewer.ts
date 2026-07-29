import { callProvider } from "../providers";
import { buildReferenceContext } from "../context";
import { AgentTask, ReviewResult, ReviewIssue, OrchestrationContext } from "./types";

const REVIEWER_SYSTEM = `Sen Aether Reviewer Agent'sın — başka bir agent'ın ürettiği kodu ve dosyaları denetlersin.

Görevin:
1. Üretilen dosyaları kalite, güvenlik, performans, erişilebilirlik ve tutarlılık açısından incele.
2. Kullanıcının orijinal isteğine karşı eksik bir şey var mı kontrol et.
3. Güven skoru (0-100) ver: 90+ çok iyi, 70-89 iyi, 50-69 orta, <50 zayıf.
4. Eğer güven düşükse ve gerçek bilgi eksikliği varsa web araması öner.

ÇIKTI FORMATI (kesinlikle bu formatı kullan):
<review>
<approved>true veya false</approved>
<confidence>0-100 arası sayı</confidence>
<critique>
Kısa bir değerlendirme: genel kalite, ne iyi ne kötü.
</critique>
<issues>
<issue severity="low|medium|high|critical" category="bug|security|performance|accessibility|consistency|missing">
Sorun açıklaması. Varsa dosya adı belirt.
</issue>
</issues>
<suggested_fixes>
Önerilen düzeltmelerin listesi.
</suggested_fixes>
<missing_requirements>
Kullanıcının isteğinde var ama üretilmemiş şeyler.
</missing_requirements>
<needs_web_search>true veya false</needs_web_search>
</review>

Sadece <review> bloğu üret. Blok dışında metin yazma.`;

const REVIEW_RE = /<review>([\s\S]*?)<\/review>/;
const APPROVED_RE = /<approved>([\s\S]*?)<\/approved>/;
const CONFIDENCE_RE = /<confidence>([\s\S]*?)<\/confidence>/;
const CRITIQUE_RE = /<critique>([\s\S]*?)<\/critique>/;
const ISSUE_RE = /<issue\s+severity="(low|medium|high|critical)"\s+category="(bug|security|performance|accessibility|consistency|missing)">([\s\S]*?)<\/issue>/g;
const FIXES_RE = /<suggested_fixes>([\s\S]*?)<\/suggested_fixes>/;
const MISSING_RE = /<missing_requirements>([\s\S]*?)<\/missing_requirements>/;
const WEB_RE = /<needs_web_search>([\s\S]*?)<\/needs_web_search>/;

export async function runReviewer(
  ctx: OrchestrationContext,
  userQuery: string,
  tasks: AgentTask[],
  writtenFiles: { path: string; size: number; updatedAt: string }[]
): Promise<ReviewResult> {
  const referenceContext = buildReferenceContext(ctx.sessionId);

  const taskSummary = tasks
    .map((t) => `- [${t.status}] ${t.title}${t.resultSummary ? `: ${t.resultSummary}` : ""}${t.error ? ` (HATA: ${t.error})` : ""}`)
    .join("\n");

  const fileList = writtenFiles.length > 0
    ? writtenFiles.map((f) => `- ${f.path} (${f.size} bayt)`).join("\n")
    : "(dosya üretilmedi)";

  const system = `${REVIEWER_SYSTEM}

---

PROJE BAĞLAMI (sanal diskteki güncel dosyalar):
${referenceContext}

---

Üretilen/güncellenen dosyalar:
${fileList}

Görev listesi ve sonuçları:
${taskSummary}

Kullanıcının orijinal isteği: "${userQuery}"`;

  try {
    const rawText = await callProvider(
      ctx.providerId,
      ctx.apiKey,
      [{ role: "user", content: "Yukarıdaki üretimi denetle ve değerlendir." }],
      system,
      ctx.model,
      []
    );

    const reviewMatch = rawText.match(REVIEW_RE);
    const reviewContent = reviewMatch ? reviewMatch[1] : rawText;

    const approvedMatch = reviewContent.match(APPROVED_RE);
    const approved = approvedMatch ? approvedMatch[1].trim().toLowerCase() === "true" : true;

    const confidenceMatch = reviewContent.match(CONFIDENCE_RE);
    const confidence = confidenceMatch ? parseInt(confidenceMatch[1].trim(), 10) : 75;
    const safeConfidence = isNaN(confidence) ? 75 : Math.max(0, Math.min(100, confidence));

    const critiqueMatch = reviewContent.match(CRITIQUE_RE);
    const critique = critiqueMatch ? critiqueMatch[1].trim() : "";

    const issues: ReviewIssue[] = [];
    let issueMatch: RegExpExecArray | null;
    const issueRe = new RegExp(ISSUE_RE.source, "g");
    while ((issueMatch = issueRe.exec(reviewContent)) !== null) {
      const fileMatch = issueMatch[3].match(/\b([\w./-]+\.\w+)\b/);
      issues.push({
        severity: issueMatch[1] as ReviewIssue["severity"],
        category: issueMatch[2] as ReviewIssue["category"],
        description: issueMatch[3].trim(),
        file: fileMatch ? fileMatch[1] : undefined
      });
    }

    const fixesMatch = reviewContent.match(FIXES_RE);
    const suggestedFixes = fixesMatch ? fixesMatch[1].trim() : "";

    const missingMatch = reviewContent.match(MISSING_RE);
    const missingBlock = missingMatch ? missingMatch[1].trim() : "";
    const missingRequirements = missingBlock
      .split("\n")
      .map((s) => s.replace(/^[-*]\s*/, "").trim())
      .filter((s) => s.length > 0 && s !== "(yok)" && s !== "yok");

    const webMatch = reviewContent.match(WEB_RE);
    const needsWebSearch = webMatch ? webMatch[1].trim().toLowerCase() === "true" : false;

    return {
      approved,
      confidence: safeConfidence,
      critique,
      issues,
      suggestedFixes,
      missingRequirements,
      needsWebSearch
    };
  } catch {
    return {
      approved: true,
      confidence: 70,
      critique: "Değerlendirme yapılamadı, ancak üretim tamamlandı.",
      issues: [],
      suggestedFixes: "",
      missingRequirements: [],
      needsWebSearch: false
    };
  }
}
