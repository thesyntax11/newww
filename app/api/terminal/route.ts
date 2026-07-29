import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { diskRootForSession } from "@/lib/virtualDisk";

export const runtime = "nodejs";

const execAsync = promisify(exec);
const MAX_OUTPUT = 12_000;
const TIMEOUT_MS = 20_000;
const BLOCKED = ["rm -rf /", "mkfs", "dd if=", ":(){", "fork bomb", "shutdown", "reboot", "init 0", "poweroff"];

export async function POST(req: NextRequest) {
  let body: { sessionId: string; command: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 }); }
  const { sessionId, command } = body;
  if (!sessionId || !command?.trim()) return NextResponse.json({ error: "sessionId ve command zorunludur." }, { status: 400 });
  if (BLOCKED.some((b) => command.toLowerCase().includes(b))) return NextResponse.json({ error: "Bu komut güvenlik nedeniyle engellendi." }, { status: 403 });

  const cwd = diskRootForSession(sessionId);
  try {
    const { stdout, stderr } = await execAsync(command, { cwd, timeout: TIMEOUT_MS, maxBuffer: 2 * 1024 * 1024, shell: "/bin/bash" });
    return NextResponse.json({ output: (stdout + (stderr ? `\n${stderr}` : "")).slice(0, MAX_OUTPUT), exitCode: 0 });
  } catch (err: any) {
    const output = (err?.stdout || "") + (err?.stderr ? `\n${err?.stderr}` : "");
    return NextResponse.json({ output: (output || err?.message || "Komut çalıştırılamadı").slice(0, MAX_OUTPUT), exitCode: err?.code ?? 1 });
  }
}
