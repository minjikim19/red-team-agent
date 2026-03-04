"use client";

import { useCallback, useMemo, useState } from "react";
import Header from "@/components/Header";
import ArchitectureInput from "@/components/ArchitectureInput";
import ScenarioCard from "@/components/ScenarioCard";
import ScenarioQueue from "@/components/ScenarioQueue";
import ScenarioFilters from "@/components/ScenarioFilters";
import LoadingScenarios from "@/components/LoadingScenarios";
import AnalysisPanel from "@/components/AnalysisPanel";
import { AlertCircle, Cpu, ScanLine, FileDown, FileJson2 } from "lucide-react";
import type {
  AgentLogEntry,
  AgentSSEEvent,
  AttackScenario,
  Decision,
  OwnerRole,
  ScenarioSortOption,
  Severity,
} from "@/types";
import { appendDecisionEvent } from "@/utils/decisionHistory";
import { exportPDF } from "@/lib/export-pdf";
import { exportRiskRegisterJSON } from "@/lib/export-json";
import { normalizeScenario, normalizeScenarioList } from "@/lib/normalize-scenario";

const SEVERITY_PRIORITY: Record<Severity, number> = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

const DECISION_PRIORITY: Record<Decision, number> = {
  validate_test: 0,
  mitigate_now: 1,
  pending: 2,
  defer: 3,
  accept_risk: 4,
  rejected: 5,
};

function compareScenarios(
  left: AttackScenario,
  right: AttackScenario,
  sortBy: ScenarioSortOption
): number {
  if (sortBy === "risk_score_desc") {
    const riskDelta = (right.riskScore ?? -1) - (left.riskScore ?? -1);
    if (riskDelta !== 0) {
      return riskDelta;
    }
  }

  if (sortBy === "confidence_desc") {
    const confidenceDelta = (right.confidence ?? -1) - (left.confidence ?? -1);
    if (confidenceDelta !== 0) {
      return confidenceDelta;
    }
  }

  if (sortBy === "confidence_asc") {
    const confidenceDelta = (left.confidence ?? Number.POSITIVE_INFINITY) - (right.confidence ?? Number.POSITIVE_INFINITY);
    if (confidenceDelta !== 0) {
      return confidenceDelta;
    }
  }

  if (sortBy === "severity_desc") {
    const severityDelta = SEVERITY_PRIORITY[right.severity] - SEVERITY_PRIORITY[left.severity];
    if (severityDelta !== 0) {
      return severityDelta;
    }
  }

  const decisionDelta = DECISION_PRIORITY[left.decision] - DECISION_PRIORITY[right.decision];
  if (decisionDelta !== 0) {
    return decisionDelta;
  }

  const severityDelta = SEVERITY_PRIORITY[right.severity] - SEVERITY_PRIORITY[left.severity];
  if (severityDelta !== 0) {
    return severityDelta;
  }

  const riskDelta = (right.riskScore ?? -1) - (left.riskScore ?? -1);
  if (riskDelta !== 0) {
    return riskDelta;
  }

  return left.id.localeCompare(right.id);
}

