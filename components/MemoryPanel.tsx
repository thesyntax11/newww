"use client";

import { useState, useEffect, useCallback } from "react";
import { Brain, Plus, Trash2, X, Loader as Loader2, Hash } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface EnhancedMemoryItem {
  id: string;
  category: string;
  content: string;
  summary: string;
  tags: string[];
  project: string;
  language: string;
  importance: number;
  access_count: number;
  last_used_at: string;
  created_at: string;
}
interface MemoryPanelProps { sessionId: string; open: boolean; onClose: () => void; }
const CATEGORIES = ["general", "preference", "fact", "project", "explicit"];

export default function MemoryPanel({ sessionId, open, onClose }: MemoryPanelProps) {
  const [memories, setMemories] = useState<EnhancedMemoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [newImportance, setNewImportance] = useState(5);
  const [newTags, setNewTags] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await fetch(`/api/memory?sessionId=${sessionId}`); const data = await res.json(); if (res.ok) setMemories(data.memories || []); } finally { setLoading(false); }
  }, [sessionId]);

  useEffect(() => { if (open) load(); }, [open, load]);

  async function handleAdd() {
    if (!newContent.trim()) return;
    setAdding(true);
    try {
      await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          content: newContent,
          category: newCategory,
          importance: newImportance,
          tags: newTags.split(",").map((t) => t.trim()).filter(Boolean)
        })
      });
      setNewContent(""); setNewImportance(5); setNewCategory("general"); setNewTags("");
      load();
    } finally { setAdding(false); }
  }
  async function handleDelete(id: string) { await fetch("/api/memory", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId, memoryId: id }) }); load(); }
  async function handleClearAll() { await fetch("/api/memory", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId }) }); load(); }

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-void/70 backdrop-blur-sm" onClick={onClose}>
          <motion.div initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }} transition={{ duration: 0.18 }} onClick={(e) => e.stopPropagation()} className="glass flex max-h-[70vh] w-full max-w-lg flex-col p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2"><Brain size={16} className="text-plasma-soft" /><h3 className="font-display text-sm font-semibold text-chalk">Uzun Süreli Hafıza</h3></div>
              <button onClick={onClose} className="text-mist hover:text-chalk"><X size={16} /></button>
            </div>
            <div className="mb-4 space-y-2 rounded-lg border border-line bg-panel-soft p-3">
              <textarea value={newContent} onChange={(e) => setNewContent(e.target.value)} placeholder="Hatırlanacak notu yaz..." rows={2} className="w-full resize-none bg-transparent text-sm text-chalk outline-none placeholder:text-mist/60" />
              <input value={newTags} onChange={(e) => setNewTags(e.target.value)} placeholder="etiketler (virgülle ayır)" className="w-full bg-transparent text-xs text-chalk outline-none placeholder:text-mist/60" />
              <div className="flex items-center gap-2">
                <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="rounded border border-line bg-panel px-2 py-1 font-mono text-[11px] text-chalk outline-none">{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select>
                <select value={newImportance} onChange={(e) => setNewImportance(Number(e.target.value))} className="rounded border border-line bg-panel px-2 py-1 font-mono text-[11px] text-chalk outline-none">{[1,2,3,4,5,6,7,8,9,10].map((n) => <option key={n} value={n}>öncelik {n}</option>)}</select>
                <button onClick={handleAdd} disabled={!newContent.trim() || adding} className="btn-plasma ml-auto text-xs disabled:opacity-40">{adding ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Ekle</button>
              </div>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto">
              {loading ? <div className="flex items-center justify-center py-8"><Loader2 size={18} className="animate-spin text-mist" /></div>
              : memories.length === 0 ? <p className="py-8 text-center text-sm text-mist/70">Henüz kayıtlı hafıza yok. Agent, "hatırla" veya "unutma" kelimeleriyle başlayan notları otomatik kaydeder.</p>
              : memories.map((m) => (
                <div key={m.id} className="group flex items-start gap-2 rounded-lg border border-line bg-panel-soft/50 p-3">
                  <div className="flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-plasma/15 px-2 py-0.5 font-mono text-[10px] text-plasma-soft">{m.category}</span>
                      <span className="font-mono text-[10px] text-mist">öncelik {m.importance}</span>
                      {m.access_count > 0 && <span className="font-mono text-[10px] text-signal/60">{m.access_count}× erişildi</span>}
                      {m.project && <span className="font-mono text-[10px] text-mist/60">{m.project}</span>}
                      {m.tags.map((tag) => (
                        <span key={tag} className="flex items-center gap-0.5 rounded-full bg-panel px-1.5 py-0.5 font-mono text-[9px] text-mist/70"><Hash size={8} />{tag}</span>
                      ))}
                    </div>
                    <p className="text-sm leading-relaxed text-chalk/90">{m.content}</p>
                  </div>
                  <button onClick={() => handleDelete(m.id)} className="rounded p-1 text-mist opacity-0 transition-opacity hover:text-signal group-hover:opacity-100"><Trash2 size={12} /></button>
                </div>
              ))}
            </div>
            {memories.length > 0 && <button onClick={handleClearAll} className="mt-3 text-center text-[11px] text-mist hover:text-signal">Tüm hafızayı temizle</button>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
