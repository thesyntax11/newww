import { ChatMessage } from "../types";

export type AgentRole = "planner" | "executor" | "reviewer" | "orchestrator";

export type TaskStatus = "pending" | "in_progress" | "completed" | "failed" | "skipped";

export interface AgentTask {
  id: string;
  index: number;
  title: string;
  description: string;
  status: TaskStatus;
  resultSummary: string;
  confidence: number;
  filesProduced: string[];
  error: string;
}

export interface PlanResult {
  tasks: AgentTask[];
  reasoning: string;
  requestId: string;
}

export interface TaskResult {
  task: AgentTask;
  reply: string;
  writtenFiles: { path: string; size: number; updatedAt: string }[];
  thinking: string[];
  success: boolean;
  retryCount: number;
}

export interface ReviewResult {
  approved: boolean;
  confidence: number;
  critique: string;
  issues: ReviewIssue[];
  suggestedFixes: string;
  missingRequirements: string[];
  needsWebSearch: boolean;
}

export interface ReviewIssue {
  severity: "low" | "medium" | "high" | "critical";
  category: "bug" | "security" | "performance" | "accessibility" | "consistency" | "missing";
  description: string;
  file?: string;
}

export interface WorkflowResult {
  reply: string;
  thinking: string[];
  writtenFiles: { path: string; size: number; updatedAt: string }[];
  tasks: AgentTask[];
  review: ReviewResult | null;
  imagesSeen: string[];
  stages: WorkflowStage[];
}

export interface WorkflowStage {
  role: AgentRole;
  label: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  detail: string;
  durationMs: number;
}

export interface WorkflowContext {
  sessionId: string;
  providerId: string;
  apiKey: string;
  model?: string;
  messages: ChatMessage[];
  openaiApiKey?: string;
}
