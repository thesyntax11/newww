"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FileText, Image as ImageIcon, FileJson, Loader as Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface FilePreviewProps {
  sessionId: string;
  filePath: string | null;
  onClose: () => void;
}

export default function FilePreview({ sessionId, filePath, onClose }: FilePreviewProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ binary: boolean; content?: string; base64?: string; mime?: string; size?: number } | null>(null);

  useEffect(() => {
    if (!filePath) return;
    setLoading(true); setError(null); setData(null);
    fetch(`/api/file?sessionId=${sessionId}&path=${encodeURIComponent(filePath)}`)
      .then(async (res) => { const json = await res.json(); if (!res.ok) throw new Error(json.error); setData(json); })
      .catch((err) => setError(err?.message || "Önizleme hatası."))
      .finally(() => setLoading(false));
  }, [sessionId, filePath]);

  if (!filePath) return null;
  const ext = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
  const isImage = [".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(ext);
  const isMarkdown = [".md", ".mdx", ".markdown"].includes(ext);
  const isJson = ext === ".json";
  const isText = [".txt", ".sh", ".env", ".yml", ".yaml", ".csv", ".xml"].includes(ext);
  const Icon = isImage ? ImageIcon : isJson ? FileJson : FileText;

  return (
    <AnimatePresence>
      {filePath && (
        <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} transition={{ duration: 0.2 }} className="glass absolute inset-0 z-30 flex flex-col">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <div className="flex items-center gap-2"><Icon size={14} className="text-plasma-soft" /><span className="font-mono text-xs text-chalk">{filePath}</span></div>
            <button onClick={onClose} className="text-mist hover:text-chalk"><X size={16} /></button>
          </div>
          <div className="flex-1 overflow-auto">
            {loading && <div className="flex h-full items-center justify-center"><Loader2 size={20} className="animate-spin text-mist" /></div>}
            {error && <div className="flex h-full items-center justify-center text-sm text-signal">{error}</div>}
            {data && !loading && !error && (
              <>
                {isImage && data.base64 && <div className="flex h-full items-center justify-center p-4"><img src={`data:${data.mime};base64,${data.base64}`} alt={filePath} className="max-h-full max-w-full rounded-lg object-contain" /></div>}
                {isMarkdown && data.content && <div className="prose prose-invert max-w-none p-6 text-sm leading-relaxed"><ReactMarkdown remarkPlugins={[remarkGfm]}>{data.content}</ReactMarkdown></div>}
                {isJson && data.content && <pre className="h-full overflow-auto p-4 font-mono text-xs text-chalk">{(() => { try { return JSON.stringify(JSON.parse(data.content), null, 2); } catch { return data.content; } })()}</pre>}
                {isText && data.content && <pre className="h-full overflow-auto whitespace-pre-wrap p-4 font-mono text-xs text-chalk">{data.content}</pre>}
                {!isImage && !isMarkdown && !isJson && !isText && <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-mist"><FileText size={32} className="text-mist/50" /><p>Bu dosya türü için önizleme yok.</p><p className="font-mono text-xs">{ext} · {data.size || 0} bayt</p></div>}
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
