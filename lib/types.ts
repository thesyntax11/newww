export type ProviderId =
  | "openai"
  | "anthropic"
  | "google"
  | "groq"
  | "mistral"
  | "xai"
  | "deepseek"
  | "cohere"
  | "together"
  | "fireworks"
  | "openrouter"
  | "perplexity";

export interface ImageAttachment {
  path: string;
  mime: string;
  base64: string;
}

export interface ProviderConfig {
  id: ProviderId;
  label: string;
  model: string;
  color: string;
  endpoint: string;
  supportsVision: boolean;
  buildHeaders: (apiKey: string) => Record<string, string>;
  buildBody: (messages: ChatMessage[], system: string, model: string, images: ImageAttachment[]) => unknown;
  extractText: (json: any) => string;
}

export interface AgentTaskLite {
  index: number;
  title: string;
  description: string;
  status: string;
  resultSummary: string;
  confidence: number;
  filesProduced: string[];
  error: string;
}

export interface ReviewResultLite {
  approved: boolean;
  confidence: number;
  critique: string;
  issues: { severity: string; category: string; description: string; file?: string }[];
  suggestedFixes: string;
  missingRequirements: string[];
  needsWebSearch: boolean;
}

export interface OrchestrationStageLite {
  role: string;
  label: string;
  status: string;
  detail: string;
  durationMs: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  thinking?: string[];
  tasks?: AgentTaskLite[];
  review?: ReviewResultLite | null;
  stages?: OrchestrationStageLite[];
}

export interface DiskFile {
  path: string;
  size: number;
  updatedAt: string;
}

export interface DiskTreeNode {
  name: string;
  path: string;
  type: "file" | "folder";
  children?: DiskTreeNode[];
  size?: number;
}
