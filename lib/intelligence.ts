import { listFiles, readFileContent } from "./virtualDisk";
import { callProvider } from "./providers";
import { buildReferenceContext } from "./context";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RepoAnalysis {
  technologies: string[];
  dependencies: string[];
  projectType: string;
  summary: string;
  fileCount: number;
  totalSize: number;
  structure: { path: string; type: "file" | "dir" }[];
}

export interface ProjectPlan {
  requirements: string[];
  roadmap: { phase: string; tasks: string[] }[];
  estimatedFiles: { path: string; purpose: string }[];
  summary: string;
}

export interface CodeSearchResult {
  file: string;
  relevance: "high" | "medium" | "low";
  summary: string;
  lineHints: string[];
}

export interface BuildFixResult {
  errors: { file: string; line?: number; message: string; severity: "error" | "warning" }[];
  rootCause: string;
  suggestedFix: string;
  fixedFiles: { path: string; content: string }[];
}

export interface QualityReport {
  performance: { issue: string; file: string; severity: string }[];
  security: { issue: string; file: string; severity: string }[];
  deadCode: { description: string; file: string }[];
  largeFiles: { path: string; size: number; suggestion: string }[];
  unusedImports: { file: string; imports: string[] }[];
  score: number;
}

export interface CommitMessage {
  type: string;
  scope: string;
  description: string;
  full: string;
}

export interface TaskPanelItem {
  id: string;
  title: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  progress: number;
  files: string[];
}

// ─── 1. Repo Intelligence ───────────────────────────────────────────────────

const TECH_SIGNATURES: Record<string, string[]> = {
  "Next.js": ["next.config", "next/", "next-js"],
  React: ["react", "jsx", "tsx", "useEffect", "useState"],
  "Tailwind CSS": ["tailwind.config", "tailwindcss", "@tailwindcss"],
  Supabase: ["@supabase/supabase-js", "supabase.co", "SUPABASE_URL"],
  TypeScript: ["tsconfig.json", "typescript", ".ts"],
  "TanStack Query": ["@tanstack/react-query", "useQuery", "useMutation"],
  Zustand: ["zustand", "create("],
  "Framer Motion": ["framer-motion", "motion.div"],
  Prisma: ["prisma", "@prisma/client"],
  Express: ["express", "express()"],
  "FastAPI": ["fastapi", "uvicorn"],
  Django: ["django", "settings.py"],
  Vue: ["vue", "vue.js", ".vue"],
  Svelte: ["svelte", ".svelte"],
  Vite: ["vite.config", "vitejs"],
  Stripe: ["stripe", "@stripe/stripe-js"],
  PostgreSQL: ["postgres", "pg_dump", "postgresql"],
  MongoDB: ["mongodb", "mongoose"],
  Redis: ["redis", "ioredis"],
  Docker: ["Dockerfile", "docker-compose"],
};

const DEPENDENCY_FILES = ["package.json", "requirements.txt", "Cargo.toml", "go.mod", "pyproject.toml", "pom.xml"];

