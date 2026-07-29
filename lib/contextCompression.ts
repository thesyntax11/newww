import { ChatMessage } from "./types";
import { callProvider } from "./providers";

const COMPRESS_THRESHOLD = 16;
const KEEP_RECENT = 6;

export function shouldCompress(messages: ChatMessage[]): boolean {
  return messages.length >= COMPRESS_THRESHOLD;
}

export async function compressContext(
  messages: ChatMessage[],
  providerId: string,
  apiKey: string,
  model?: string
): Promise<ChatMessage[]> {
  if (messages.length <= COMPRESS_THRESHOLD) return messages;

  const toCompress = messages.slice(0, messages.length - KEEP_RECENT);
  const recent = messages.slice(messages.length - KEEP_RECENT);

  const transcript = toCompress
    .map((m, i) => `[${m.role}]: ${m.content.slice(0, 500)}`)
    .join("\n\n");

  const summaryPrompt = `Aşağıdaki sohbet geçmişini özetle. Teknik kararlar, üretilen dosyalar, kullanıcı tercihleri ve önemli bağlam bilgisini koru. 2-3 paragraf yaz.\n\n${transcript}`;

  try {
    const summary = await callProvider(
      providerId,
      apiKey,
      [{ role: "user", content: summaryPrompt }],
      "Sen bir sohbet özetleyici asistanısın. Verilen geçmişi kısa ama bilgi açısından zengin bir özet haline getir. Dosya isimlerini ve teknik detayları koru.",
      model,
      []
    );

    return [
      {
        role: "user",
        content: `[Önceki sohbetin özeti]\n${summary}`
      },
      {
        role: "assistant",
        content: "Özeti aldım, sohbete devam ediyorum."
      },
      ...recent
    ];
  } catch {
    return messages.slice(-COMPRESS_THRESHOLD);
  }
}
