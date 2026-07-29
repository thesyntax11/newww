"use client";

import { useState } from "react";
import { ChevronDown, Brain, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ThinkingBlockProps {
  steps: string[];
  isThinking?: boolean;
}

export default function ThinkingBlock({ steps, isThinking }: ThinkingBlockProps) {
  const [open, setOpen] = useState(false);

  if (steps.length === 0 && !isThinking) return null;

  return (
    <div className="mb-2 rounded-xl2 border border-line bg-panel-soft/40">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        {isThinking ? (
          <Sparkles size={13} className="animate-pulse text-plasma-soft" />
        ) : (
          <Brain size={13} className="text-plasma-soft" />
        )}
        <span className="font-mono text-[11px] uppercase tracking-wide text-mist">
          {isThinking ? "Düşünüyor..." : `Düşünce süreci (${steps.length} adım)`}
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
            <div className="border-t border-line px-3 py-2.5">
              {steps.map((step, i) => (
                <div key={i} className="flex items-start gap-2 py-1">
                  <span className="mt-0.5 font-mono text-[10px] text-plasma-soft/70">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="flex-1 text-[12px] leading-relaxed text-chalk/70">{step}</p>
                </div>
              ))}
              {isThinking && (
                <div className="flex items-center gap-1.5 py-1 text-[11px] text-plasma-soft/60">
                  <span className="h-1 w-1 animate-pulse rounded-full bg-plasma-soft" />
                  <span className="h-1 w-1 animate-pulse rounded-full bg-plasma-soft" style={{ animationDelay: "0.2s" }} />
                  <span className="h-1 w-1 animate-pulse rounded-full bg-plasma-soft" style={{ animationDelay: "0.4s" }} />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
