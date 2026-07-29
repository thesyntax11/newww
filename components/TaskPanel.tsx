"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ListChecks, CircleCheck as CheckCircle2, Clock, Loader as Loader2, Circle as XCircle, Circle } from "lucide-react";
import { useAetherStore } from "@/lib/store";

interface TaskItem {
  id: string;
  title: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  files: string[];
}

export default function TaskPanel() {
  const { threads, activeProvider } = useAetherStore();
  const [tasks, setTasks] = useState<TaskItem[]>([]);

  const messages = threads[activeProvider] || [];

  useEffect(() => {
    const extracted: TaskItem[] = [];
    for (const msg of messages) {
      if (msg.role === "assistant" && msg.tasks) {
        for (const task of msg.tasks) {
          extracted.push({
            id: `${msg.tasks.indexOf(task)}-${task.title}`,
            title: task.title,
            status: task.status as TaskItem["status"],
            files: task.filesProduced || [],
          });
        }
      }
    }
    setTasks(extracted);
  }, [messages]);

  if (tasks.length === 0) return null;

  const completed = tasks.filter((t) => t.status === "completed").length;
  const total = tasks.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="glass flex flex-col rounded-xl2 p-3">
      <div className="mb-2 flex items-center gap-2">
        <ListChecks size={13} className="text-plasma-soft" />
        <span className="font-mono text-[11px] uppercase tracking-wide text-mist">
          Görevler
        </span>
        <span className="ml-auto font-mono text-[10px] text-mist/70">
          {completed}/{total}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-panel">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-plasma to-signal"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      <div className="space-y-1.5">
        <AnimatePresence>
          {tasks.map((task, i) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, delay: i * 0.03 }}
              className="flex items-start gap-2 rounded-lg border border-line/50 bg-panel-soft/30 px-2.5 py-1.5"
            >
              <span className="mt-0.5 shrink-0">
                {task.status === "completed" && <CheckCircle2 size={12} className="text-signal" />}
                {task.status === "in_progress" && <Loader2 size={12} className="animate-spin text-plasma-soft" />}
                {task.status === "failed" && <XCircle size={12} className="text-red-400" />}
                {task.status === "pending" && <Clock size={12} className="text-mist/50" />}
              </span>
              <div className="flex-1 min-w-0">
                <p className={`text-[11px] ${task.status === "completed" ? "text-chalk/60 line-through" : "text-chalk/80"}`}>
                  {task.title}
                </p>
                {task.files.length > 0 && (
                  <p className="mt-0.5 font-mono text-[9px] text-signal/60">
                    {task.files.length} dosya
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
