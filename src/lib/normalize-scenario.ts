import type {
  AttackScenario,
  Decision,
  OwnerRole,
  ScenarioFromServer,
} from "@/types";
import { normalizeScenarioRiskFields } from "@/utils/riskScore";

type ScenarioInput = Partial<ScenarioFromServer> &
  Partial<
    Pick<
      AttackScenario,
      "decision" | "decisionReason" | "decidedAt" | "decisionHistory"
    >
  >;

const OWNER_ROLE_SET = new Set<OwnerRole>([
  "Security",
  "Platform",
  "Compliance",
  "Product",
  "Data",
  "Unknown",
]);

function toOwnerRole(value: unknown): OwnerRole {
  if (typeof value === "string" && OWNER_ROLE_SET.has(value as OwnerRole)) {
    return value as OwnerRole;
  }

  return "Unknown";
}

export function normalizeScenario(
  scenario: ScenarioInput,
  defaultDecision: Decision = "pending"
): AttackScenario {
  const normalized: AttackScenario = {
    id: scenario.id ?? `scenario-${Math.random().toString(36).slice(2, 8)}`,
    title: scenario.title?.trim() || "Untitled Risk Scenario",
    attackVector: scenario.attackVector?.trim() || "-",
    severity: scenario.severity ?? "Medium",
    description: scenario.description?.trim() || "-",
    mitreTactic: scenario.mitreTactic?.trim() || "Unknown",
    mitreId: scenario.mitreId?.trim() || "-",
    estimatedImpact: scenario.estimatedImpact?.trim() || "-",
    attackChain: Array.isArray(scenario.attackChain) ? scenario.attackChain.filter(Boolean) : [],
    defensePlaybook: Array.isArray(scenario.defensePlaybook)
      ? scenario.defensePlaybook.filter(Boolean)
      : [],
    decision: scenario.decision ?? defaultDecision,
    decisionReason: scenario.decisionReason,
    decidedAt: scenario.decidedAt,
    decisionHistory: Array.isArray(scenario.decisionHistory) ? scenario.decisionHistory : [],
    assumptions: Array.isArray(scenario.assumptions) ? scenario.assumptions.filter(Boolean) : [],
    evidence: Array.isArray(scenario.evidence) ? scenario.evidence.filter(Boolean) : [],
    confidence:
      typeof scenario.confidence === "number" && Number.isFinite(scenario.confidence)
        ? scenario.confidence
        : 0.5,
    controlGaps: Array.isArray(scenario.controlGaps) ? scenario.controlGaps.filter(Boolean) : [],
    ownerRole: toOwnerRole(scenario.ownerRole),
    likelihood: scenario.likelihood,
    impact: scenario.impact,
    riskScore: scenario.riskScore,
  };

  return normalizeScenarioRiskFields(normalized);
}

export function normalizeScenarioList(
  scenarios: ScenarioInput[],
  defaultDecision: Decision = "pending"
): AttackScenario[] {
  return scenarios.map((scenario) => normalizeScenario(scenario, defaultDecision));
}
