"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ListChecks, CircleCheck as CheckCircle2, Circle as XCircle, Clock, Loader as Loader2, ShieldCheck, Gauge, TriangleAlert as AlertTriangle, Search } from "lucide-react";
import { AgentTaskLite, ReviewResultLite, OrchestrationStageLite } from "@/lib/types";

function statusIcon(status: string) {
  switch (status) {
    case "completed":
      return <CheckCircle2 size={11} className="text-signal" />;
    case "failed":
      return <XCircle size={11} className="text-red-400" />;
    case "running":
      return <Loader2 size={11} className="animate-spin text-plasma-soft" />;
    case "skipped":
      return <Clock size={11} className="text-mist/50" />;
    default:
      return <Clock size={11} className="text-mist/50" />;
  }
}

function confidenceColor(confidence: number): string {
  if (confidence >= 85) return "text-signal";
  if (confidence >= 60) return "text-signal-soft";
  if (confidence >= 40) return "text-yellow-400";
  return "text-red-400";
}

function confidenceBg(confidence: number): string {
  if (confidence >= 85) return "bg-signal/15";
  if (confidence >= 60) return "bg-signal/10";
  if (confidence >= 40) return "bg-yellow-400/10";
  return "bg-red-400/10";
}

interface OrchestrationPanelProps {
  tasks: AgentTaskLite[];
  review: ReviewResultLite | null;
  stages: OrchestrationStageLite[];
}

export default function OrchestrationPanel({ tasks, review, stages }: OrchestrationPanelProps) {
  const [open, setOpen] = useState(true);

  if (tasks.length === 0 && stages.length === 0 && !review) return null;

  return (
    <div className="mb-2 rounded-xl2 border border-line bg-panel-soft/40">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <ListChecks size={13} className="text-plasma-soft" />
        <span className="font-mono text-[11px] uppercase tracking-wide text-mist">
          Agent hattı
          {tasks.length > 0 && ` · ${tasks.length} görev`}
          {review && ` · güven %${review.confidence}`}
        </span>
        <ChevronDown
          size={13}
          className={`ml-auto text-mist transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-line px-3 py-2.5 space-y-3">
              {/* Stages timeline */}
              {stages.length > 0 && (
                <div className="space-y-1">
                  {stages.map((stage, i) => (
                    <div key={i} className="flex items-start gap-2 py-0.5">
                      <span className="mt-0.5">{statusIcon(stage.status)}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] text-chalk/80">{stage.label}</span>
                          {stage.durationMs > 0 && (
                            <span className="font-mono text-[9px] text-mist/60">
                              {(stage.durationMs / 1000).toFixed(1)}s
                            </span>
                          )}
                        </div>
                        {stage.detail && (
                          <p className="text-[10px] leading-relaxed text-mist/70">{stage.detail}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Task list */}
              {tasks.length > 0 && (
                <div className="space-y-1 border-t border-line/50 pt-2">
                  {tasks.map((task, i) => (
                    <div key={i} className="flex items-start gap-2 py-0.5">
                      <span className="mt-0.5">{statusIcon(task.status)}</span>
                      <div className="flex-1">
                        <span className="font-mono text-[10px] text-chalk/80">
                          {task.index + 1}. {task.title}
                        </span>
                        {task.filesProduced.length > 0 && (
                          <span className="ml-1.5 font-mono text-[9px] text-signal/70">
                            ({task.filesProduced.length} dosya)
                          </span>
                        )}
                        {task.error && (
                          <p className="text-[10px] text-red-400">{task.error}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Review summary */}
              {review && (
                <div className="border-t border-line/50 pt-2 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={12} className="text-plasma-soft" />
                    <span className="font-mono text-[10px] uppercase tracking-wide text-mist">
                      Değerlendirme
                    </span>
                    <div className={`ml-auto flex items-center gap-1 rounded-full px-2 py-0.5 ${confidenceBg(review.confidence)}`}>
                      <Gauge size={10} className={confidenceColor(review.confidence)} />
                      <span className={`font-mono text-[10px] font-bold ${confidenceColor(review.confidence)}`}>
                        %{review.confidence}
                      </span>
                    </div>
                  </div>
                  {review.critique && (
                    <p className="text-[10px] leading-relaxed text-chalk/70">{review.critique}</p>
                  )}
                  {review.issues.length > 0 && (
                    <div className="space-y-0.5">
                      {review.issues.map((issue, i) => (
                        <div key={i} className="flex items-start gap-1.5">
                          <AlertTriangle
                            size={10}
                            className={`mt-0.5 ${
                              issue.severity === "critical" || issue.severity === "high"
                                ? "text-red-400"
                                : issue.severity === "medium"
                                ? "text-yellow-400"
                                : "text-mist/60"
                            }`}
                          />
                          <span className="text-[10px] leading-relaxed text-chalk/70">
                            <span className="font-mono text-[9px] text-mist/60">[{issue.severity}/{issue.category}]</span>{" "}
                            {issue.description}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {review.missingRequirements.length > 0 && (
                    <div className="flex items-start gap-1.5">
                      <AlertTriangle size={10} className="mt-0.5 text-yellow-400" />
                      <span className="text-[10px] text-chalk/70">
                        Eksik: {review.missingRequirements.join(", ")}
                      </span>
                    </div>
                  )}
                  {review.needsWebSearch && (
                    <div className="flex items-center gap-1.5">
                      <Search size={10} className="text-plasma-soft" />
                      <span className="text-[10px] text-plasma-soft">Ek bilgi gerekebilir</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