export function analyzeRepoSync(sessionId: string): RepoAnalysis {
  const files = listFiles(sessionId);
  const technologies: string[] = [];
  const dependencies: string[] = [];
  const structure: RepoAnalysis["structure"] = [];
  let totalSize = 0;
  const seenDirs = new Set<string>();

  for (const file of files) {
    totalSize += file.size;
    const parts = file.path.split("/");
    for (let i = 1; i < parts.length; i++) {
      const dirPath = parts.slice(0, i).join("/");
      if (!seenDirs.has(dirPath)) {
        seenDirs.add(dirPath);
        structure.push({ path: dirPath, type: "dir" });
      }
    }
    structure.push({ path: file.path, type: "file" });

    const ext = file.path.split(".").pop()?.toLowerCase() || "";
    if (file.path.endsWith("package.json")) {
      try {
        const content = JSON.parse(readFileContent(sessionId, file.path));
        const allDeps = { ...content.dependencies, ...content.devDependencies };
        dependencies.push(...Object.keys(allDeps));
        for (const [dep] of Object.entries(allDeps)) {
          for (const [tech, sigs] of Object.entries(TECH_SIGNATURES)) {
            if (sigs.some((s) => dep.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(dep.toLowerCase()))) {
              if (!technologies.includes(tech)) technologies.push(tech);
            }
          }
        }
      } catch {}
    }
    if (file.path.endsWith("requirements.txt")) {
      try {
        const content = readFileContent(sessionId, file.path);
        content.split("\n").forEach((line) => {
          const dep = line.split("=")[0].split(">")[0].split("<")[0].trim();
          if (dep) dependencies.push(dep);
        });
      } catch {}
    }

    if (file.size < 40_000) {
      try {
        const content = readFileContent(sessionId, file.path).toLowerCase();
        for (const [tech, sigs] of Object.entries(TECH_SIGNATURES)) {
          if (!technologies.includes(tech) && sigs.some((s) => content.includes(s.toLowerCase()))) {
            technologies.push(tech);
          }
        }
      } catch {}
    }
  }

  const hasNext = technologies.includes("Next.js");
  const hasReact = technologies.includes("React");
  const hasApi = files.some((f) => f.path.includes("api/"));
  const hasDb = technologies.includes("Supabase") || technologies.includes("PostgreSQL") || technologies.includes("MongoDB") || technologies.includes("Prisma");

  let projectType = "Genel amaçlı uygulama";
  if (hasNext && hasDb && hasApi) projectType = "Tam yığın (full-stack) SaaS uygulaması";
  else if (hasNext && hasApi) projectType = "Next.js API + ön yüz uygulaması";
  else if (hasNext || hasReact) projectType = "Ön yüz (frontend) uygulaması";
  else if (hasApi && hasDb) projectType = "Backend API servisi";
  else if (technologies.includes("FastAPI") || technologies.includes("Django")) projectType = "Backend API servisi";

  const summary = `${technologies.length} teknoloji, ${files.length} dosya, ${projectType}.` +
    (technologies.length > 0 ? ` Tespit edilen: ${technologies.join(", ")}.` : "");

  return {
    technologies: technologies.sort(),
    dependencies: [...new Set(dependencies)].sort(),
    projectType,
    summary,
    fileCount: files.length,
    totalSize,
    structure,
  };
}

export async function analyzeRepo(sessionId: string, providerId: string, apiKey: string, model?: string): Promise<RepoAnalysis> {
  const base = analyzeRepoSync(sessionId);
  if (base.fileCount === 0) return base;

  const referenceContext = buildReferenceContext(sessionId);
  const system = `Sen bir proje analiz uzmanısın. Verilen dosya listesini ve içerikleri inceleyip
projenin teknoloji yığınını, türünü ve kısa bir özetini çıkar. Yanıtı JSON olarak ver.`;

  const userPrompt = `Aşağıdaki projeyi analiz et ve JSON formatında özetle:
${referenceContext}

Yanıt formatı:
{
  "technologies": ["Next.js", "Supabase", ...],
  "projectType": "SaaS paneli",
  "summary": "Bu proje bir ... uygulamasıdır."
}`;

  try {
    const raw = await callProvider(providerId, apiKey, [{ role: "user", content: userPrompt }], system, model, []);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        ...base,
        technologies: parsed.technologies || base.technologies,
        projectType: parsed.projectType || base.projectType,
        summary: parsed.summary || base.summary,
      };
    }
  } catch {}
  return base;
}

// ─── 2. AI Project Manager ──────────────────────────────────────────────────

