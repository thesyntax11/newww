import Link from "next/link";
import { ArrowUpRight, Sparkles, Box } from "lucide-react";
import ProcessRail from "@/components/ProcessRail";
import GlassPanel from "@/components/GlassPanel";
import { PROVIDERS } from "@/lib/providers";

export default function LandingPage() {
  return (
    <main className="relative mx-auto max-w-6xl px-6 pb-32 pt-10 md:pt-16">
      <nav className="mb-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-plasma shadow-glow" />
          <span className="font-display text-sm font-bold tracking-wide text-chalk">AETHER</span>
        </div>
        <Link href="/chat" className="btn-ghost text-xs">
          Stüdyoya Git <ArrowUpRight size={14} />
        </Link>
      </nav>

      <section className="grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-4">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 font-mono text-[11px] text-plasma-soft">
            <Sparkles size={12} />
            ÇOKLU MODEL · SANAL DİSK · TEK ZIP
          </div>
          <h1 className="font-display text-4xl font-bold leading-[1.08] text-chalk md:text-5xl">
            Sohbet et,
            <br />
            <span className="text-plasma">agent inşa etsin.</span>
          </h1>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-mist md:text-base">
            OpenAI, Anthropic, Gemini, Groq ve Mistral&apos;i tek arayüzden yönet.
            Model sohbette değil, arka planındaki gerçek bir dosya sisteminde
            üretim yapar. İşin bitince tek tıkla eksiksiz bir ZIP indir.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/chat" className="btn-plasma">
              Agent&apos;ı Başlat <ArrowUpRight size={16} />
            </Link>
            <a href="#pipeline" className="btn-ghost">
              Nasıl çalışır?
            </a>
          </div>
        </div>
        <GlassPanel className="relative flex h-[360px] flex-col justify-between overflow-hidden p-6 md:h-[420px]">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] text-mist">bağlı_sağlayıcılar.json</span>
            <Box size={16} className="text-plasma-soft" />
          </div>
          <div className="flex flex-1 flex-col justify-center gap-3">
            {PROVIDERS.map((p, i) => (
              <div
                key={p.id}
                className="glass-soft flex items-center justify-between px-4 py-3 animate-drift"
                style={{ animationDelay: `${i * 0.4}s` }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-2 w-2 rounded-full animate-pulseline"
                    style={{ background: p.color, animationDelay: `${i * 0.3}s` }}
                  />
                  <span className="font-mono text-xs text-chalk">{p.label}</span>
                </div>
                <span className="font-mono text-[10px] text-mist">{p.model}</span>
              </div>
            ))}
          </div>
          <p className="font-mono text-[11px] text-mist">
            3D, tasarım ve backend üretimini bu sağlayıcılardan seçtiğin model yapar.
          </p>
        </GlassPanel>
      </section>

      <section id="pipeline" className="mt-24">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="font-display text-2xl font-bold text-chalk">İşlem hattı</h2>
          <span className="font-mono text-xs text-mist">4 gerçek aşama</span>
        </div>
        <ProcessRail />
      </section>

      <section className="mt-24">
        <GlassPanel className="flex flex-col items-start justify-between gap-6 p-8 md:flex-row md:items-center">
          <div>
            <h3 className="font-display text-xl font-semibold text-chalk">
              Kendi anahtarınla gel, kod tabanı seninle çıksın.
            </h3>
            <p className="mt-2 max-w-md text-sm text-mist">
              API anahtarların yalnızca sunucu tarafında, oturum bazlı işlenir —
              istemci koduna hiçbir zaman gömülmez.
            </p>
          </div>
          <Link href="/chat" className="btn-plasma whitespace-nowrap">
            Şimdi Dene <ArrowUpRight size={16} />
          </Link>
        </GlassPanel>
      </section>
    </main>
  );
}
