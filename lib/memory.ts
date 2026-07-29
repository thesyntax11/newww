import { supabase, isSupabaseConfigured } from "./supabaseClient";

export interface MemoryEntry {
  id: string;
  session_id: string;
  category: string;
  content: string;
  importance: number;
  created_at: string;
}

const MAX_MEMORIES_PER_SESSION = 200;

export async function addMemory(
  sessionId: string,
  content: string,
  category = "general",
  importance = 5
): Promise<MemoryEntry | null> {
  if (!isSupabaseConfigured || !content.trim()) return null;
  const { data, error } = await supabase
    .from("agent_memory")
    .insert({ session_id: sessionId, content: content.trim(), category, importance })
    .select()
    .single();
  if (error) return null;
  return data as MemoryEntry;
}

export async function getMemories(sessionId: string, limit = 20): Promise<MemoryEntry[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from("agent_memory")
    .select("*")
    .eq("session_id", sessionId)
    .order("importance", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data || []) as MemoryEntry[];
}

export async function searchMemories(sessionId: string, query: string, limit = 8): Promise<MemoryEntry[]> {
  if (!isSupabaseConfigured || !query.trim()) return [];
  const { data, error } = await supabase
    .from("agent_memory")
    .select("*")
    .eq("session_id", sessionId)
    .ilike("content", `%${query.trim()}%`)
    .order("importance", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data || []) as MemoryEntry[];
}

export async function deleteMemory(id: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await supabase.from("agent_memory").delete().eq("id", id);
  return !error;
}

export async function clearSessionMemories(sessionId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await supabase.from("agent_memory").delete().eq("session_id", sessionId);
  return !error;
}

export async function pruneMemories(sessionId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { count } = await supabase
    .from("agent_memory")
    .select("*", { count: "exact", head: true })
    .eq("session_id", sessionId);
  if ((count || 0) > MAX_MEMORIES_PER_SESSION) {
    const toRemove = (count || 0) - MAX_MEMORIES_PER_SESSION;
    const { data } = await supabase
      .from("agent_memory")
      .select("id")
      .eq("session_id", sessionId)
      .order("importance", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(toRemove);
    if (data && data.length > 0) {
      await supabase.from("agent_memory").delete().in("id", data.map((r) => r.id));
    }
  }
}

export async function buildMemoryContext(sessionId: string): Promise<string> {
  const memories = await getMemories(sessionId, 15);
  if (memories.length === 0) return "Bu oturum için kayıtlı uzun süreli hafıza yok.";
  const lines = memories.map((m) => `- [${m.category}, öncelik ${m.importance}] ${m.content}`);
  return `Uzun süreli hafıza (bu oturum için daha önce kaydedilen notlar):\n${lines.join("\n")}`;
}