export async function createProjectPlan(
  sessionId: string,
  userQuery: string,
  providerId: string,
  apiKey: string,
  model?: string
): Promise<ProjectPlan> {
  const repoAnalysis = analyzeRepoSync(sessionId);
  const referenceContext = buildReferenceContext(sessionId);

  const system = `Sen bir kıdemli proje yöneticisisin. Kullanıcı bir uygulama isteğinde bulunduğunda
önce kod yazma — şu adımları izle:
1. Gereksinimleri çıkar (fonksiyonel + teknik)
2. Yol haritası oluştur (aşama aşama)
3. Tahmini dosyaları listele (yol + amaç)
4. Kısa bir özet yaz

Yanıtı JSON olarak ver. SADECE JSON döndür, başka metin yazma.`;

  const userPrompt = `Kullanıcının isteği: "${userQuery}"

Mevcut proje analizi:
- Teknolojiler: ${repoAnalysis.technologies.join(", ") || "yok"}
- Proje türü: ${repoAnalysis.projectType}
- Dosya sayısı: ${repoAnalysis.fileCount}

Mevcut dosyalar:
${referenceContext}

JSON formatında yanıt ver:
{
  "requirements": ["gereksinim 1", "gereksinim 2", ...],
  "roadmap": [
    { "phase": "Aşama 1: Temel", "tasks": ["görev 1", "görev 2"] },
    { "phase": "Aşama 2: ...", "tasks": ["..."] }
  ],
  "estimatedFiles": [
    { "path": "src/components/Login.tsx", "purpose": "Kullanıcı girişi formu" },
    ...
  ],
  "summary": "Proje özeti"
}`;

  const raw = await callProvider(providerId, apiKey, [{ role: "user", content: userPrompt }], system, model, []);
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {}
  }

  return {
    requirements: [userQuery],
    roadmap: [{ phase: "Aşama 1", tasks: [userQuery] }],
    estimatedFiles: [],
    summary: "Plan oluşturulamadı, doğrudan geliştirmeye geçiliyor.",
  };
}

// ─── 3. Code Search AI ──────────────────────────────────────────────────────

