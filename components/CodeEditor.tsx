"use client";

import { useState, useEffect, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { Save, FileCode2, Loader as Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CodeEditorProps {
  sessionId: string;
  filePath: string | null;
  onClose: () => void;
  onSaved?: () => void;
}

const EXT_LANG: Record<string, string> = {
  ".ts": "typescript", ".tsx": "typescript", ".js": "javascript", ".jsx": "javascript",
  ".json": "json", ".css": "css", ".scss": "scss", ".html": "html", ".py": "python",
  ".sh": "shell", ".sql": "sql", ".yml": "yaml", ".yaml": "yaml", ".md": "markdown", ".xml": "xml"
};

export default function CodeEditor({ sessionId, filePath, onClose, onSaved }: CodeEditorProps) {
  const [content, setContent] = useState("");
  const [original, setOriginal] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFile = useCallback(async () => {
    if (!filePath) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/file?sessionId=${sessionId}&path=${encodeURIComponent(filePath)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.binary) { setError("Bu dosya ikili formatta, editörde düzenlenemez."); setContent(""); setOriginal(""); }
      else { setContent(data.content || ""); setOriginal(data.content || ""); setDirty(false); }
    } catch (err: any) { setError(err?.message || "Dosya yüklenemedi."); }
    finally { setLoading(false); }
  }, [sessionId, filePath]);

  useEffect(() => { if (filePath) loadFile(); }, [filePath, loadFile]);

  async function handleSave() {
    if (!filePath || !dirty) return;
    setSaving(true);
    try {
      const res = await fetch("/api/file", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId, path: filePath, content }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOriginal(content); setDirty(false); onSaved?.();
    } catch (err: any) { setError(err?.message); } finally { setSaving(false); }
  }

  const ext = filePath ? filePath.slice(filePath.lastIndexOf(".")).toLowerCase() : "";
  const language = EXT_LANG[ext] || "plaintext";

  return (
    <AnimatePresence>
      {filePath && (
        <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} transition={{ duration: 0.2 }} className="glass absolute inset-0 z-30 flex flex-col">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <div className="flex items-center gap-2">
              <FileCode2 size={14} className="text-plasma-soft" />
              <span className="font-mono text-xs text-chalk">{filePath}</span>
              {dirty && <span className="h-1.5 w-1.5 rounded-full bg-signal" />}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleSave} disabled={!dirty || saving} className="btn-plasma text-xs disabled:opacity-40">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Kaydet
              </button>
              <button onClick={onClose} className="text-mist hover:text-chalk"><X size={16} /></button>
            </div>
          </div>
          {error ? (
            <div className="flex flex-1 items-center justify-center text-sm text-signal">{error}</div>
          ) : loading ? (
            <div className="flex flex-1 items-center justify-center"><Loader2 size={20} className="animate-spin text-mist" /></div>
          ) : (
            <div className="flex-1 overflow-hidden">
              <Editor height="100%" language={language} value={content} theme="vs-dark"
                onChange={(val) => { setContent(val || ""); setDirty(val !== original); }}
                options={{ fontSize: 13, fontFamily: "var(--font-mono), monospace", minimap: { enabled: false }, scrollBeyondLastLine: false, wordWrap: "on", tabSize: 2, automaticLayout: true, padding: { top: 12 } }}
              />
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
