import { writeFile } from "./virtualDisk";
import { DiskFile } from "./types";

const FILE_BLOCK_RE = /<file\s+path="([^"]+)">([\s\S]*?)<\/file>/g;
const CODE_FENCE_RE = /```([a-zA-Z0-9+-]*)\n([\s\S]*?)```/g;
const THINK_BLOCK_RE = /<think>([\s\S]*?)<\/think>/g;
const TOOL_BLOCK_RE = /<tool\s+id="([^"]+)">([\s\S]*?)<\/tool>/g;
const TOOL_ARG_RE = /<arg\s+name="([^"]+)">([\s\S]*?)<\/arg>/g;

const LANG_EXT: Record<string, string> = {
  ts: "ts", typescript: "ts", tsx: "tsx", js: "js", javascript: "js",
  jsx: "jsx", json: "json", css: "css", scss: "scss", html: "html",
  py: "py", python: "py", sh: "sh", bash: "sh", sql: "sql", yml: "yaml",
  yaml: "yaml", md: "md"
};

export interface ToolCall {
  id: string;
  args: Record<string, string>;
  raw: string;
}

export interface AgentResult {
  chatText: string;
  writtenFiles: DiskFile[];
  thinking: string[];
  toolCalls: ToolCall[];
}

function parseToolArgs(inner: string): Record<string, string> {
  const args: Record<string, string> = {};
  const re = new RegExp(TOOL_ARG_RE.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(inner)) !== null) {
    args[m[1].trim()] = m[2].trim();
  }
  return args;
}

/**
 * Model cevabını parse eder:
 * 1. <think> blokları -> düşünce adımları (thinking)
 * 2. <tool> blokları -> araç çağrıları (toolCalls)
 * 3. <file path="..."> blokları -> sanal diske yazılır
 * 4. Güvenlik ağı: ```kod``` blokları da otomatik diske yazılır
 */
export function processAgentResponse(sessionId: string, rawText: string): AgentResult {
  const writtenFiles: DiskFile[] = [];
  const thinking: string[] = [];
  const toolCalls: ToolCall[] = [];

  // 1. Extract thinking blocks
  let text = rawText.replace(THINK_BLOCK_RE, (_match, inner: string) => {
    const steps = inner
      .split("\n")
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);
    thinking.push(...steps);
    return "";
  });

  // 2. Extract tool calls
  text = text.replace(TOOL_BLOCK_RE, (match, toolId: string, inner: string) => {
    const args = parseToolArgs(inner);
    toolCalls.push({ id: toolId, args, raw: match });
    return `\n🔧 Araç çağrıldı: \`${toolId}\`\n`;
  });

  // 3. Extract file blocks
  text = text.replace(FILE_BLOCK_RE, (_match, filePath: string, content: string) => {
    const trimmed = content.replace(/^\n/, "").replace(/\n$/, "");
    const file = writeFile(sessionId, filePath.trim(), trimmed);
    writtenFiles.push(file);
    return `\n📄 \`${filePath.trim()}\` sanal diske yazıldı.\n`;
  });

  // 4. Safety net: bare code fences
  let fenceIndex = 0;
  text = text.replace(CODE_FENCE_RE, (_match, lang: string, content: string) => {
    fenceIndex += 1;
    const ext = LANG_EXT[(lang || "").toLowerCase()] || "txt";
    const relPath = `misc/agent-output-${Date.now()}-${fenceIndex}.${ext}`;
    const file = writeFile(sessionId, relPath, content.replace(/\n$/, ""));
    writtenFiles.push(file);
    return `\n📄 \`${relPath}\` sanal diske yazıldı.\n`;
  });

  return { chatText: text.trim(), writtenFiles, thinking, toolCalls };
}

/**
 * Execute all tool calls in a response and return a combined result string
 * to feed back into the conversation as a tool-result message.
 */
export async function runToolCalls(
  calls: ToolCall[],
  ctx: { sessionId: string; openaiApiKey?: string }
): Promise<string> {
  const { executeTool } = await import("./tools");
  const parts: string[] = [];
  for (const call of calls) {
    const result = await executeTool(call.id as any, call.args, ctx);
    const status = result.ok ? "başarılı" : "başarısız";
    parts.push(
      `<tool-result id="${call.id}" status="${status}">\n${result.output}\n</tool-result>`
    );
  }
  return parts.join("\n\n");
}
