import { ToolResult } from "./types";

export async function webSearch(query: string): Promise<ToolResult> {
  const clean = query.trim().slice(0, 500);
  if (!clean) return { tool: "web_search", ok: false, output: "Boş sorgu." };
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(clean)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36" },
      signal: AbortSignal.timeout(12_000)
    });
    if (!res.ok) return { tool: "web_search", ok: false, output: `Arama başarısız (HTTP ${res.status}).` };
    const html = await res.text();
    const results: { title: string; snippet: string; url: string }[] = [];
    const blocks = html.split(/<div class="result results_links results_links_deep web-result ">/);
    for (const block of blocks.slice(1, 6)) {
      const titleMatch = block.match(/<a[^>]*class="result__a"[^>]*>([\s\S]*?)<\/a>/);
      const snippetMatch = block.match(/<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
      const urlMatch = block.match(/<a[^>]*class="result__url"[^>]*>([\s\S]*?)<\/a>/);
      if (titleMatch) {
        const strip = (s: string) => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').trim();
        results.push({ title: strip(titleMatch[1]), snippet: snippetMatch ? strip(snippetMatch[1]) : "", url: urlMatch ? strip(urlMatch[1]) : "" });
      }
    }
    if (results.length === 0) return { tool: "web_search", ok: true, output: `"${clean}" için sonuç bulunamadı.` };
    return { tool: "web_search", ok: true, output: results.map((r, i) => `${i + 1}. ${r.title}\n   ${r.snippet}\n   ${r.url}`).join("\n\n"), data: results };
  } catch (err: any) {
    return { tool: "web_search", ok: false, output: `Web arama hatası: ${err?.message || "bilinmeyen hata"}` };
  }
}
