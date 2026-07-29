"use client";

import { useRef, useState } from "react";
import { Paperclip, Loader as Loader2 } from "lucide-react";

export default function UploadButton({
  sessionId,
  onUploaded,
  openaiKey
}: {
  sessionId: string;
  onUploaded: (summary: { written: string[]; skipped: string[] }) => void;
  openaiKey?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);

    const form = new FormData();
    form.set("sessionId", sessionId);
    if (openaiKey) form.set("openaiKey", openaiKey);
    Array.from(fileList).forEach((f) => form.append("files", f));

    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (res.ok) onUploaded({ written: data.written, skipped: data.skipped });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".zip,.txt,.md,.json,.js,.jsx,.ts,.tsx,.css,.scss,.html,.py,.yml,.yaml,.sql,.csv,.pdf,.docx,.png,.jpg,.jpeg,.webp,.gif"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <button
        type="button"
        title="Dosya veya ZIP yükle — agent içeriğini okuyacak"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-mist transition-colors hover:border-plasma/50 hover:text-chalk disabled:opacity-40"
      >
        {uploading ? <Loader2 size={15} className="animate-spin" /> : <Paperclip size={15} />}
      </button>
    </>
  );
}
