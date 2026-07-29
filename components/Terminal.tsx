"use client";

import { useEffect, useRef, useState } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { Terminal as TerminalIcon, X, Loader as Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface TerminalProps {
  sessionId: string;
  open: boolean;
  onClose: () => void;
}

export default function Terminal({ sessionId, open, onClose }: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerm | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const inputBuffer = useRef("");
  const cursorPos = useRef(0);
  const historyRef = useRef<{ command: string; output: string; exitCode: number }[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !containerRef.current || termRef.current) return;

    const term = new XTerm({
      theme: {
        background: "#0A0B10", foreground: "#EDEEF3", cursor: "#9D5CFF",
        selectionBackground: "rgba(157,92,255,0.3)", black: "#0A0B10", red: "#FF6B6B",
        green: "#51CF66", yellow: "#FFB454", blue: "#74C0FC", magenta: "#9D5CFF",
        cyan: "#66D9EF", white: "#EDEEF3"
      },
      fontSize: 13, fontFamily: "var(--font-mono), monospace", cursorBlink: true, convertEol: true
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(containerRef.current);
    fit.fit();
    termRef.current = term;
    fitRef.current = fit;

    term.writeln("\x1b[1;35m╔════════════════════════════════════════╗\x1b[0m");
    term.writeln("\x1b[1;35m║   Aether Sanal Terminal — bash          ║\x1b[0m");
    term.writeln("\x1b[1;35m║   Komut yaz, Enter'a bas.               ║\x1b[0m");
    term.writeln("\x1b[1;35m╚════════════════════════════════════════╝\x1b[0m\r\n");
    const prompt = () => term.write("\x1b[1;36maether\x1b[0m \x1b[2m>\x1b[0m ");
    prompt();

    const handleResize = () => fit.fit();
    window.addEventListener("resize", handleResize);

    term.onData((data) => {
      if (busy) return;
      const code = data.charCodeAt(0);
      if (data === "\r") {
        term.write("\r\n");
        const cmd = inputBuffer.current.trim();
        inputBuffer.current = ""; cursorPos.current = 0;
        if (cmd) { setBusy(true); runCommand(cmd); } else { prompt(); }
      } else if (code === 127) {
        if (cursorPos.current > 0) {
          inputBuffer.current = inputBuffer.current.slice(0, cursorPos.current - 1) + inputBuffer.current.slice(cursorPos.current);
          cursorPos.current--; term.write("\b \b");
        }
      } else if (code === 3) { term.write("^C\r\n"); inputBuffer.current = ""; cursorPos.current = 0; prompt(); }
      else if (code === 12) { term.clear(); prompt(); }
      else if (data === "\x1b[A") {
        const prev = historyRef.current[historyRef.current.length - 1];
        if (prev) { term.write("\r\x1b[K\x1b[1;36maether\x1b[0m \x1b[2m>\x1b[0m "); inputBuffer.current = prev.command; cursorPos.current = prev.command.length; term.write(prev.command); }
      } else if (data === "\x1b[B") { term.write("\r\x1b[K\x1b[1;36maether\x1b[0m \x1b[2m>\x1b[0m "); inputBuffer.current = ""; cursorPos.current = 0; }
      else if (data === "\x1b[C") { if (cursorPos.current < inputBuffer.current.length) { cursorPos.current++; term.write("\x1b[C"); } }
      else if (data === "\x1b[D") { if (cursorPos.current > 0) { cursorPos.current--; term.write("\x1b[D"); } }
      else if (code >= 32) {
        const before = inputBuffer.current.slice(0, cursorPos.current);
        const after = inputBuffer.current.slice(cursorPos.current);
        inputBuffer.current = before + data + after; cursorPos.current++;
        if (after) { term.write("\r\x1b[K\x1b[1;36maether\x1b[0m \x1b[2m>\x1b[0m "); term.write(inputBuffer.current); for (let i = 0; i < after.length; i++) term.write("\x1b[D"); }
        else term.write(data);
      }
    });

    async function runCommand(cmd: string) {
      try {
        const res = await fetch("/api/terminal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId, command: cmd }) });
        const data = await res.json();
        if (data.output) term.writeln(data.output); else if ((data.exitCode ?? 0) === 0) term.writeln("");
        if (data.error) term.writeln(`\x1b[31m${data.error}\x1b[0m`);
        historyRef.current.push({ command: cmd, output: data.output || "", exitCode: data.exitCode ?? 0 });
      } catch (err: any) { term.writeln(`\x1b[31mHata: ${err?.message || "komut çalıştırılamadı"}\x1b[0m`); }
      finally { setBusy(false); prompt(); }
    }

    const ro = new ResizeObserver(() => fit.fit());
    ro.observe(containerRef.current);
    return () => { window.removeEventListener("resize", handleResize); ro.disconnect(); term.dispose(); termRef.current = null; };
  }, [open, sessionId]);

  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="glass mt-4 flex flex-col overflow-hidden" style={{ maxHeight: "320px" }}>
        <div className="flex items-center justify-between border-b border-line px-4 py-2">
          <div className="flex items-center gap-2"><TerminalIcon size={14} className="text-plasma-soft" /><span className="font-mono text-[11px] uppercase tracking-wide text-mist">Terminal</span>{busy && <Loader2 size={11} className="animate-spin text-signal" />}</div>
          <button onClick={onClose} className="text-mist hover:text-chalk"><X size={14} /></button>
        </div>
        <div ref={containerRef} className="flex-1 overflow-hidden p-2" style={{ minHeight: "220px" }} />
      </motion.div>
    </AnimatePresence>
  );
}
