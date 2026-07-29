"use client";

import { Folder, FileCode2, RotateCcw, Eye, Pencil, Play, FileText } from "lucide-react";
import { DiskTreeNode } from "@/lib/types";

interface DiskExplorerProps {
  tree: DiskTreeNode[];
  onReset: () => void;
  onOpenFile?: (path: string, mode: "edit" | "preview" | "live") => void;
}

const BINARY_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".pdf", ".docx", ".zip"]);
const HTML_EXT = new Set([".html", ".htm"]);

function isBinary(name: string): boolean {
  const ext = name.slice(name.lastIndexOf(".")).toLowerCase();
  return BINARY_EXT.has(ext);
}

function isHtml(name: string): boolean {
  const ext = name.slice(name.lastIndexOf(".")).toLowerCase();
  return HTML_EXT.has(ext);
}

function Node({
  node,
  depth = 0,
  onOpenFile
}: {
  node: DiskTreeNode;
  depth?: number;
  onOpenFile?: (path: string, mode: "edit" | "preview" | "live") => void;
}) {
  if (node.type === "folder") {
    return (
      <div>
        <div
          className="flex items-center gap-1.5 py-1 font-mono text-[11px] text-mist"
          style={{ paddingLeft: depth * 12 }}
        >
          <Folder size={12} className="text-plasma-soft" />
          {node.name}
        </div>
        {node.children?.map((child) => (
          <Node key={child.path} node={child} depth={depth + 1} onOpenFile={onOpenFile} />
        ))}
      </div>
    );
  }

  const binary = isBinary(node.name);
  const html = isHtml(node.name);

  return (
    <div
      className="group flex items-center gap-1.5 py-1 font-mono text-[11px] text-chalk/80"
      style={{ paddingLeft: depth * 12 }}
    >
      <FileCode2 size={12} className="text-signal/80" />
      <span className="flex-1 truncate">{node.name}</span>
      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        {html && (
          <button
            onClick={() => onOpenFile?.(node.path, "live")}
            title="Canlı önizleme"
            className="rounded p-0.5 text-mist hover:bg-line hover:text-signal"
          >
            <Play size={10} />
          </button>
        )}
        <button
          onClick={() => onOpenFile?.(node.path, binary ? "preview" : "edit")}
          title={binary ? "Önizle" : "Düzenle"}
          className="rounded p-0.5 text-mist hover:bg-line hover:text-chalk"
        >
          {binary ? <Eye size={10} /> : <Pencil size={10} />}
        </button>
        <button
          onClick={() => onOpenFile?.(node.path, "preview")}
          title="Önizle"
          className="rounded p-0.5 text-mist hover:bg-line hover:text-chalk"
        >
          {binary ? <FileText size={10} /> : <Eye size={10} />}
        </button>
      </div>
    </div>
  );
}

export default function DiskExplorer({ tree, onReset, onOpenFile }: DiskExplorerProps) {
  return (
    <div className="glass flex h-full flex-col p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-wide text-mist">Sanal Disk</span>
        <button
          onClick={onReset}
          title="Diski sıfırla"
          className="text-mist transition-colors hover:text-signal"
        >
          <RotateCcw size={13} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {tree.length === 0 ? (
          <p className="text-[11px] leading-relaxed text-mist/70">
            Henüz dosya yok. Agent bir şey ürettiğinde burada belirecek.
          </p>
        ) : (
          tree.map((node) => <Node key={node.path} node={node} onOpenFile={onOpenFile} />)
        )}
      </div>
    </div>
  );
}
