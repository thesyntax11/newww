import fs from "fs";
import path from "path";
import { DiskFile, DiskTreeNode } from "./types";

const DISK_ROOT = path.resolve(process.cwd(), process.env.DISK_ROOT || "./storage");

function sessionRoot(sessionId: string): string {
  const safeId = sessionId.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!safeId) throw new Error("Geçersiz oturum kimliği");
  const root = path.join(DISK_ROOT, safeId);
  fs.mkdirSync(root, { recursive: true });
  return root;
}

/** path traversal koruması: normalize edilmiş yol her zaman kök dizin içinde kalmalı */
function resolveSafe(root: string, relPath: string): string {
  const target = path.normalize(path.join(root, relPath));
  if (!target.startsWith(root)) {
    throw new Error("Geçersiz dosya yolu");
  }
  return target;
}

export function writeFile(sessionId: string, relPath: string, content: string): DiskFile {
  const root = sessionRoot(sessionId);
  const target = resolveSafe(root, relPath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf-8");
  const stat = fs.statSync(target);
  return { path: relPath, size: stat.size, updatedAt: stat.mtime.toISOString() };
}

export function writeBinaryFile(sessionId: string, relPath: string, buffer: Buffer): DiskFile {
  const root = sessionRoot(sessionId);
  const target = resolveSafe(root, relPath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, buffer);
  const stat = fs.statSync(target);
  return { path: relPath, size: stat.size, updatedAt: stat.mtime.toISOString() };
}

export function readFileContent(sessionId: string, relPath: string): string {
  const root = sessionRoot(sessionId);
  const target = resolveSafe(root, relPath);
  return fs.readFileSync(target, "utf-8");
}

export function readFileBuffer(sessionId: string, relPath: string): Buffer {
  const root = sessionRoot(sessionId);
  const target = resolveSafe(root, relPath);
  return fs.readFileSync(target);
}

export function listFiles(sessionId: string): DiskFile[] {
  const root = sessionRoot(sessionId);
  const result: DiskFile[] = [];

  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else {
        const stat = fs.statSync(full);
        result.push({
          path: path.relative(root, full).split(path.sep).join("/"),
          size: stat.size,
          updatedAt: stat.mtime.toISOString()
        });
      }
    }
  }

  if (fs.existsSync(root)) walk(root);
  return result.sort((a, b) => a.path.localeCompare(b.path));
}

export function buildTree(sessionId: string): DiskTreeNode[] {
  const files = listFiles(sessionId);
  const root: DiskTreeNode[] = [];

  for (const file of files) {
    const parts = file.path.split("/");
    let level = root;
    let currentPath = "";

    parts.forEach((part, idx) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isFile = idx === parts.length - 1;
      let node = level.find((n) => n.name === part);
      if (!node) {
        node = {
          name: part,
          path: currentPath,
          type: isFile ? "file" : "folder",
          children: isFile ? undefined : [],
          size: isFile ? file.size : undefined
        };
        level.push(node);
      }
      if (!isFile) level = node.children!;
    });
  }

  return root;
}

export function diskRootForSession(sessionId: string): string {
  return sessionRoot(sessionId);
}

export function resetDisk(sessionId: string): void {
  const root = sessionRoot(sessionId);
  fs.rmSync(root, { recursive: true, force: true });
  fs.mkdirSync(root, { recursive: true });
}
