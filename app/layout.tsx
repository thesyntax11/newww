import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "700"]
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600"]
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"]
});

export const metadata: Metadata = {
  title: "Aether — Çoklu Model AI Agent Stüdyosu",
  description:
    "Birden fazla LLM sağlayıcısıyla konuş, agent üretilen dosyaları sanal diske yazsın, tek tıkla ZIP olarak indir."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className={`${display.variable} ${body.variable} ${mono.variable} font-body bg-void text-chalk antialiased`}>
        {children}
      </body>
    </html>
  );
}
