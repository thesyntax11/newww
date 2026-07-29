"use client";

import { motion } from "framer-motion";
import { MessagesSquare, Cpu, FolderTree, PackageCheck } from "lucide-react";

const STEPS = [
  {
    n: "01",
    icon: MessagesSquare,
    title: "Sohbet",
    desc: "İstediğin sağlayıcıyı seç, isteğini yaz. Anahtarların yalnızca sunucuda kalır."
  },
  {
    n: "02",
    icon: Cpu,
    title: "Agent",
    desc: "Model, tasarım ve backend skill'lerine göre üretim kalitesinde dosyalar üretir."
  },
  {
    n: "03",
    icon: FolderTree,
    title: "Sanal Disk",
    desc: "Üretilen her dosya oturumuna özel diske gerçek bir dizin yapısıyla yazılır."
  },
  {
    n: "04",
    icon: PackageCheck,
    title: "ZIP",
    desc: "Tek tıkla tüm proje eksiksiz bir arşiv olarak bilgisayarına iner."
  }
];

export default function ProcessRail() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      {STEPS.map((step, i) => (
        <motion.div
          key={step.n}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, delay: i * 0.08 }}
          className="glass-soft relative overflow-hidden p-5"
        >
          <span className="font-mono text-xs text-plasma-soft/70">{step.n}</span>
          <div className="mt-3 flex items-center gap-2">
            <step.icon size={18} className="text-plasma-soft" />
            <h3 className="font-display text-base font-medium text-chalk">{step.title}</h3>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-mist">{step.desc}</p>
          {i < STEPS.length - 1 && (
            <div className="absolute right-0 top-1/2 hidden h-px w-4 -translate-y-1/2 translate-x-full bg-line md:block" />
          )}
        </motion.div>
      ))}
    </div>
  );
}
