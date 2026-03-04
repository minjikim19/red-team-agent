import type { AttackScenario, Decision } from "@/types";

export function appendDecisionEvent(
  scenario: AttackScenario,
  nextDecision: Decision,
  reason: string | undefined,
  atISO: string,
  byRole: AttackScenario["ownerRole"]
): AttackScenario {
  const nextHistory = [
    ...(scenario.decisionHistory ?? []),
    {
      from: scenario.decision,
      to: nextDecision,
      reason,
      at: atISO,
      byRole,
    },
  ].slice(-8);

  return {
    ...scenario,
    decision: nextDecision,
    decisionReason: reason,
    decidedAt: atISO,
    decisionHistory: nextHistory,
  };
}
