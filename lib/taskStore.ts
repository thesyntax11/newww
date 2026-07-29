import { supabase, isSupabaseConfigured } from "./supabaseClient";
import { AgentTask, TaskStatus } from "./agents/types";

export interface TaskRecord {
  id: string;
  session_id: string;
  request_id: string;
  index: number;
  title: string;
  description: string;
  status: TaskStatus;
  agent_role: string;
  result_summary: string;
  confidence: number;
  files_produced: string[];
  error: string;
  created_at: string;
  updated_at: string;
}

export async function saveTasks(
  sessionId: string,
  requestId: string,
  tasks: AgentTask[]
): Promise<void> {
  if (!isSupabaseConfigured) return;
  await supabase.from("agent_tasks").delete().eq("session_id", sessionId).eq("request_id", requestId);
  if (tasks.length === 0) return;
  const rows = tasks.map((t) => ({
    session_id: sessionId,
    request_id: requestId,
    index: t.index,
    title: t.title,
    description: t.description,
    status: t.status,
    agent_role: "coder",
    result_summary: t.resultSummary,
    confidence: t.confidence,
    files_produced: t.filesProduced,
    error: t.error
  }));
  await supabase.from("agent_tasks").insert(rows);
}

export async function updateTask(
  sessionId: string,
  requestId: string,
  index: number,
  updates: Partial<AgentTask>
): Promise<void> {
  if (!isSupabaseConfigured) return;
  const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.status) dbUpdates.status = updates.status;
  if (updates.resultSummary !== undefined) dbUpdates.result_summary = updates.resultSummary;
  if (updates.confidence !== undefined) dbUpdates.confidence = updates.confidence;
  if (updates.filesProduced) dbUpdates.files_produced = updates.filesProduced;
  if (updates.error !== undefined) dbUpdates.error = updates.error;
  await supabase
    .from("agent_tasks")
    .update(dbUpdates)
    .eq("session_id", sessionId)
    .eq("request_id", requestId)
    .eq("index", index);
}

export async function getTasks(sessionId: string, requestId?: string): Promise<TaskRecord[]> {
  if (!isSupabaseConfigured) return [];
  let query = supabase.from("agent_tasks").select("*").eq("session_id", sessionId);
  if (requestId) query = query.eq("request_id", requestId);
  const { data, error } = await query.order("index", { ascending: true });
  if (error) return [];
  return (data || []) as TaskRecord[];
}