export default function HomePage() {
  const [architecture, setArchitecture] = useState("");
  const [scenarios, setScenarios] = useState<AttackScenario[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [agentLog, setAgentLog] = useState<AgentLogEntry[]>([]);
  const [analysisScenarioId, setAnalysisScenarioId] = useState<string | null>(null);
  const [severityFilters, setSeverityFilters] = useState<Severity[]>([]);
  const [ownerRoleFilter, setOwnerRoleFilter] = useState<OwnerRole | "all">("all");
  const [decisionFilter, setDecisionFilter] = useState<Decision | "all">("all");
  const [tacticFilter, setTacticFilter] = useState("all");
  const [sortBy, setSortBy] = useState<ScenarioSortOption>("severity_desc");

  const analysisScenario = analysisScenarioId
    ? scenarios.find((scenario) => scenario.id === analysisScenarioId) ?? null
    : null;

  const tacticOptions = useMemo(
    () =>
      Array.from(
        new Set(
          scenarios
            .map((scenario) => scenario.mitreTactic)
            .filter((value): value is string => Boolean(value))
        )
      ).sort((left, right) => left.localeCompare(right)),
    [scenarios]
  );

  const filteredScenarios = useMemo(() => {
    return scenarios
      .filter((scenario) => {
        if (severityFilters.length > 0 && !severityFilters.includes(scenario.severity)) {
          return false;
        }

        if (ownerRoleFilter !== "all" && scenario.ownerRole !== ownerRoleFilter) {
          return false;
        }

        if (decisionFilter !== "all" && scenario.decision !== decisionFilter) {
          return false;
        }

        if (tacticFilter !== "all" && scenario.mitreTactic !== tacticFilter) {
          return false;
        }

        return true;
      })
      .slice()
      .sort((left, right) => compareScenarios(left, right, sortBy));
  }, [decisionFilter, ownerRoleFilter, scenarios, severityFilters, sortBy, tacticFilter]);

  const queuedScenarios = useMemo(
    () =>
      scenarios
        .filter((scenario) => scenario.decision === "validate_test")
        .slice()
        .sort((left, right) => compareScenarios(left, right, "risk_score_desc")),
    [scenarios]
  );

  const rejectedCount = scenarios.filter((scenario) => scenario.decision === "rejected").length;
  const pendingScenarios = scenarios.filter((scenario) => scenario.decision === "pending");
  const criticalCount = scenarios.filter((scenario) => scenario.severity === "Critical").length;
  const highCount = scenarios.filter((scenario) => scenario.severity === "High").length;

  const resetFilters = useCallback(() => {
    setSeverityFilters([]);
    setOwnerRoleFilter("all");
    setDecisionFilter("all");
    setTacticFilter("all");
    setSortBy("severity_desc");
  }, []);

  const handleGenerate = useCallback(async (architectureText: string) => {
    setIsLoading(true);
    setError(null);
    setScenarios([]);
    setAgentLog([]);
    setAnalysisScenarioId(null);

    try {
      const response = await fetch("/api/generate-scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ architecture: architectureText }),
      });

      if (!response.ok) {
        const responseBody = await response.json();
        throw new Error(responseBody.error ?? `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const dataLine = part.split("\n").find((line) => line.startsWith("data: "));
          if (!dataLine) {
            continue;
          }

          let event: AgentSSEEvent;
          try {
            event = JSON.parse(dataLine.slice(6)) as AgentSSEEvent;
          } catch {
            continue;
          }

          switch (event.type) {
            case "agent_start":
              break;
            case "tool_call":
              setAgentLog((previous) => [
                ...previous,
                {
                  id: event.callId,
                  callId: event.callId,
                  tool: event.tool,
                  label: event.label,
                  summary: event.summary,
                  status: "running",
                },
              ]);
              break;
            case "tool_result":
              setAgentLog((previous) =>
                previous.map((entry) =>
                  entry.callId === event.callId
                    ? { ...entry, summary: event.summary, status: "done" }
                    : entry
                )
              );
              break;
            case "complete":
            setScenarios(normalizeScenarioList(event.scenarios, "pending"));
            setHasGenerated(true);
            resetFilters();
            break;
            case "error":
              throw new Error(event.message);
          }
        }
      }

      setIsLoading(false);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unknown error";
      setError(message);
      setIsLoading(false);
    }
  }, [resetFilters]);

  const handleReset = useCallback(() => {
    if (
      scenarios.length > 0 &&
      !window.confirm(
        "This will remove all generated risk scenarios and clear the current demo or architecture input. Continue?"
      )
    ) {
      return;
    }

    setArchitecture("");
    setScenarios([]);
    setIsLoading(false);
    setError(null);
    setHasGenerated(false);
    setAgentLog([]);
    setAnalysisScenarioId(null);
    resetFilters();
  }, [resetFilters, scenarios.length]);

  const handleSetDecision = useCallback((id: string, decision: Decision, reason?: string) => {
    setScenarios((previous) =>
      previous.map((scenario) => {
        if (scenario.id !== id) {
          return scenario;
        }

        if (decision === "pending") {
          return normalizeScenario(
            {
              ...scenario,
              decision: "pending",
              decisionReason: undefined,
              decidedAt: undefined,
            },
            "pending"
          );
        }

        return normalizeScenario(
          appendDecisionEvent(
            scenario,
            decision,
            reason,
            new Date().toISOString(),
            scenario.ownerRole
          ),
          scenario.decision
        );
      })
    );
  }, []);

  const handleAnalyze = useCallback((id: string) => {
    setAnalysisScenarioId(id);
  }, []);

  const handlePatchScenario = useCallback((id: string, patch: Partial<AttackScenario>) => {
    setScenarios((previous) =>
      previous.map((scenario) =>
        scenario.id === id ? normalizeScenario({ ...scenario, ...patch }, scenario.decision) : scenario
      )
    );
  }, []);

  const handleToggleSeverity = useCallback((severity: Severity) => {
    setSeverityFilters((previous) =>
      previous.includes(severity)
        ? previous.filter((value) => value !== severity)
        : [...previous, severity]
    );
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <Header queuedCount={queuedScenarios.length} totalGenerated={scenarios.length} />

      <main className="mx-auto flex-1 w-full max-w-screen-2xl px-6 py-8">
        <div className="grid grid-cols-1 items-start gap-8 xl:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <ScanLine className="h-4 w-4 text-cyan-400" />
                <h1 className="text-base font-semibold text-white">Risk Governance Engine</h1>
              </div>
              <p className="text-sm text-slate-500">
                Generate risk scenarios from your architecture, then review and decide how to handle them.
              </p>
            </div>

            <ArchitectureInput
              value={architecture}
              onChange={setArchitecture}
              onGenerate={handleGenerate}
              onReset={handleReset}
              isLoading={isLoading}
            />

            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-500/5 px-4 py-3.5 text-red-400 animate-fade-in">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Generation failed</p>
                  <p className="mt-0.5 font-mono text-xs text-red-400/70">{error}</p>
                </div>
              </div>
            )}

            {isLoading && <LoadingScenarios agentLog={agentLog} />}

            {!isLoading && scenarios.length > 0 && (
              <>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <Cpu className="h-4 w-4 text-slate-500" />
                    <span className="text-sm font-medium text-slate-300">
                      {filteredScenarios.length === scenarios.length
                        ? `${scenarios.length} risk scenarios`
                        : `${filteredScenarios.length} of ${scenarios.length} risk scenarios`}
                    </span>
                    {rejectedCount > 0 && (
                      <span className="text-xs text-slate-600">{rejectedCount} rejected</span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => exportRiskRegisterJSON(scenarios)}
                      className="flex items-center gap-1.5 rounded-md border border-surface-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:border-cyan-500/40 hover:bg-cyan-500/5 hover:text-cyan-300"
                    >
                      <FileJson2 className="h-3.5 w-3.5" />
                      Export JSON
                    </button>
                    <button
                      type="button"
                      onClick={() => exportPDF(scenarios)}
                      className="flex items-center gap-1.5 rounded-md bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-sm shadow-cyan-500/20 transition-all duration-150 hover:bg-cyan-400"
                    >
                      <FileDown className="h-3.5 w-3.5" />
                      Export Governance Report
                    </button>
                  </div>
                </div>

                <ScenarioFilters
                  severityFilters={severityFilters}
                  ownerRoleFilter={ownerRoleFilter}
                  decisionFilter={decisionFilter}
                  tacticFilter={tacticFilter}
                  sortBy={sortBy}
                  tacticOptions={tacticOptions}
                  onSeverityToggle={handleToggleSeverity}
                  onOwnerRoleChange={setOwnerRoleFilter}
                  onDecisionChange={setDecisionFilter}
                  onTacticChange={setTacticFilter}
                  onSortChange={setSortBy}
                  onClear={resetFilters}
                />
              </>
            )}

            {!isLoading && scenarios.length > 0 && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                  <MetricStatCard label="Risk Scenarios" value={scenarios.length} emphasize />
                  <MetricStatCard label="Pending Review" value={pendingScenarios.length} />
                  <MetricStatCard label="Critical" value={criticalCount} />
                  <MetricStatCard label="High" value={highCount} />
                </div>

                {filteredScenarios.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-surface-700 bg-surface-900/30 px-6 py-8 text-center">
                    <p className="text-sm font-medium text-slate-400">No risk scenarios match the current filters.</p>
                    <p className="mt-1 text-xs text-slate-600">
                      Adjust the filters or clear them to bring the full register back into view.
                    </p>
                  </div>
                ) : (
                  filteredScenarios.map((scenario, index) => (
                    <ScenarioCard
                      key={scenario.id}
                      scenario={scenario}
                      index={index}
                      onSetDecision={handleSetDecision}
                      onAnalyze={handleAnalyze}
                    />
                  ))
                )}
              </div>
            )}

            {!isLoading && !hasGenerated && !error && (
              <div className="rounded-xl border border-dashed border-surface-700 bg-surface-900/30 px-8 py-16 text-center">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-surface-700 bg-surface-800">
                  <ScanLine className="h-6 w-6 text-slate-600" />
                </div>
                <p className="mb-2 text-sm font-medium text-slate-400">No risk scenarios generated yet</p>
                <p className="mx-auto max-w-sm text-xs leading-relaxed text-slate-600">
                  Paste your architecture above, or choose a preset, then click{" "}
                  <span className="text-cyan-400">Generate Risk Register</span>.
                </p>
              </div>
            )}
          </div>

          <div className="xl:pt-[52px]">
            <ScenarioQueue
              scenarios={queuedScenarios}
              onRemove={(id) => handleSetDecision(id, "pending")}
            />
          </div>
        </div>
      </main>

      <AnalysisPanel
        scenario={analysisScenario}
        onClose={() => {
          setAnalysisScenarioId(null);
        }}
        onPatchScenario={handlePatchScenario}
      />
    </div>
  );
}

function MetricStatCard({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: number;
  emphasize?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        emphasize
          ? "border-cyan-500/20 bg-cyan-500/5"
          : "border-surface-700 bg-surface-900/70"
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${emphasize ? "text-cyan-300" : "text-slate-200"}`}>
        {value}
      </p>
    </div>
  );
}
