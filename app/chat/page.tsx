"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Terminal as TerminalIcon, Brain, Play } from "lucide-react";
import ProviderPanel from "@/components/ProviderPanel";
import ApiKeyModal from "@/components/ApiKeyModal";
import ChatWindow from "@/components/ChatWindow";
import DiskExplorer from "@/components/DiskExplorer";
import DownloadZipButton from "@/components/DownloadZipButton";
import Terminal from "@/components/Terminal";
import CodeEditor from "@/components/CodeEditor";
import FilePreview from "@/components/FilePreview";
import LivePreview from "@/components/LivePreview";
import MemoryPanel from "@/components/MemoryPanel";
import { useAetherStore } from "@/lib/store";

type PanelMode = "chat" | "editor" | "preview" | "live";

export default function ChatPage() {
  const { sessionId, diskTree, setDiskTree, activeProvider, apiKeys } = useAetherStore();
  const [keyModalProvider, setKeyModalProvider] = useState<string | null>(null);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [editorFile, setEditorFile] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<string | null>(null);
  const [liveFile, setLiveFile] = useState<string | null>(null);
  const [showMemory, setShowMemory] = useState(false);

  const refreshDisk = useCallback(async () => {
    const res = await fetch(`/api/disk?sessionId=${sessionId}`);
    if (res.ok) {
      const data = await res.json();
      setDiskTree(data.tree);
    }
  }, [sessionId, setDiskTree]);

  useEffect(() => {
    refreshDisk();
  }, [refreshDisk]);

  async function handleReset() {
    await fetch("/api/disk/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId })
    });
    refreshDisk();
  }

  function handleOpenFile(path: string, mode: "edit" | "preview" | "live") {
    setEditorFile(null);
    setPreviewFile(null);
    setLiveFile(null);
    if (mode === "edit") setEditorFile(path);
    else if (mode === "preview") setPreviewFile(path);
    else if (mode === "live") setLiveFile(path);
  }

  return (
    <main className="mx-auto flex h-screen max-w-7xl flex-col px-6 py-5">
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-mist hover:text-chalk">
            <ArrowLeft size={16} />
          </Link>
          <ProviderPanel onOpenKeyModal={setKeyModalProvider} />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMemory(true)}
            title="Uzun süreli hafıza"
            className="btn-ghost text-xs"
          >
            <Brain size={14} />
            Hafıza
          </button>
          <button
            onClick={() => setTerminalOpen((v) => !v)}
            className={`text-xs ${terminalOpen ? "btn-plasma" : "btn-ghost"}`}
          >
            <TerminalIcon size={14} />
            Terminal
          </button>
          <DownloadZipButton />
        </div>
      </header>

      <div className="relative grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-[1fr_300px]">
        <div className="relative flex min-h-0 flex-col">
          <div className="relative min-h-0 flex-1">
            <ChatWindow onDiskChanged={refreshDisk} onOpenLivePreview={handleOpenFile} />
            <CodeEditor
              sessionId={sessionId}
              filePath={editorFile}
              onClose={() => setEditorFile(null)}
              onSaved={refreshDisk}
            />
            <FilePreview
              sessionId={sessionId}
              filePath={previewFile}
              onClose={() => setPreviewFile(null)}
            />
            <LivePreview
              sessionId={sessionId}
              filePath={liveFile}
              onClose={() => setLiveFile(null)}
              providerId={activeProvider}
              apiKey={apiKeys[activeProvider]}
              onDiskChanged={refreshDisk}
            />
          </div>
          {terminalOpen && (
            <Terminal
              sessionId={sessionId}
              open={terminalOpen}
              onClose={() => setTerminalOpen(false)}
            />
          )}
        </div>
        <DiskExplorer tree={diskTree} onReset={handleReset} onOpenFile={handleOpenFile} />
      </div>

      <ApiKeyModal providerId={keyModalProvider} onClose={() => setKeyModalProvider(null)} />
      <MemoryPanel sessionId={sessionId} open={showMemory} onClose={() => setShowMemory(false)} />
    </main>
  );
}
