"use client";

import { PROVIDERS } from "@/lib/providers";
import { useAetherStore } from "@/lib/store";
import { KeyRound } from "lucide-react";
import { clsx } from "clsx";

export default function ProviderPanel({ onOpenKeyModal }: { onOpenKeyModal: (id: string) => void }) {
  const { activeProvider, setActiveProvider, apiKeys } = useAetherStore();

  return (
    <div className="flex flex-wrap gap-2">
      {PROVIDERS.map((p) => {
        const active = p.id === activeProvider;
        const hasKey = Boolean(apiKeys[p.id]);
        return (
          <button
            key={p.id}
            onClick={() => setActiveProvider(p.id)}
            className={clsx(
              "group flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
              active ? "border-plasma/60 bg-plasma/10 text-chalk" : "border-line text-mist hover:text-chalk"
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.color }} />
            {p.label}
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onOpenKeyModal(p.id);
              }}
              className={clsx(
                "ml-1 rounded-full p-1 transition-colors hover:bg-line",
                hasKey ? "text-signal" : "text-mist/60"
              )}
              title={hasKey ? "Anahtar tanımlı" : "Anahtar gir"}
            >
              <KeyRound size={11} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
