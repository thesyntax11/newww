import { ToolResult, ToolContext } from "./types";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import { diskRootForSession } from "../virtualDisk";

const execAsync = promisify(exec);
const MAX_OUTPUT = 8000;
const TIMEOUT_MS = 15_000;
const ALLOWED = ["javascript", "typescript", "python", "bash", "shell"] as const;
type Lang = (typeof ALLOWED)[number];

export async function runCode(language: string, code: string, ctx: ToolContext): Promise<ToolResult> {
  const lang = language.toLowerCase().trim();
  if (!(ALLOWED as readonly string[]).includes(lang)) {
    return { tool: "code_interpreter", ok: false, output: `Desteklenmeyen dil: "${lang}". İzin verilen: ${ALLOWED.join(", ")}` };
  }
  const diskRoot = diskRootForSession(ctx.sessionId);
  const tmpDir = path.join(diskRoot, "_sandbox");
  fs.mkdirSync(tmpDir, { recursive: true });
  try {
    let stdout = "";
    let stderr = "";
    if (lang === "python") {
      const p = path.join(tmpDir, `sb_${Date.now()}.py`);
      fs.writeFileSync(p, code, "utf-8");
      const r = await execAsync(`python3 "${p}"`, { cwd: diskRoot, timeout: TIMEOUT_MS, maxBuffer: 1024 * 1024 });
      stdout = r.stdout; stderr = r.stderr;
    } else if (lang === "bash" || lang === "shell") {
      const r = await execAsync(code, { cwd: diskRoot, timeout: TIMEOUT_MS, maxBuffer: 1024 * 1024, shell: "/bin/bash" });
      stdout = r.stdout; stderr = r.stderr;
    } else {
      const isTs = lang === "typescript";
      const ext = isTs ? "mts" : "mjs";
      const p = path.join(tmpDir, `sb_${Date.now()}.${ext}`);
      fs.writeFileSync(p, code, "utf-8");
      const flag = isTs ? "--experimental-strip-types" : "";
      const r = await execAsync(`node ${flag} "${p}"`, { cwd: diskRoot, timeout: TIMEOUT_MS, maxBuffer: 1024 * 1024 });
      stdout = r.stdout; stderr = r.stderr;
    }
    const combined = (stdout ? `stdout:\n${stdout}` : "") + (stderr ? `\nstderr:\n${stderr}` : "") + (!stdout && !stderr ? "(çıktı yok)" : "");
    return { tool: "code_interpreter", ok: true, output: combined.slice(0, MAX_OUTPUT) };
  } catch (err: any) {
    return { tool: "code_interpreter", ok: false, output: String(err?.stdout || err?.stderr || err?.message || "hata").slice(0, MAX_OUTPUT) };
  }
}
