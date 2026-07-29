"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { getProvider } from "@/lib/providers";
import { useAetherStore } from "@/lib/store";
import { ProviderId } from "@/lib/types";

export default function ApiKeyModal({
  providerId,
  onClose
}: {
  providerId: string | null;
  onClose: () => void;
}) {
  const { apiKeys, setApiKey } = useAetherStore();
  const [value, setValue] = useState("");

  useEffect(() => {
    if (providerId) setValue(apiKeys[providerId as ProviderId] || "");
  }, [providerId, apiKeys]);

  if (!providerId) return null;
  const provider = getProvider(providerId);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-void/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => e.stopPropagation()}
          className="glass w-full max-w-sm p-6"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-chalk">
              {provider.label} anahtarı
            </h3>
            <button onClick={onClose} className="text-mist hover:text-chalk">
              <X size={16} />
            </button>
          </div>
          <input
            type="password"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="sk-..."
            className="w-full rounded-lg border border-line bg-panel-soft px-3 py-2 font-mono text-xs text-chalk outline-none focus:border-plasma/60"
          />
          <p className="mt-2 text-[11px] text-mist">
            Anahtar yalnızca bu tarayıcıda saklanır ve isteklerde doğrudan sağlayıcıya iletilir.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={onClose} className="btn-ghost text-xs">
              Vazgeç
            </button>
            <button
              onClick={() => {
                setApiKey(providerId as ProviderId, value.trim());
                onClose();
              }}
              className="btn-plasma text-xs"
            >
              Kaydet
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
