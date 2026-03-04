export type Severity = "Critical" | "High" | "Medium" | "Low";
export type RiskLevel = "Low" | "Medium" | "High";

export type Decision =
  | "pending"
  | "validate_test"
  | "mitigate_now"
  | "defer"
  | "accept_risk"
  | "rejected";

export type OwnerRole =
  | "Security"
  | "Platform"
  | "Compliance"
  | "Product"
  | "Data"
  | "Unknown";

export type ScenarioSortOption =
  | "severity_desc"
  | "risk_score_desc"
  | "confidence_desc"
  | "confidence_asc";

export interface DecisionEvent {
  from: Decision;
  to: Decision;
  reason?: string;
  at: string; // ISO
  byRole: OwnerRole;
}

// ─── Evidence Plan types ───────────────────────────────────────────────────────

export interface EvidenceCheck {
  id: string;
  title: string;
  sources: string[];
  queryHints: string[];
  passCriteria: string;
  failCriteria: string;
}

// ─── Core scenario ────────────────────────────────────────────────────────────

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
  decision: Decision;
  decisionReason?: string;
  decidedAt?: string;
  decisionHistory?: DecisionEvent[];
  // Governance metadata
  assumptions: string[];
  evidence: string[];
  confidence: number;
  controlGaps: string[];
  ownerRole: OwnerRole;
  likelihood?: RiskLevel;
  impact?: RiskLevel;
  riskScore?: number;
}

// Shape returned from the server (no decision or evidence plan fields yet)
export type ScenarioFromServer = Omit<
  AttackScenario,
  "decision" | "decisionReason" | "decidedAt" | "evidencePlan" | "evidenceFindings"
>;

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
  | { type: "complete"; scenarios: ScenarioFromServer[] }
  | { type: "error"; message: string };
