"use client";

import type { AttackScenario } from "@/types";

type RiskRegisterRecord = {
  id: string;
  title: string;
  severity: AttackScenario["severity"];
  mitreId: string;
  mitreTactic: string;
  attackVector: string;
  description: string;
  attackChain: string[];
  defensePlaybook: string[];
  decision: AttackScenario["decision"];
  decisionReason: string | null;
  decidedAt: string | null;
  decisionHistory: Array<{
    from: AttackScenario["decision"];
    to: AttackScenario["decision"];
    reason: string | null;
    at: string;
    byRole: AttackScenario["ownerRole"];
  }>;
  assumptions: string[];
  evidence: string[];
  confidence: number | null;
  controlGaps: string[];
  ownerRole: AttackScenario["ownerRole"];
  likelihood: AttackScenario["likelihood"] | null;
  impact: AttackScenario["impact"] | null;
  riskScore: number | null;
};

function byExportOrder(a: AttackScenario, b: AttackScenario): number {
  if (a.severity !== b.severity) {
    const severityRank = { Critical: 0, High: 1, Medium: 2, Low: 3 };
    return severityRank[a.severity] - severityRank[b.severity];
  }

  const riskDelta = (b.riskScore ?? -1) - (a.riskScore ?? -1);
  if (riskDelta !== 0) {
    return riskDelta;
  }

  return a.id.localeCompare(b.id);
}

function toRecord(scenario: AttackScenario): RiskRegisterRecord {
  return {
    id: scenario.id,
    title: scenario.title,
    severity: scenario.severity,
    mitreId: scenario.mitreId,
    mitreTactic: scenario.mitreTactic,
    attackVector: scenario.attackVector,
    description: scenario.description,
    attackChain: scenario.attackChain ?? [],
    defensePlaybook: scenario.defensePlaybook ?? [],
    decision: scenario.decision,
    decisionReason: scenario.decisionReason ?? null,
    decidedAt: scenario.decidedAt ?? null,
    decisionHistory: (scenario.decisionHistory ?? []).map((event) => ({
      from: event.from,
      to: event.to,
      reason: event.reason ?? null,
      at: event.at,
      byRole: event.byRole,
    })),
    assumptions: scenario.assumptions ?? [],
    evidence: scenario.evidence ?? [],
    confidence:
      typeof scenario.confidence === "number" && Number.isFinite(scenario.confidence)
        ? scenario.confidence
        : null,
    controlGaps: scenario.controlGaps ?? [],
    ownerRole: scenario.ownerRole ?? "Unknown",
    likelihood: scenario.likelihood ?? null,
    impact: scenario.impact ?? null,
    riskScore:
      typeof scenario.riskScore === "number" && Number.isFinite(scenario.riskScore)
        ? scenario.riskScore
        : null,
  };
}

export function exportRiskRegisterJSON(scenarios: AttackScenario[]) {
  const payload = {
    exportedAt: new Date().toISOString(),
    scenarios: scenarios.slice().sort(byExportOrder).map(toRecord),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = `risk-register-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}
