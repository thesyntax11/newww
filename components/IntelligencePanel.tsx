"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Search, Bug, Gauge, GitCommitVertical as GitCommit, Rocket, Boxes, ChevronDown, Loader as Loader2, FileCode, Shield, Zap, Trash2, CircleCheck as CheckCircle2, Circle as XCircle, TriangleAlert as AlertTriangle, ListChecks, Sparkles, X } from "lucide-react";
import { useAetherStore } from "@/lib/store";
import { DEPLOY_TARGETS } from "@/lib/intelligenceTypes";

type Tab = "repo" | "plan" | "search" | "fix" | "quality" | "commit" | "deploy" | "models";

interface RepoAnalysis {
  technologies: string[];
  dependencies: string[];
  projectType: string;
  summary: string;
  fileCount: number;
  totalSize: number;
}

interface ProjectPlan {
  requirements: string[];
  roadmap: { phase: string; tasks: string[] }[];
  estimatedFiles: { path: string; purpose: string }[];
  summary: string;
}

interface QualityReport {
  performance: { issue: string; file: string; severity: string }[];
  security: { issue: string; file: string; severity: string }[];
  deadCode: { description: string; file: string }[];
  largeFiles: { path: string; size: number; suggestion: string }[];
  unusedImports: { file: string; imports: string[] }[];
  score: number;
}

interface BuildFixResult {
  errors: { file: string; line?: number; message: string; severity: string }[];
  rootCause: string;
  suggestedFix: string;
  fixedFiles: { path: string; content: string }[];
}

interface ModelAssignment {
  stage: string;
  providerId: string;
  model: string;
  reason: string;
}

const TABS: { id: Tab; label: string; icon: typeof Brain }[] = [
  { id: "repo", label: "Repo Analizi", icon: Boxes },
  { id: "plan", label: "Proje Planı", icon: ListChecks },
  { id: "search", label: "Kod Arama", icon: Search },
  { id: "fix", label: "Build Onar", icon: Bug },
  { id: "quality", label: "Kalite", icon: Gauge },
  { id: "commit", label: "Commit", icon: GitCommit },
  { id: "models", label: "Model İşbirliği", icon: Sparkles },
  { id: "deploy", label: "Yayınla", icon: Rocket },
];

