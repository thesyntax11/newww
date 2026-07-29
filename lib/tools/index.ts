import { ToolResult, ToolContext, ToolId } from "./types";
import { webSearch } from "./webSearch";
import { runCode } from "./codeInterpreter";
import { generateImage } from "./imageGeneration";

export type { ToolId, ToolResult, ToolContext } from "./types";

export async function executeTool(
  toolId: ToolId,
  args: Record<string, string>,
  ctx: ToolContext
): Promise<ToolResult> {
  switch (toolId) {
    case "web_search":
      return webSearch(args.query || "");
    case "code_interpreter":
      return runCode(args.language || "javascript", args.code || "", ctx);
    case "image_generation":
      return generateImage(args.prompt || "", ctx);
    default:
      return { tool: toolId, ok: false, output: `Bilinmeyen araç: ${toolId}` };
  }
}

export const TOOL_INSTRUCTIONS = `
## Araç Kullanımı (Tools)

Gerektiğinde aşağıdaki araçları <tool> etiketleriyle çağırabilirsin.
Sistem etiketi parse edip aracı çalıştırır, sonucu bir sonraki turda
sana geri iletir. Araç çağrısı sohbette ham metin olarak görünmez.

1. Web arama:
<tool id="web_search">
<arg name="query">aranacak sorgu</arg>
</tool>

2. Kod çalıştırma (JavaScript, TypeScript, Python, Bash):
<tool id="code_interpreter">
<arg name="language">python</arg>
<arg name="code">print("merhaba")</arg>
</tool>

3. Görsel üretimi (OpenAI anahtarı gerekir):
<tool id="image_generation">
<arg name="prompt">modern bir logo tasarımı</arg>
</tool>

Kurallar:
- Bir araç çağırdığında, o tura başka içerik yazma; araç sonucunu bekle.
- Kod çalıştırırken çıktıyı analiz et, hata varsa düzeltip tekrar dene.
- Web arama gerçek bilgi gerektiğinde kullan; genel bilgi için kullanma.
- Görsel üretimi yalnızca kullanıcı açıkça görsel istediğinde kullan.
`;
