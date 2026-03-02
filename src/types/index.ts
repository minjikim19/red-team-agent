export type Severity = "Critical" | "High" | "Medium" | "Low";

export type ScenarioStatus = "pending" | "approved" | "dismissed";

export interface AttackScenario {
  id: string;
  title: string;
  attackVector: string;
  severity: Severity;
  description: string;
  mitreTactic: string;
  mitreId: string;
  estimatedImpact: string;
  attackChain: string[];
  defensePlaybook: string[];
  status: ScenarioStatus;
}

// Agent log entry — one per tool call/result pair shown in the UI
export interface AgentLogEntry {
  id: string;
  callId: string;
  tool: string;
  label: string;
  summary: string;
  status: "running" | "done";
}

// Chat messages for the deep-dive analysis panel
export interface ChatMessage {
  id: string;
  role: "user" | "model";
  content: string;
}

// SSE events streamed from the API route
export type AgentSSEEvent =
  | { type: "agent_start" }
  | { type: "tool_call"; tool: string; callId: string; label: string; summary: string }
  | { type: "tool_result"; callId: string; summary: string }
  | { type: "complete"; scenarios: Omit<AttackScenario, "status">[] }
  | { type: "error"; message: string };