export async function searchCode(
  sessionId: string,
  query: string,
  providerId: string,
  apiKey: string,
  model?: string
): Promise<CodeSearchResult[]> {
  const files = listFiles(sessionId);
  if (files.length === 0) return [];

  const fileInfos = files.map((f) => `- ${f.path} (${f.size} bayt)`).join("\n");

  const system = `Sen bir kod arama asistanısın. Kullanıcı bir şey arar (örn "login nerede?"),
sen ilgili dosyaları bulup özetlersin. Yanıtı JSON dizisi olarak ver.`;

  const userPrompt = `Arama sorgusu: "${query}"

Mevcut dosyalar:
${fileInfos}

İlgili dosyaları bul ve JSON dizisi olarak yanıt ver:
[
  {
    "file": "auth.ts",
    "relevance": "high",
    "summary": "Kullanıcı kimlik doğrulama mantığı burada",
    "lineHints": ["loginUser fonksiyonu", "JWT token oluşturma"]
  }
]`;

  try {
    const raw = await callProvider(providerId, apiKey, [{ role: "user", content: userPrompt }], system, model, []);
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {}
  return [];
}

// ─── 4. Auto Build Fix ──────────────────────────────────────────────────────

export async function diagnoseBuildError(
  sessionId: string,
  buildLog: string,
  providerId: string,
  apiKey: string,
  model?: string
): Promise<BuildFixResult> {
  const referenceContext = buildReferenceContext(sessionId);

  const system = `Sen bir build hata ayıklama uzmanısın. Kullanıcı bir build hatası bildirdi.
Hata logunu oku, kök nedeni bul, hangi dosyada olduğunu tespit et ve düzeltme öner.
Eğer mümkünse düzeltilmiş dosya içeriğini de üret.

Yanıtı JSON olarak ver.`;

  const userPrompt = `Build hatası/logu:
${buildLog.slice(0, 8000)}

Mevcut proje dosyaları:
${referenceContext}

JSON formatında yanıt ver:
{
  "errors": [
    { "file": "src/app.tsx", "line": 42, "message": "Type 'string' is not assignable to type 'number'", "severity": "error" }
  ],
  "rootCause": "Tip uyumsuzluğu var çünkü ...",
  "suggestedFix": "app.tsx dosyasında ...",
  "fixedFiles": [
    { "path": "src/app.tsx", "content": "düzeltilmiş tam dosya içeriği" }
  ]
}`;

  try {
    const raw = await callProvider(providerId, apiKey, [{ role: "user", content: userPrompt }], system, model, []);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {}
  return {
    errors: [],
    rootCause: "Analiz başarısız",
    suggestedFix: "Logu manuel olarak inceleyin",
    fixedFiles: [],
  };
}

// ─── 5. Code Quality Analysis ───────────────────────────────────────────────

export async function analyzeCodeQuality(
  sessionId: string,
  providerId: string,
  apiKey: string,
  model?: string
): Promise<QualityReport> {
  const files = listFiles(sessionId);
  const referenceContext = buildReferenceContext(sessionId);

  const largeFiles = files
    .filter((f) => f.size > 10_000)
    .map((f) => ({ path: f.path, size: f.size, suggestion: "Bu dosya büyük, bölünmeyi düşünün" }))
    .sort((a, b) => b.size - a.size)
    .slice(0, 10);

  const system = `Sen bir kod kalitesi denetçisisin. Verilen proje dosyalarını analiz et ve
performans, güvenlik, gereksiz kod, büyük dosyalar ve kullanılmayan importlar için rapor ver.
JSON formatında yanıt ver.`;

  const userPrompt = `Proje dosyaları:
${referenceContext}

JSON formatında yanıt ver:
{
  "performance": [{ "issue": "...", "file": "...", "severity": "high|medium|low" }],
  "security": [{ "issue": "...", "file": "...", "severity": "high|medium|low" }],
  "deadCode": [{ "description": "...", "file": "..." }],
  "unusedImports": [{ "file": "...", "imports": ["import1", "import2"] }],
  "score": 85
}`;

  try {
    const raw = await callProvider(providerId, apiKey, [{ role: "user", content: userPrompt }], system, model, []);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        performance: parsed.performance || [],
        security: parsed.security || [],
        deadCode: parsed.deadCode || [],
        largeFiles,
        unusedImports: parsed.unusedImports || [],
        score: parsed.score ?? 0,
      };
    }
  } catch {}
  return {
    performance: [],
    security: [],
    deadCode: [],
    largeFiles,
    unusedImports: [],
    score: 0,
  };
}

// ─── 6. AI Commit Messages ──────────────────────────────────────────────────

export async function generateCommitMessage(
  sessionId: string,
  changes: { path: string; action: "created" | "modified" | "deleted" }[],
  providerId: string,
  apiKey: string,
  model?: string
): Promise<CommitMessage> {
  const referenceContext = buildReferenceContext(sessionId);
  const changesStr = changes.map((c) => `${c.action}: ${c.path}`).join("\n");

  const system = `Sen bir commit mesajı üreticisisin. Conventional Commits formatında
mesajlar üretirsin: type(scope): description

Tipler: feat, fix, refactor, docs, style, test, chore, perf, ci, build
Scope: etkilenen modül/özellik
Description: kısa, emir kipinde, Türkçe veya İngilizce

JSON formatında yanıt ver.`;

  const userPrompt = `Değişiklikler:
${changesStr}

Proje bağlamı:
${referenceContext.slice(0, 5000)}

JSON formatında yanıt ver:
{
  "type": "feat",
  "scope": "auth",
  "description": "add Google OAuth support",
  "full": "feat(auth): add Google OAuth support"
}`;

  try {
    const raw = await callProvider(providerId, apiKey, [{ role: "user", content: userPrompt }], system, model, []);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        type: parsed.type || "chore",
        scope: parsed.scope || "",
        description: parsed.description || "update files",
        full: parsed.full || `${parsed.type || "chore"}: ${parsed.description || "update files"}`,
      };
    }
  } catch {}
  return {
    type: "chore",
    scope: "",
    description: "update project files",
    full: "chore: update project files",
  };
}

