import { ProviderConfig, ChatMessage, ImageAttachment } from "./types";

/** Son kullanıcı mesajının indeksini bulur; görselleri buraya iliştiririz. */
function lastUserIndex(messages: ChatMessage[]): number {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") return i;
  }
  return messages.length - 1;
}

/**
 * Tek bir ortak arayüz üzerinden çoklu LLM sağlayıcı desteği.
 * Yeni bir sağlayıcı eklemek için bu diziye tek bir kayıt eklemek yeterlidir.
 */
export const PROVIDERS: ProviderConfig[] = [
  {
    id: "openai",
    label: "OpenAI",
    model: "gpt-4.1",
    color: "#74C0FC",
    endpoint: "https://api.openai.com/v1/chat/completions",
    supportsVision: true,
    buildHeaders: (key) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`
    }),
    buildBody: (messages, system, model, images) => {
      const targetIdx = lastUserIndex(messages);
      const apiMessages = messages.map((m, i) => {
        if (i === targetIdx && images.length > 0) {
          return {
            role: m.role,
            content: [
              { type: "text", text: m.content },
              ...images.map((img) => ({
                type: "image_url",
                image_url: { url: `data:${img.mime};base64,${img.base64}` }
              }))
            ]
          };
        }
        return { role: m.role, content: m.content };
      });
      return {
        model,
        messages: [{ role: "system", content: system }, ...apiMessages],
        temperature: 0.6
      };
    },
    extractText: (json) => json?.choices?.[0]?.message?.content ?? ""
  },
  {
    id: "anthropic",
    label: "Anthropic",
    model: "claude-sonnet-4-6",
    color: "#D9A06B",
    endpoint: "https://api.anthropic.com/v1/messages",
    supportsVision: true,
    buildHeaders: (key) => ({
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01"
    }),
    buildBody: (messages, system, model, images) => {
      const targetIdx = lastUserIndex(messages);
      const apiMessages = messages.map((m, i) => {
        if (i === targetIdx && images.length > 0) {
          return {
            role: m.role,
            content: [
              { type: "text", text: m.content },
              ...images.map((img) => ({
                type: "image",
                source: { type: "base64", media_type: img.mime, data: img.base64 }
              }))
            ]
          };
        }
        return { role: m.role, content: m.content };
      });
      return { model, max_tokens: 8192, system, messages: apiMessages };
    },
    extractText: (json) =>
      (json?.content ?? []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n")
  },
  {
    id: "google",
    label: "Google Gemini",
    model: "gemini-2.0-flash",
    color: "#8AB4F8",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}",
    supportsVision: true,
    buildHeaders: () => ({ "Content-Type": "application/json" }),
    buildBody: (messages, system, _model, images) => {
      const targetIdx = lastUserIndex(messages);
      const contents = messages.map((m, i) => {
        const parts: any[] = [{ text: m.content }];
        if (i === targetIdx) {
          images.forEach((img) => parts.push({ inlineData: { mimeType: img.mime, data: img.base64 } }));
        }
        return { role: m.role === "assistant" ? "model" : "user", parts };
      });
      return { systemInstruction: { role: "system", parts: [{ text: system }] }, contents };
    },
    extractText: (json) => json?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("\n") ?? ""
  },
  {
    id: "groq",
    label: "Groq",
    model: "llama-3.3-70b-versatile",
    color: "#F7A560",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    supportsVision: false,
    buildHeaders: (key) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`
    }),
    buildBody: (messages, system, model) => ({
      model,
      messages: [{ role: "system", content: system }, ...messages],
      temperature: 0.6
    }),
    extractText: (json) => json?.choices?.[0]?.message?.content ?? ""
  },
  {
    id: "mistral",
    label: "Mistral",
    model: "mistral-large-latest",
    color: "#FF8C42",
    endpoint: "https://api.mistral.ai/v1/chat/completions",
    supportsVision: false,
    buildHeaders: (key) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`
    }),
    buildBody: (messages, system, model) => ({
      model,
      messages: [{ role: "system", content: system }, ...messages]
    }),
    extractText: (json) => json?.choices?.[0]?.message?.content ?? ""
  },
  {
    id: "xai",
    label: "xAI Grok",
    model: "grok-4",
    color: "#E6E6E6",
    endpoint: "https://api.x.ai/v1/chat/completions",
    supportsVision: true,
    buildHeaders: (key) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`
    }),
    buildBody: (messages, system, model, images) => {
      const targetIdx = lastUserIndex(messages);
      const apiMessages = messages.map((m, i) => {
        if (i === targetIdx && images.length > 0) {
          return {
            role: m.role,
            content: [
              { type: "text", text: m.content },
              ...images.map((img) => ({
                type: "image_url",
                image_url: { url: `data:${img.mime};base64,${img.base64}` }
              }))
            ]
          };
        }
        return { role: m.role, content: m.content };
      });
      return {
        model,
        messages: [{ role: "system", content: system }, ...apiMessages],
        temperature: 0.6
      };
    },
    extractText: (json) => json?.choices?.[0]?.message?.content ?? ""
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    model: "deepseek-chat",
    color: "#7C8AFF",
    endpoint: "https://api.deepseek.com/v1/chat/completions",
    supportsVision: false,
    buildHeaders: (key) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`
    }),
    buildBody: (messages, system, model) => ({
      model,
      messages: [{ role: "system", content: system }, ...messages],
      temperature: 0.6
    }),
    extractText: (json) => json?.choices?.[0]?.message?.content ?? ""
  },
  {
    id: "cohere",
    label: "Cohere",
    model: "command-r-plus",
    color: "#39594D",
    endpoint: "https://api.cohere.com/v1/chat",
    supportsVision: false,
    buildHeaders: (key) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`
    }),
    buildBody: (messages, system, model) => ({
      model,
      preamble: system,
      message: messages[messages.length - 1]?.content || "",
      chat_history: messages.slice(0, -1).map((m) => ({
        role: m.role === "user" ? "USER" : "CHATBOT",
        message: m.content
      }))
    }),
    extractText: (json) => json?.text ?? ""
  },
  {
    id: "together",
    label: "Together",
    model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    color: "#0F6FFF",
    endpoint: "https://api.together.xyz/v1/chat/completions",
    supportsVision: false,
    buildHeaders: (key) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`
    }),
    buildBody: (messages, system, model) => ({
      model,
      messages: [{ role: "system", content: system }, ...messages],
      temperature: 0.6
    }),
    extractText: (json) => json?.choices?.[0]?.message?.content ?? ""
  },
  {
    id: "fireworks",
    label: "Fireworks",
    model: "accounts/fireworks/models/llama-v3p1-70b-instruct",
    color: "#FF4D2E",
    endpoint: "https://api.fireworks.ai/inference/v1/chat/completions",
    supportsVision: false,
    buildHeaders: (key) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`
    }),
    buildBody: (messages, system, model) => ({
      model,
      messages: [{ role: "system", content: system }, ...messages],
      temperature: 0.6
    }),
    extractText: (json) => json?.choices?.[0]?.message?.content ?? ""
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    model: "anthropic/claude-3.5-sonnet",
    color: "#9B8BFF",
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    supportsVision: true,
    buildHeaders: (key) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "HTTP-Referer": "https://aether-agent.app",
      "X-Title": "Aether Agent"
    }),
    buildBody: (messages, system, model, images) => {
      const targetIdx = lastUserIndex(messages);
      const apiMessages = messages.map((m, i) => {
        if (i === targetIdx && images.length > 0) {
          return {
            role: m.role,
            content: [
              { type: "text", text: m.content },
              ...images.map((img) => ({
                type: "image_url",
                image_url: { url: `data:${img.mime};base64,${img.base64}` }
              }))
            ]
          };
        }
        return { role: m.role, content: m.content };
      });
      return {
        model,
        messages: [{ role: "system", content: system }, ...apiMessages],
        temperature: 0.6
      };
    },
    extractText: (json) => json?.choices?.[0]?.message?.content ?? ""
  },
  {
    id: "perplexity",
    label: "Perplexity",
    model: "sonar-pro",
    color: "#20B8CD",
    endpoint: "https://api.perplexity.ai/chat/completions",
    supportsVision: false,
    buildHeaders: (key) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`
    }),
    buildBody: (messages, system, model) => ({
      model,
      messages: [{ role: "system", content: system }, ...messages],
      temperature: 0.6
    }),
    extractText: (json) => json?.choices?.[0]?.message?.content ?? ""
  }
];

export function getProvider(id: string): ProviderConfig {
  const provider = PROVIDERS.find((p) => p.id === id);
  if (!provider) throw new Error(`Bilinmeyen sağlayıcı: ${id}`);
  return provider;
}

export async function callProvider(
  providerId: string,
  apiKey: string,
  messages: ChatMessage[],
  system: string,
  modelOverride?: string,
  images: ImageAttachment[] = []
): Promise<string> {
  const provider = getProvider(providerId);
  const model = modelOverride || provider.model;
  const effectiveImages = provider.supportsVision ? images : [];

  let url = provider.endpoint;
  if (provider.id === "google") {
    url = url.replace("{model}", model).replace("{key}", encodeURIComponent(apiKey));
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: provider.buildHeaders(apiKey),
      body: JSON.stringify(provider.buildBody(messages, system, model, effectiveImages)),
      signal: controller.signal
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`${provider.label} isteği başarısız (${res.status}): ${errText.slice(0, 300)}`);
    }

    const json = await res.json();
    return provider.extractText(json);
  } finally {
    clearTimeout(timeout);
  }
}
