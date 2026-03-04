import type { AttackScenario, RiskLevel, Severity } from "@/types";

export function levelToNum(level?: RiskLevel): 1 | 2 | 3 {
  if (level === "Low") return 1;
  if (level === "High") return 3;
  return 2;
}

export function computeRiskScore(likelihood?: RiskLevel, impact?: RiskLevel): number {
  const rawScore = levelToNum(likelihood) * levelToNum(impact) * 1.1;
  return Math.round(rawScore * 10) / 10;
}

export function formatRiskScore(score?: number): string {
  if (typeof score !== "number" || !Number.isFinite(score)) {
    return "Risk -";
  }

  const hasDecimal = Math.round(score) !== score;
  return `Risk ${hasDecimal ? score.toFixed(1) : score.toFixed(0)}`;
}

function inferRiskLevelFromSeverity(severity: Severity): RiskLevel {
  if (severity === "Critical" || severity === "High") return "High";
  if (severity === "Low") return "Low";
  return "Medium";
}

export function normalizeScenarioRiskFields(s: AttackScenario): AttackScenario {
  const likelihood = s.likelihood ?? inferRiskLevelFromSeverity(s.severity);
  const impact = s.impact ?? inferRiskLevelFromSeverity(s.severity);
  const computedScore = computeRiskScore(likelihood, impact);
  const riskScore =
    typeof s.riskScore === "number" && Number.isFinite(s.riskScore) && s.riskScore >= 1 && s.riskScore <= 9
      ? s.riskScore
      : computedScore;

  return {
    ...s,
    likelihood,
    impact,
    riskScore,
  };
}
