"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { useAetherStore } from "@/lib/store";

export default function DownloadZipButton() {
  const { sessionId, diskTree } = useAetherStore();
  const [loading, setLoading] = useState(false);
  const disabled = diskTree.length === 0 || loading;

  async function handleDownload() {
    setLoading(true);
    try {
      const res = await fetch(`/api/disk/zip?sessionId=${sessionId}`);
      if (!res.ok) throw new Error("İndirme başarısız");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `aether-project-${sessionId}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // sessiz geç, buton tekrar denenebilir durumda kalır
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={handleDownload} disabled={disabled} className="btn-plasma text-xs disabled:opacity-40">
      <Download size={14} />
      {loading ? "Arşivleniyor..." : "ZIP indir"}
    </button>
  );
}
