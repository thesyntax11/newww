"use client";

import { create } from "zustand";
import { nanoid } from "nanoid";
import { ChatMessage, DiskTreeNode, ProviderId } from "./types";

interface AetherState {
  sessionId: string;
  activeProvider: ProviderId;
  apiKeys: Partial<Record<ProviderId, string>>;
  threads: Record<ProviderId, ChatMessage[]>;
  diskTree: DiskTreeNode[];
  isSending: boolean;
  setActiveProvider: (id: ProviderId) => void;
  setApiKey: (id: ProviderId, key: string) => void;
  appendMessage: (id: ProviderId, message: ChatMessage) => void;
  setDiskTree: (tree: DiskTreeNode[]) => void;
  setSending: (v: boolean) => void;
}

function readSessionId(): string {
  if (typeof window === "undefined") return "server";
  const existing = window.localStorage.getItem("aether-session-id");
  if (existing) return existing;
  const fresh = nanoid(10);
  window.localStorage.setItem("aether-session-id", fresh);
  return fresh;
}

function readApiKeys(): Partial<Record<ProviderId, string>> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem("aether-api-keys") || "{}");
  } catch {
    return {};
  }
}

export const useAetherStore = create<AetherState>((set, get) => ({
  sessionId: readSessionId(),
  activeProvider: "openai",
  apiKeys: readApiKeys(),
  threads: {
    openai: [], anthropic: [], google: [], groq: [], mistral: [],
    xai: [], deepseek: [], cohere: [], together: [], fireworks: [],
    openrouter: [], perplexity: []
  },
  diskTree: [],
  isSending: false,
  setActiveProvider: (id) => set({ activeProvider: id }),
  setApiKey: (id, key) => {
    const next = { ...get().apiKeys, [id]: key };
    if (typeof window !== "undefined") {
      window.localStorage.setItem("aether-api-keys", JSON.stringify(next));
    }
    set({ apiKeys: next });
  },
  appendMessage: (id, message) => {
    const next = { ...get().threads, [id]: [...(get().threads[id] || []), message] };
    set({ threads: next });
  },
  setDiskTree: (tree) => set({ diskTree: tree }),
  setSending: (v) => set({ isSending: v })
}));
