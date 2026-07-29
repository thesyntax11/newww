export type ToolId = "web_search" | "code_interpreter" | "image_generation";

export interface ToolResult {
  tool: ToolId;
  ok: boolean;
  output: string;
  data?: unknown;
}

export interface ToolContext {
  sessionId: string;
  openaiApiKey?: string;
}
