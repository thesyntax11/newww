import { NextRequest, NextResponse } from "next/server";
import { getProvider } from "@/lib/providers";
import { buildImageAttachments } from "@/lib/context";
import { runWorkflow } from "@/lib/workflow";
import { shouldCompress, compressContext } from "@/lib/contextCompression";
import { ChatMessage } from "@/lib/types";

export const runtime = "nodejs";

interface ChatRequestBody {
  sessionId: string;
  providerId: string;
  apiKey: string;
  model?: string;
  messages: ChatMessage[];
}

export async function POST(req: NextRequest) {
  let body: ChatRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const { sessionId, providerId, apiKey, model, messages } = body;

  if (!sessionId || !providerId || !apiKey || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: "sessionId, providerId, apiKey ve messages alanları zorunludur." },
      { status: 400 }
    );
  }

  const openaiKey = providerId === "openai" ? apiKey : undefined;

  let workingMessages = messages;
  if (shouldCompress(messages)) {
    workingMessages = await compressContext(messages, providerId, apiKey, model);
  }

  try {
    const provider = getProvider(providerId);
    const result = await runWorkflow({
      sessionId,
      providerId,
      apiKey,
      model,
      messages: workingMessages,
      openaiApiKey: openaiKey
    });

    return NextResponse.json({
      reply: result.reply,
      thinking: result.thinking,
      writtenFiles: result.writtenFiles,
      tasks: result.tasks,
      review: result.review,
      stages: result.stages,
      imagesSeen: provider.supportsVision ? buildImageAttachments(sessionId).map((i) => i.path) : []
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Sağlayıcı isteği sırasında bilinmeyen bir hata oluştu." },
      { status: 502 }
    );
  }
}
