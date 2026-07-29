"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Eye, X, RefreshCw, Loader as Loader2, ExternalLink, Wrench, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface LivePreviewProps {
  sessionId: string;
  filePath: string | null;
  onClose: () => void;
  providerId?: string;
  apiKey?: string;
  onDiskChanged?: () => void;
}

interface CapturedError {
  message: string;
  type?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  stack?: string;
}

const AUTO_HEAL_MAX = 3;

export default function LivePreview({ sessionId, filePath, onClose, providerId, apiKey, onDiskChanged }: LivePreviewProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [key, setKey] = useState(0);
  const [capturedError, setCapturedError] = useState<CapturedError | null>(null);
  const [healing, setHealing] = useState(false);
  const [healResult, setHealResult] = useState<{ healed: boolean; message: string } | null>(null);
  const [healCount, setHealCount] = useState(0);
  const [autoHealEnabled, setAutoHealEnabled] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const healCountRef = useRef(0);

  const buildUrl = useCallback(() => {
    if (!filePath) return null;
    return `/api/preview?sessionId=${sessionId}&file=${encodeURIComponent(filePath)}`;
  }, [sessionId, filePath]);

  useEffect(() => {
    if (!filePath) {
      setPreviewUrl(null);
      return;
    }
    const ext = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
    if (![".html", ".htm"].includes(ext)) {
      setError("Canlı önizleme yalnızca HTML dosyaları için kullanılabilir.");
      setPreviewUrl(null);
      return;
    }
    setError(null);
    setCapturedError(null);
    setHealResult(null);
    healCountRef.current = 0;
    setHealCount(0);
    setLoading(true);
    setPreviewUrl(buildUrl());
  }, [filePath, sessionId, key, buildUrl]);

  // Listen for error postMessages from the iframe
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (!e.data || !e.data.__aetherError) return;
      const detail = e.data.detail as CapturedError;
      setCapturedError(detail);
      setHealResult(null);
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Auto-trigger healing when an error is captured
  useEffect(() => {
    if (!capturedError || !autoHealEnabled || !providerId || !apiKey || !filePath) return;
    if (healCountRef.current >= AUTO_HEAL_MAX) return;
    if (healing) return;
    triggerHeal();
  }, [capturedError, autoHealEnabled, providerId, apiKey, filePath, healing]);

  async function triggerHeal() {
    if (!capturedError || !providerId || !apiKey || !filePath) return;
    setHealing(true);
    setHealResult(null);
    healCountRef.current += 1;
    setHealCount(healCountRef.current);
    try {
      const res = await fetch("/api/repair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          providerId,
          apiKey,
          filePath,
          error: capturedError
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Onarım başarısız");
      if (data.healed) {
        setHealResult({ healed: true, message: "Hata otomatik düzeltildi — yenileniyor" });
        setCapturedError(null);
        onDiskChanged?.();
        // Reload the iframe with fresh content
        setTimeout(() => {
          setKey((k) => k + 1);
        }, 600);
      } else {
        setHealResult({ healed: false, message: data.reply || "Düzeltme üretilemedi" });
      }
    } catch (err: any) {
      setHealResult({ healed: false, message: err?.message || "Onarım hatası" });
    } finally {
      setHealing(false);
    }
  }

  function handleManualRetry() {
    if (healCountRef.current >= AUTO_HEAL_MAX) return;
    triggerHeal();
  }

  return (
    <AnimatePresence>
      {filePath && (
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ duration: 0.2 }}
          className="glass absolute inset-0 z-30 flex flex-col"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <div className="flex items-center gap-2">
              <Eye size={14} className="text-plasma-soft" />
              <span className="font-mono text-xs text-chalk">{filePath}</span>
              <span className="rounded-full bg-signal/15 px-2 py-0.5 font-mono text-[10px] text-signal">
                CANLI
              </span>
              {healing && (
                <span className="flex items-center gap-1 rounded-full bg-plasma/15 px-2 py-0.5 font-mono text-[10px] text-plasma-soft">
                  <Wrench size={9} className="animate-pulse" />
                  ONARILIYOR
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAutoHealEnabled((v) => !v)}
                title={autoHealEnabled ? "Otomatik onarım açık" : "Otomatik onarım kapalı"}
                className={autoHealEnabled ? "text-signal" : "text-mist/50"}
              >
                <Wrench size={14} />
              </button>
              <button
                onClick={() => setKey((k) => k + 1)}
                title="Yenile"
                className="text-mist hover:text-chalk"
              >
                <RefreshCw size={14} />
              </button>
              {previewUrl && (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Yeni sekmede aç"
                  className="text-mist hover:text-chalk"
                >
                  <ExternalLink size={14} />
                </a>
              )}
              <button onClick={onClose} className="text-mist hover:text-chalk">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Self-healing status bar */}
          {(capturedError || healing || healResult) && (
            <div className="border-b border-line px-4 py-2">
              {capturedError && !healing && (
                <div className="flex items-center gap-2">
                  <AlertTriangle size={13} className="text-signal" />
                  <span className="flex-1 truncate font-mono text-[11px] text-signal">
                    {capturedError.message}
                    {capturedError.lineno ? ` (satır ${capturedError.lineno})` : ""}
                  </span>
                  {healCount < AUTO_HEAL_MAX && providerId && apiKey && (
                    <button onClick={handleManualRetry} className="btn-plasma text-[10px]">
                      <Wrench size={10} /> Düzelt
                    </button>
                  )}
                  {healCount >= AUTO_HEAL_MAX && (
                    <span className="font-mono text-[10px] text-mist">
                      Onarım limiti doldu
                    </span>
                  )}
                </div>
              )}
              {healing && (
                <div className="flex items-center gap-2">
                  <Loader2 size={13} className="animate-spin text-plasma-soft" />
                  <span className="font-mono text-[11px] text-plasma-soft">
                    Yapay zeka hatayı analiz ediyor ve düzeltiyor... (deneme {healCount}/{AUTO_HEAL_MAX})
                  </span>
                </div>
              )}
              {healResult && !healing && (
                <div className={`flex items-center gap-2 ${healResult.healed ? "text-signal" : "text-signal"}`}>
                  {healResult.healed ? (
                    <>
                      <CheckCircle size={13} />
                      <span className="font-mono text-[11px]">{healResult.message}</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={13} />
                      <span className="flex-1 truncate font-mono text-[11px]">{healResult.message}</span>
                      {healCount < AUTO_HEAL_MAX && (
                        <button onClick={handleManualRetry} className="btn-ghost text-[10px]">
                          Tekrar dene
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="relative flex-1 bg-white">
            {error ? (
              <div className="flex h-full items-center justify-center text-sm text-signal">
                {error}
              </div>
            ) : loading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 size={20} className="animate-spin text-mist" />
              </div>
            ) : previewUrl ? (
              <iframe
                ref={iframeRef}
                key={key}
                src={previewUrl}
                title="Live Preview"
                sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
                className="h-full w-full border-0"
                onLoad={() => setLoading(false)}
                onError={() => {
                  setLoading(false);
                  setError("Önizleme yüklenemedi.");
                }}
              />
            ) : null}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
