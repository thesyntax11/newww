"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader as Loader2, FileCheck2, Paperclip as PaperclipIcon, Wrench, Play } from "lucide-react";
import { useAetherStore } from "@/lib/store";
import { getProvider } from "@/lib/providers";
import UploadButton from "./UploadButton";
import ThinkingBlock from "./ThinkingBlock";
import OrchestrationPanel from "./OrchestrationPanel";

function MessageLine({ line }: { line: string }) {
  if (line.startsWith("📄")) {
    return (
      <div className="mt-1 flex items-center gap-1.5 font-mono text-[11px] text-signal">
        <FileCheck2 size={12} />
        {line.replace("📄", "").trim()}
      </div>
    );
  }
  if (line.startsWith("🔧")) {
    return (
      <div className="mt-1 flex items-center gap-1.5 font-mono text-[11px] text-plasma-soft">
        <Wrench size={12} />
        {line.replace("🔧", "").trim()}
      </div>
    );
  }
  return <p className="leading-relaxed">{line}</p>;
}

export default function ChatWindow({
  onDiskChanged,
  onOpenLivePreview
}: {
  onDiskChanged: () => void;
  onOpenLivePreview?: (path: string, mode: "edit" | "preview" | "live") => void;
}) {
  const { sessionId, activeProvider, apiKeys, threads, appendMessage, isSending, setSending } =
    useAetherStore();
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploadNote, setUploadNote] = useState<string | null>(null);
  const [livePreviewPath, setLivePreviewPath] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages = threads[activeProvider] || [];
  const provider = getProvider(activeProvider);
  const apiKey = apiKeys[activeProvider];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isSending]);

  async function handleSend() {
    const text = input.trim();
    if (!text || isSending) return;

    if (!apiKey) {
      setError(`${provider.label} için önce bir API anahtarı girmelisin.`);
      return;
    }

    setError(null);
    appendMessage(activeProvider, { role: "user", content: text });
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          providerId: activeProvider,
          apiKey,
          messages: [...messages, { role: "user", content: text }]
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Bilinmeyen hata");

      appendMessage(activeProvider, {
        role: "assistant",
        content: data.reply,
        thinking: data.thinking || [],
        tasks: data.tasks || [],
        review: data.review || null,
        stages: data.stages || []
      });
      if (data.writtenFiles?.length > 0) onDiskChanged();

      // Auto-detect HTML files and offer live preview
      if (data.writtenFiles?.length > 0) {
        const htmlFile = data.writtenFiles.find((f: any) =>
          f.path.endsWith(".html") || f.path.endsWith(".htm")
        );
        if (htmlFile) {
          setLivePreviewPath(htmlFile.path);
        }
      }
    } catch (err: any) {
      setError(err?.message || "İstek gönderilemedi.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="glass flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5">
        {messages.length === 0 && (
          <p className="text-sm text-mist">
            {provider.label} ile sohbete başla. Bir arayüz, bileşen veya backend istediğinde agent
            dosyaları otomatik olarak sanal diske yazar.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                m.role === "user"
                  ? "max-w-[80%] rounded-xl2 bg-plasma/15 px-4 py-2.5 text-sm text-chalk"
                  : "max-w-[80%] rounded-xl2 bg-panel-soft px-4 py-2.5 text-sm text-chalk"
              }
            >
              {m.role === "assistant" && m.thinking && m.thinking.length > 0 && (
                <ThinkingBlock steps={m.thinking} />
              )}
              {m.role === "assistant" && (
                <OrchestrationPanel
                  tasks={m.tasks || []}
                  review={m.review || null}
                  stages={m.stages || []}
                />
              )}
              {m.content.split("\n").map((line, idx) => (
                <MessageLine key={idx} line={line} />
              ))}
            </div>
          </div>
        ))}
        {isSending && (
          <div className="space-y-2">
            <ThinkingBlock steps={[]} isThinking />
            <div className="flex items-center gap-2 text-xs text-mist">
              <Loader2 size={13} className="animate-spin" />
              {provider.label} yanıtlıyor...
            </div>
          </div>
        )}
      </div>

      {livePreviewPath && (
        <div className="flex items-center gap-2 border-t border-line px-5 py-2">
          <Play size={12} className="text-signal" />
          <span className="text-[11px] text-chalk">{livePreviewPath} hazır</span>
          <button
            onClick={() => {
              onOpenLivePreview?.(livePreviewPath, "live");
              setLivePreviewPath(null);
            }}
            className="btn-plasma text-[11px]"
          >
            Canlı önizle
          </button>
          <button
            onClick={() => setLivePreviewPath(null)}
            className="text-[11px] text-mist hover:text-chalk"
          >
            Kapat
          </button>
        </div>
      )}

      {error && <div className="border-t border-line px-5 py-2 text-xs text-signal">{error}</div>}
      {uploadNote && (
        <div className="flex items-center gap-1.5 border-t border-line px-5 py-2 text-[11px] text-plasma-soft">
          <PaperclipIcon size={11} />
          {uploadNote}
        </div>
      )}

      <div className="flex items-center gap-2 border-t border-line p-3">
        <UploadButton
          sessionId={sessionId}
          openaiKey={activeProvider === "openai" ? apiKey : undefined}
          onUploaded={({ written, skipped }) => {
            onDiskChanged();
            const parts: string[] = [];
            if (written.length > 0) parts.push(`${written.length} dosya yüklendi ve okunuyor`);
            if (skipped.length > 0) parts.push(`${skipped.length} dosya atlandı`);
            setUploadNote(parts.length > 0 ? parts.join(" · ") : "Yükleme tamamlandı");
          }}
        />
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          rows={1}
          placeholder="Örn: Glassmorphism bir fiyatlandırma bölümü oluştur..."
          className="max-h-32 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-chalk outline-none placeholder:text-mist/60"
        />
        <button
          onClick={handleSend}
          disabled={isSending || !input.trim()}
          className="btn-plasma h-9 w-9 justify-center p-0 disabled:opacity-40"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}
