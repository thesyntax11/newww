import { supabase, isSupabaseConfigured } from "./supabaseClient";

export interface DocChunk {
  id: string;
  session_id: string;
  file_path: string;
  chunk_index: number;
  content: string;
  created_at: string;
}

const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 120;
const MAX_CHUNKS_PER_FILE = 60;

export function chunkText(text: string): string[] {
  const clean = text.replace(/\r\n/g, "\n").trim();
  if (clean.length <= CHUNK_SIZE) return clean ? [clean] : [];
  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length && chunks.length < MAX_CHUNKS_PER_FILE) {
    let end = start + CHUNK_SIZE;
    if (end < clean.length) {
      const lastSpace = clean.lastIndexOf("\n", end);
      if (lastSpace > start + 100) end = lastSpace;
    }
    chunks.push(clean.slice(start, end).trim());
    start = end - CHUNK_OVERLAP;
    if (start < 0) start = 0;
  }
  return chunks;
}

async function embed(text: string, apiKey?: string): Promise<number[] | null> {
  if (!apiKey) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "text-embedding-3-small", input: text.slice(0, 8000) })
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data?.[0]?.embedding ?? null;
  } catch {
    return null;
  }
}

export async function indexDocument(
  sessionId: string,
  filePath: string,
  text: string,
  openaiApiKey?: string
): Promise<number> {
  if (!isSupabaseConfigured || !text.trim()) return 0;
  await supabase.from("document_embeddings").delete().eq("session_id", sessionId).eq("file_path", filePath);
  const chunks = chunkText(text);
  if (chunks.length === 0) return 0;
  let indexed = 0;
  for (let i = 0; i < chunks.length; i++) {
    const embedding = await embed(chunks[i], openaiApiKey);
    const { error } = await supabase.from("document_embeddings").insert({
      session_id: sessionId,
      file_path: filePath,
      chunk_index: i,
      content: chunks[i],
      embedding
    });
    if (!error) indexed++;
  }
  return indexed;
}

export async function retrieveRelevantChunks(
  sessionId: string,
  query: string,
  limit = 5,
  openaiApiKey?: string
): Promise<DocChunk[]> {
  if (!isSupabaseConfigured || !query.trim()) return [];
  const embedding = await embed(query, openaiApiKey);
  if (embedding) {
    const { data, error } = await supabase.rpc("match_documents", {
      query_embedding: embedding,
      match_session: sessionId,
      match_count: limit
    });
    if (!error && data && data.length > 0) return data as DocChunk[];
  }
  const { data, error } = await supabase
    .from("document_embeddings")
    .select("*")
    .eq("session_id", sessionId)
    .ilike("content", `%${query.trim().slice(0, 100)}%`)
    .limit(limit);
  if (error) return [];
  return (data || []) as DocChunk[];
}

export async function buildRagContext(
  sessionId: string,
  query: string,
  openaiApiKey?: string
): Promise<string> {
  const chunks = await retrieveRelevantChunks(sessionId, query, 5, openaiApiKey);
  if (chunks.length === 0) return "";
  const blocks = chunks.map(
    (c) => `<retrieved file="${c.file_path}" chunk="${c.chunk_index}">\n${c.content}\n</retrieved>`
  );
  return `Yüklenen dokümanlardan bu istekle ilgili bulunan pasajlar (RAG):\n${blocks.join("\n\n")}`;
}
