import { NextRequest, NextResponse } from "next/server";
import { getMultiModelAssignments } from "@/lib/intelligence";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { providers: string[]; apiKeys: Record<string, string> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const { providers, apiKeys } = body;
  if (!providers || !apiKeys) {
    return NextResponse.json({ error: "providers ve apiKeys zorunludur." }, { status: 400 });
  }

  const assignments = getMultiModelAssignments(providers, apiKeys);
  return NextResponse.json({ assignments });
}
