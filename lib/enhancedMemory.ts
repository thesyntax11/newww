import { supabase, isSupabaseConfigured } from "./supabaseClient";

export interface EnhancedMemory {
  id: string;
  session_id: string;
  content: string;
  summary: string;
  category: string;
  tags: string[];
  project: string;
  language: string;
  importance: number;
  access_count: number;
  last_used_at: string;
  created_at: string;
}

const MAX_MEMORIES_PER_SESSION = 300;
const DECAY_HALF_LIFE_DAYS = 14;

async function embed(text: string, apiKey?: string): Promise<number[] | null> {
  if (!apiKey || !text.trim()) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "text-embedding-3-small", input: text.slice(0, 8000) }),
      signal: AbortSignal.timeout(15_000)
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data?.[0]?.embedding ?? null;
  } catch {
    return null;
  }
}

export async function addEnhancedMemory(
  sessionId: string,
  content: string,
  opts: {
    category?: string;
    importance?: number;
    tags?: string[];
    project?: string;
    language?: string;
    summary?: string;
  } = {},
  openaiApiKey?: string
): Promise<EnhancedMemory | null> {
  if (!isSupabaseConfigured || !content.trim()) return null;
  const embedding = await embed(content, openaiApiKey);
  const { data, error } = await supabase
    .from("agent_memory_v2")
    .insert({
      session_id: sessionId,
      content: content.trim().slice(0, 2000),
      summary: (opts.summary || "").slice(0, 300),
      category: opts.category || "general",
      tags: opts.tags || [],
      project: opts.project || "",
      language: opts.language || "",
      importance: opts.importance ?? 5,
      embedding
    })
    .select()
    .single();
  if (error) return null;
  return data as EnhancedMemory;
}

export async function getEnhancedMemories(
  sessionId: string,
  limit = 20
): Promise<EnhancedMemory[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from("agent_memory_v2")
    .select("*")
    .eq("session_id", sessionId)
    .order("importance", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data || []) as EnhancedMemory[];
}

export async function searchEnhancedMemories(
  sessionId: string,
  query: string,
  limit = 10,
  openaiApiKey?: string
): Promise<EnhancedMemory[]> {
  if (!isSupabaseConfigured || !query.trim()) return [];

  const embedding = await embed(query, openaiApiKey);
  if (embedding) {
    const { data, error } = await supabase.rpc("match_memories", {
      query_embedding: embedding,
      match_session: sessionId,
      match_count: limit
    });
    if (!error && data && data.length > 0) {
      const ids = data.map((m: any) => m.id);
      for (const id of ids) {
        await supabase.rpc("bump_memory_access", { memory_id: id });
      }
      return data.map((m: any) => ({
        id: m.id,
        session_id: m.session_id,
        content: m.content,
        summary: m.summary,
        category: m.category,
        tags: m.tags,
        project: m.project,
        language: m.language,
        importance: m.importance,
        access_count: m.access_count,
        last_used_at: m.last_used_at,
        created_at: m.created_at
      })) as EnhancedMemory[];
    }
  }

  const { data, error } = await supabase
    .from("agent_memory_v2")
    .select("*")
    .eq("session_id", sessionId)
    .ilike("content", `%${query.trim().slice(0, 100)}%`)
    .order("importance", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data || []) as EnhancedMemory[];
}

export async function deleteEnhancedMemory(id: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await supabase.from("agent_memory_v2").delete().eq("id", id);
  return !error;
}

export async function clearEnhancedSessionMemories(sessionId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await supabase.from("agent_memory_v2").delete().eq("session_id", sessionId);
  return !error;
}

function recencyScore(lastUsedAt: string): number {
  const daysSince = (Date.now() - new Date(lastUsedAt).getTime()) / (1000 * 60 * 60 * 24);
  return Math.pow(0.5, daysSince / DECAY_HALF_LIFE_DAYS);
}

function frequencyScore(accessCount: number): number {
  return 1 + Math.log10(accessCount + 1);
}

export function rankMemories(
  memories: EnhancedMemory[],
  semanticSimilarity?: number[]
): EnhancedMemory[] {
  const scored = memories.map((m, i) => {
    const importance = m.importance / 10;
    const recency = recencyScore(m.last_used_at || m.created_at);
    const frequency = frequencyScore(m.access_count);
    const semantic = semanticSimilarity?.[i] ?? 0.5;
    const score = importance * 0.35 + recency * 0.25 + frequency * 0.15 + semantic * 0.25;
    return { memory: m, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.memory);
}

export async function pruneEnhancedMemories(sessionId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { count } = await supabase
    .from("agent_memory_v2")
    .select("*", { count: "exact", head: true })
    .eq("session_id", sessionId);
  if ((count || 0) > MAX_MEMORIES_PER_SESSION) {
    const toRemove = (count || 0) - MAX_MEMORIES_PER_SESSION;
    const { data } = await supabase
      .from("agent_memory_v2")
      .select("id")
      .eq("session_id", sessionId)
      .order("importance", { ascending: true })
      .order("access_count", { ascending: true })
      .limit(toRemove);
    if (data && data.length > 0) {
      await supabase.from("agent_memory_v2").delete().in("id", data.map((r) => r.id));
    }
  }
}

export async function buildEnhancedMemoryContext(
  sessionId: string,
  query: string,
  openaiApiKey?: string
): Promise<string> {
  const [semantic, recent] = await Promise.all([
    searchEnhancedMemories(sessionId, query, 10, openaiApiKey),
    getEnhancedMemories(sessionId, 8)
  ]);

  const seen = new Set<string>();
  const combined: EnhancedMemory[] = [];
  for (const m of semantic) {
    if (!seen.has(m.id)) { seen.add(m.id); combined.push(m); }
  }
  for (const m of recent) {
    if (!seen.has(m.id)) { seen.add(m.id); combined.push(m); }
  }

  if (combined.length === 0) return "Bu oturum için kayıtlı uzun süreli hafıza yok.";

  const ranked = rankMemories(combined).slice(0, 15);
  const lines = ranked.map((m) => {
    const tagStr = m.tags.length > 0 ? ` [${m.tags.join(", ")}]` : "";
    const projStr = m.project ? ` (${m.project})` : "";
    return `- [${m.category}, öncelik ${m.importance}${tagStr}${projStr}] ${m.content}`;
  });
  return `Uzun süreli hafıza (bu oturum için daha önce kaydedilen notlar, önem × yakınlık × sıklık × anlamsal benzerlik ile sıralanmış):\n${lines.join("\n")}`;
}