// ─── 7. Chat Memory (project-level persistent facts) ─────────────────────────

export interface ProjectFact {
  key: string;
  value: string;
  category: "tech" | "convention" | "preference" | "architecture" | "warning";
}

export function extractProjectFacts(sessionId: string): ProjectFact[] {
  const analysis = analyzeRepoSync(sessionId);
  const facts: ProjectFact[] = [];

  for (const tech of analysis.technologies) {
    facts.push({ key: tech, value: `${tech} kullanılıyor`, category: "tech" });
  }

  try {
    if (listFiles(sessionId).some((f) => f.path === "tsconfig.json")) {
      const tsconfig = JSON.parse(readFileContent(sessionId, "tsconfig.json"));
      if (tsconfig.compilerOptions?.strict) {
        facts.push({ key: "ts-strict", value: "TypeScript strict mode açık", category: "convention" });
      }
    }
  } catch {}

  try {
    if (listFiles(sessionId).some((f) => f.path === "tailwind.config.ts" || f.path === "tailwind.config.js")) {
      facts.push({ key: "tailwind", value: "Tailwind CSS kullanılıyor", category: "tech" });
    }
  } catch {}

  return facts;
}

// ─── 8. Multi-model collaboration ───────────────────────────────────────────

export type ModelAssignment = import("./intelligenceTypes").ModelAssignment;

export function getMultiModelAssignments(
  availableProviders: string[],
  availableKeys: Partial<Record<string, string>>
): ModelAssignment[] {
  const has = (id: string) => availableProviders.includes(id) && availableKeys[id];

  const assignments: ModelAssignment[] = [];

  if (has("openai")) {
    assignments.push({ stage: "planning", providerId: "openai", model: "gpt-4.1", reason: "GPT güçlü planlama ve mantık yürütme için" });
  } else if (has("anthropic")) {
    assignments.push({ stage: "planning", providerId: "anthropic", model: "claude-sonnet-4-6", reason: "Claude derin analiz için" });
  } else if (has("google")) {
    assignments.push({ stage: "planning", providerId: "google", model: "gemini-2.0-flash", reason: "Gemini hızlı planlama için" });
  } else {
    const first = availableProviders.find(has);
    if (first) assignments.push({ stage: "planning", providerId: first, model: "", reason: "Tek kullanılabilir sağlayıcı" });
  }

  if (has("anthropic")) {
    assignments.push({ stage: "coding", providerId: "anthropic", model: "claude-sonnet-4-6", reason: "Claude kod üretiminde en iyisi" });
  } else if (has("openai")) {
    assignments.push({ stage: "coding", providerId: "openai", model: "gpt-4.1", reason: "GPT güçlü kod üretimi" });
  } else if (has("deepseek")) {
    assignments.push({ stage: "coding", providerId: "deepseek", model: "deepseek-chat", reason: "DeepSeek kod odaklı" });
  } else {
    const first = availableProviders.find(has);
    if (first) assignments.push({ stage: "coding", providerId: first, model: "", reason: "Tek kullanılabilir sağlayıcı" });
  }

  if (has("google")) {
    assignments.push({ stage: "review", providerId: "google", model: "gemini-2.0-flash", reason: "Gemini hızlı inceleme için" });
  } else if (has("xai")) {
    assignments.push({ stage: "review", providerId: "xai", model: "grok-4", reason: "Grok eleştirel inceleme için" });
  } else if (has("perplexity")) {
    assignments.push({ stage: "review", providerId: "perplexity", model: "sonar-pro", reason: "Perplexity araştırma odaklı inceleme" });
  } else {
    const first = availableProviders.find(has);
    if (first) assignments.push({ stage: "review", providerId: first, model: "", reason: "Tek kullanılabilir sağlayıcı" });
  }

  return assignments;
}

// ─── 9. Deploy targets ──────────────────────────────────────────────────────

export type DeployTarget = import("./intelligenceTypes").DeployTarget;
export { DEPLOY_TARGETS } from "./intelligenceTypes";