export default function IntelligencePanel({
  open,
  onClose,
  onOpenFile
}: {
  open: boolean;
  onClose: () => void;
  onOpenFile?: (path: string, mode: "edit" | "preview" | "live") => void;
}) {
  const { sessionId, activeProvider, apiKeys } = useAetherStore();
  const [tab, setTab] = useState<Tab>("repo");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [repoData, setRepoData] = useState<RepoAnalysis | null>(null);
  const [planData, setPlanData] = useState<ProjectPlan | null>(null);
  const [planQuery, setPlanQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ file: string; relevance: string; summary: string; lineHints: string[] }[]>([]);
  const [buildLog, setBuildLog] = useState("");
  const [fixData, setFixData] = useState<BuildFixResult | null>(null);
  const [qualityData, setQualityData] = useState<QualityReport | null>(null);
  const [commitMsg, setCommitMsg] = useState<{ type: string; scope: string; description: string; full: string } | null>(null);
  const [modelAssignments, setModelAssignments] = useState<ModelAssignment[]>([]);

  const apiKey = apiKeys[activeProvider] || "";

  const callApi = useCallback(async (path: string, body: Record<string, unknown>) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, providerId: activeProvider, apiKey, ...body })
      });
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        const text = await res.text().catch(() => "");
        throw new Error(text.includes("<!DOCTYPE") ? "Sunucu hatası — HTML döndü" : text.slice(0, 200));
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Bilinmeyen hata");
      return data;
    } catch (err: any) {
      setError(err?.message || "İstek başarısız");
      return null;
    } finally {
      setLoading(false);
    }
  }, [sessionId, activeProvider, apiKey]);

  const handleAnalyzeRepo = () => callApi("/api/intelligence/repo", {}).then(setRepoData);
  const handleCreatePlan = () => {
    if (!planQuery.trim()) return;
    callApi("/api/intelligence/plan", { query: planQuery }).then(setPlanData);
  };
  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    callApi("/api/intelligence/search", { query: searchQuery }).then((d) => setSearchResults(d?.results || []));
  };
  const handleBuildFix = (apply = false) => {
    if (!buildLog.trim()) return;
    callApi("/api/intelligence/build-fix", { buildLog, applyFixes: apply }).then(setFixData);
  };
  const handleQuality = () => callApi("/api/intelligence/quality", {}).then(setQualityData);
  const handleCommit = () => callApi("/api/intelligence/commit", {}).then(setCommitMsg);
  const handleModels = () => {
    const providers = Object.keys(apiKeys).filter((k) => apiKeys[k as keyof typeof apiKeys]);
    callApi("/api/intelligence/multi-model", { providers, apiKeys }).then((d) => setModelAssignments(d?.assignments || []));
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-void/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="glass flex max-h-[85vh] w-full max-w-3xl flex-col p-0"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <div className="flex items-center gap-2">
                <Brain size={16} className="text-plasma-soft" />
                <h2 className="font-display text-sm font-semibold text-chalk">Zeka Paneli</h2>
              </div>
              <button onClick={onClose} className="text-mist hover:text-chalk"><X size={16} /></button>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-1 border-b border-line px-3 py-2">
              {TABS.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors ${
                      tab === t.id ? "bg-plasma/15 text-plasma-soft" : "text-mist hover:text-chalk"
                    }`}
                  >
                    <Icon size={12} />
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {error && (
                <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-400">
                  <AlertTriangle size={12} />
                  {error}
                </div>
              )}

              {!apiKey && (
                <div className="mb-3 rounded-lg border border-signal/30 bg-signal/10 px-3 py-2 text-xs text-signal">
                  Bu özellikleri kullanmak için önce bir API anahtarı bağlayın.
                </div>
              )}

              {/* ─── Repo Analysis ─── */}
              {tab === "repo" && (
                <div className="space-y-4">
                  <button onClick={handleAnalyzeRepo} disabled={loading || !apiKey} className="btn-plasma text-xs">
                    {loading ? <Loader2 size={12} className="animate-spin" /> : <Boxes size={12} />}
                    Projeyi Analiz Et
                  </button>
                  {repoData && (
                    <div className="space-y-3">
                      <div className="rounded-lg border border-line bg-panel-soft/50 p-3">
                        <p className="text-sm text-chalk">{repoData.summary}</p>
                        <div className="mt-2 flex gap-4 text-[11px] text-mist">
                          <span>{repoData.fileCount} dosya</span>
                          <span>{(repoData.totalSize / 1024).toFixed(1)} KB</span>
                          <span className="text-plasma-soft">{repoData.projectType}</span>
                        </div>
                      </div>
                      {repoData.technologies.length > 0 && (
                        <div>
                          <h4 className="mb-1.5 text-[11px] font-semibold uppercase text-mist">Teknolojiler</h4>
                          <div className="flex flex-wrap gap-1.5">
                            {repoData.technologies.map((tech) => (
                              <span key={tech} className="rounded-full bg-plasma/15 px-2.5 py-1 text-[11px] text-plasma-soft">{tech}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {repoData.dependencies.length > 0 && (
                        <div>
                          <h4 className="mb-1.5 text-[11px] font-semibold uppercase text-mist">Bağımlılıklar</h4>
                          <div className="flex flex-wrap gap-1">
                            {repoData.dependencies.slice(0, 30).map((dep) => (
                              <span key={dep} className="rounded bg-panel px-2 py-0.5 font-mono text-[10px] text-mist/80">{dep}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ─── Project Plan ─── */}
              {tab === "plan" && (
                <div className="space-y-4">
                  <textarea
                    value={planQuery}
                    onChange={(e) => setPlanQuery(e.target.value)}
                    placeholder="Örn: Spotify gibi bir müzik uygulaması yap"
                    rows={2}
                    className="w-full resize-none rounded-lg border border-line bg-panel-soft px-3 py-2 text-sm text-chalk outline-none placeholder:text-mist/60"
                  />
                  <button onClick={handleCreatePlan} disabled={loading || !apiKey || !planQuery.trim()} className="btn-plasma text-xs">
                    {loading ? <Loader2 size={12} className="animate-spin" /> : <ListChecks size={12} />}
                    Plan Oluştur
                  </button>
                  {planData && (
                    <div className="space-y-3">
                      <div className="rounded-lg border border-line bg-panel-soft/50 p-3">
                        <p className="text-sm text-chalk">{planData.summary}</p>
                      </div>
                      {planData.requirements.length > 0 && (
                        <div>
                          <h4 className="mb-1.5 text-[11px] font-semibold uppercase text-mist">Gereksinimler</h4>
                          <ul className="space-y-1">
                            {planData.requirements.map((r, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-chalk/80">
                                <CheckCircle2 size={11} className="mt-0.5 shrink-0 text-signal" />
                                {r}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {planData.roadmap.length > 0 && (
                        <div>
                          <h4 className="mb-1.5 text-[11px] font-semibold uppercase text-mist">Yol Haritası</h4>
                          <div className="space-y-2">
                            {planData.roadmap.map((phase, i) => (
                              <div key={i} className="rounded-lg border border-line bg-panel-soft/30 p-2.5">
                                <p className="mb-1 text-xs font-semibold text-plasma-soft">{phase.phase}</p>
                                <ul className="space-y-0.5">
                                  {phase.tasks.map((task, j) => (
                                    <li key={j} className="text-[11px] text-chalk/70">• {task}</li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {planData.estimatedFiles.length > 0 && (
                        <div>
                          <h4 className="mb-1.5 text-[11px] font-semibold uppercase text-mist">Tahmini Dosyalar</h4>
                          <div className="space-y-1">
                            {planData.estimatedFiles.map((f, i) => (
                              <div key={i} className="flex items-start gap-2 rounded border border-line/50 bg-panel-soft/30 px-2 py-1.5">
                                <FileCode size={11} className="mt-0.5 shrink-0 text-mist" />
                                <div>
                                  <p className="font-mono text-[11px] text-chalk/80">{f.path}</p>
                                  <p className="text-[10px] text-mist/70">{f.purpose}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ─── Code Search ─── */}
              {tab === "search" && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      placeholder="Örn: login nerede?"
                      className="flex-1 rounded-lg border border-line bg-panel-soft px-3 py-2 text-sm text-chalk outline-none placeholder:text-mist/60"
                    />
                    <button onClick={handleSearch} disabled={loading || !apiKey || !searchQuery.trim()} className="btn-plasma text-xs whitespace-nowrap">
                      {loading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                      Ara
                    </button>
                  </div>
                  {searchResults.length > 0 && (
                    <div className="space-y-2">
                      {searchResults.map((r, i) => (
                        <div key={i} className="rounded-lg border border-line bg-panel-soft/50 p-3">
                          <div className="flex items-center gap-2">
                            <FileCode size={12} className="text-plasma-soft" />
                            <button
                              onClick={() => onOpenFile?.(r.file, "edit")}
                              className="font-mono text-xs text-chalk hover:text-plasma-soft"
                            >
                              {r.file}
                            </button>
                            <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${
                              r.relevance === "high" ? "bg-signal/15 text-signal" :
                              r.relevance === "medium" ? "bg-yellow-400/10 text-yellow-400" :
                              "bg-mist/10 text-mist"
                            }`}>
                              {r.relevance}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-chalk/70">{r.summary}</p>
                          {r.lineHints.length > 0 && (
                            <ul className="mt-1 space-y-0.5">
                              {r.lineHints.map((h, j) => (
                                <li key={j} className="text-[10px] text-mist/70">→ {h}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ─── Build Fix ─── */}
              {tab === "fix" && (
                <div className="space-y-4">
                  <textarea
                    value={buildLog}
                    onChange={(e) => setBuildLog(e.target.value)}
                    placeholder="Build hatası logunu buraya yapıştır..."
                    rows={5}
                    className="w-full resize-none rounded-lg border border-line bg-panel-soft px-3 py-2 font-mono text-xs text-chalk outline-none placeholder:text-mist/60"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => handleBuildFix(false)} disabled={loading || !apiKey || !buildLog.trim()} className="btn-plasma text-xs">
                      {loading ? <Loader2 size={12} className="animate-spin" /> : <Bug size={12} />}
                      Teşhis Et
                    </button>
                    <button onClick={() => handleBuildFix(true)} disabled={loading || !apiKey || !buildLog.trim()} className="btn-ghost text-xs">
                      Teşhis + Düzelt
                    </button>
                  </div>
                  {fixData && (
                    <div className="space-y-3">
                      {fixData.errors.length > 0 && (
                        <div className="space-y-1">
                          <h4 className="text-[11px] font-semibold uppercase text-mist">Hatalar</h4>
                          {fixData.errors.map((e, i) => (
                            <div key={i} className="flex items-start gap-2 rounded border border-line/50 bg-panel-soft/30 px-2 py-1.5">
                              <XCircle size={11} className="mt-0.5 shrink-0 text-red-400" />
                              <div>
                                <p className="font-mono text-[11px] text-chalk/80">{e.file}{e.line ? `:${e.line}` : ""}</p>
                                <p className="text-[10px] text-mist/70">{e.message}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="rounded-lg border border-line bg-panel-soft/50 p-3">
                        <p className="mb-1 text-[11px] font-semibold text-signal">Kök Neden</p>
                        <p className="text-xs text-chalk/80">{fixData.rootCause}</p>
                      </div>
                      <div className="rounded-lg border border-line bg-panel-soft/50 p-3">
                        <p className="mb-1 text-[11px] font-semibold text-plasma-soft">Önerilen Düzeltme</p>
                        <p className="text-xs text-chalk/80">{fixData.suggestedFix}</p>
                      </div>
                      {fixData.fixedFiles.length > 0 && (
                        <div className="rounded-lg border border-signal/30 bg-signal/10 p-3">
                          <p className="text-xs text-signal">{fixData.fixedFiles.length} dosya düzeltildi ve diske yazıldı.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ─── Quality ─── */}
              {tab === "quality" && (
                <div className="space-y-4">
                  <button onClick={handleQuality} disabled={loading || !apiKey} className="btn-plasma text-xs">
                    {loading ? <Loader2 size={12} className="animate-spin" /> : <Gauge size={12} />}
                    Kalite Analizi Yap
                  </button>
                  {qualityData && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 rounded-lg border border-line bg-panel-soft/50 p-3">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-plasma/15">
                          <span className={`font-display text-lg font-bold ${qualityData.score >= 80 ? "text-signal" : qualityData.score >= 60 ? "text-yellow-400" : "text-red-400"}`}>
                            {qualityData.score}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-chalk">Kalite Skoru</p>
                          <p className="text-[11px] text-mist">
                            {qualityData.score >= 80 ? "Mükemmel" : qualityData.score >= 60 ? "İyi, geliştirilebilir" : "Düşük, dikkat gerek"}
                          </p>
                        </div>
                      </div>

                      {qualityData.performance.length > 0 && (
                        <QualitySection title="Performans" icon={Zap} items={qualityData.performance.map(p => ({ text: p.issue, file: p.file, severity: p.severity }))} />
                      )}
                      {qualityData.security.length > 0 && (
                        <QualitySection title="Güvenlik" icon={Shield} items={qualityData.security.map(p => ({ text: p.issue, file: p.file, severity: p.severity }))} />
                      )}
                      {qualityData.deadCode.length > 0 && (
                        <div>
                          <h4 className="mb-1.5 text-[11px] font-semibold uppercase text-mist">Gereksiz Kod</h4>
                          {qualityData.deadCode.map((d, i) => (
                            <div key={i} className="flex items-start gap-2 py-0.5 text-xs text-chalk/70">
                              <Trash2 size={10} className="mt-1 text-mist/60" />
                              <span>{d.description} <span className="font-mono text-[10px] text-mist/60">({d.file})</span></span>
                            </div>
                          ))}
                        </div>
                      )}
                      {qualityData.largeFiles.length > 0 && (
                        <div>
                          <h4 className="mb-1.5 text-[11px] font-semibold uppercase text-mist">Büyük Dosyalar</h4>
                          {qualityData.largeFiles.map((f, i) => (
                            <div key={i} className="flex items-center gap-2 py-0.5 text-xs text-chalk/70">
                              <FileCode size={10} className="text-mist/60" />
                              <span className="font-mono text-[11px]">{f.path}</span>
                              <span className="text-[10px] text-mist/60">({(f.size / 1024).toFixed(1)} KB)</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {qualityData.unusedImports.length > 0 && (
                        <div>
                          <h4 className="mb-1.5 text-[11px] font-semibold uppercase text-mist">Kullanılmayan Importlar</h4>
                          {qualityData.unusedImports.map((u, i) => (
                            <div key={i} className="py-0.5 text-xs text-chalk/70">
                              <span className="font-mono text-[11px] text-plasma-soft">{u.file}:</span> {u.imports.join(", ")}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ─── Commit ─── */}
              {tab === "commit" && (
                <div className="space-y-4">
                  <button onClick={handleCommit} disabled={loading || !apiKey} className="btn-plasma text-xs">
                    {loading ? <Loader2 size={12} className="animate-spin" /> : <GitCommit size={12} />}
                    Commit Mesajı Oluştur
                  </button>
                  {commitMsg && (
                    <div className="space-y-3">
                      <div className="rounded-lg border border-line bg-panel-soft/50 p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <span className="rounded bg-plasma/20 px-2 py-0.5 font-mono text-[10px] text-plasma-soft">{commitMsg.type}</span>
                          {commitMsg.scope && <span className="rounded bg-signal/15 px-2 py-0.5 font-mono text-[10px] text-signal">{commitMsg.scope}</span>}
                        </div>
                        <p className="font-mono text-sm text-chalk">{commitMsg.full}</p>
                      </div>
                      <button
                        onClick={() => navigator.clipboard.writeText(commitMsg.full)}
                        className="btn-ghost text-xs"
                      >
                        Panoya Kopyala
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ─── Multi-Model ─── */}
              {tab === "models" && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-line bg-panel-soft/30 p-3 text-xs text-mist">
                    Bağlı API anahtarlarınız otomatik olarak en uygun aşamalara atanır:
                    planlama, kod yazma ve inceleme. Her aşama için en iyi model seçilir.
                  </div>
                  <button onClick={handleModels} disabled={loading} className="btn-plasma text-xs">
                    {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    Model Ataması Yap
                  </button>
                  {modelAssignments.length > 0 && (
                    <div className="space-y-2">
                      {modelAssignments.map((a, i) => {
                        const stageLabel = a.stage === "planning" ? "Planlama" : a.stage === "coding" ? "Kod Yazma" : "İnceleme";
                        const stageIcon = a.stage === "planning" ? <ListChecks size={12} /> : a.stage === "coding" ? <FileCode size={12} /> : <Shield size={12} />;
                        return (
                          <div key={i} className="rounded-lg border border-line bg-panel-soft/50 p-3">
                            <div className="flex items-center gap-2">
                              <span className="text-plasma-soft">{stageIcon}</span>
                              <span className="text-xs font-semibold text-chalk">{stageLabel}</span>
                              <span className="ml-auto rounded-full bg-plasma/15 px-2 py-0.5 font-mono text-[10px] text-plasma-soft">
                                {a.providerId} / {a.model || "varsayılan"}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] text-mist/70">{a.reason}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ─── Deploy ─── */}
              {tab === "deploy" && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-line bg-panel-soft/30 p-3 text-xs text-mist">
                    Projeyi tek tıkla yayınlamak için hedef platformu seçin.
                    ZIP indirip platforma yükleyebilir veya doğrudan bağlanabilirsiniz.
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {DEPLOY_TARGETS.map((target) => (
                      <a
                        key={target.id}
                        href={target.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-3 rounded-lg border border-line bg-panel-soft/50 p-3 transition-colors hover:border-plasma/40"
                      >
                        <span className="text-2xl">{target.icon}</span>
                        <div>
                          <p className="text-sm font-semibold text-chalk group-hover:text-plasma-soft">{target.label}</p>
                          <p className="text-[10px] text-mist/70">{target.description}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function QualitySection({
  title,
  icon: Icon,
  items
}: {
  title: string;
  icon: typeof Zap;
  items: { text: string; file: string; severity: string }[];
}) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-mist">
        <Icon size={12} />
        {title} ({items.length})
        <ChevronDown size={11} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-1 space-y-0.5">
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-2 py-0.5 text-xs text-chalk/70">
              <AlertTriangle size={10} className={`mt-1 shrink-0 ${
                item.severity === "high" ? "text-red-400" : item.severity === "medium" ? "text-yellow-400" : "text-mist/60"
              }`} />
              <span>{item.text} <span className="font-mono text-[10px] text-mist/60">({item.file})</span></span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
