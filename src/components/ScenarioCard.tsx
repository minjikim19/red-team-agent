"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Target,
  AlertTriangle,
  BookOpen,
  Zap,
  MessageSquare,
  Undo2,
  FlaskConical,
  Wrench,
  Clock,
  ThumbsUp,
  GitBranch,
} from "lucide-react";
import type { AttackScenario, Decision, RiskLevel } from "@/types";
import { computeRiskScore } from "@/utils/riskScore";
import SeverityBadge from "./SeverityBadge";
import clsx from "clsx";

interface ScenarioCardProps {
  scenario: AttackScenario;
  index: number;
  onSetDecision: (id: string, decision: Decision, reason?: string) => void;
  onAnalyze: (id: string) => void;
}

const DECISION_LABELS: Record<Decision, string> = {
  pending: "Pending",
  validate_test: "Validate / Test",
  mitigate_now: "Mitigate Now",
  defer: "Defer",
  accept_risk: "Accept Risk",
  rejected: "Rejected",
};

const REASON_REQUIRED: Decision[] = ["mitigate_now", "defer", "accept_risk"];

const DECISION_PILL_CLASS: Partial<Record<Decision, string>> = {
  validate_test: "border-cyan-500/40 text-cyan-400",
  mitigate_now: "border-orange-500/40 text-orange-400",
  defer: "border-slate-500/40 text-slate-400",
  accept_risk: "border-violet-500/40 text-violet-400",
  rejected: "border-surface-700 text-slate-600",
};

const DECISION_TEXT_CLASS: Record<Decision, string> = {
  pending: "text-slate-400",
  validate_test: "text-cyan-400",
  mitigate_now: "text-orange-400",
  defer: "text-slate-400",
  accept_risk: "text-violet-400",
  rejected: "text-slate-600",
};

function formatLevel(level?: RiskLevel): string {
  return level ?? "-";
}

function formatConfidence(confidence?: number): string {
  if (typeof confidence !== "number" || !Number.isFinite(confidence)) {
    return "-";
  }

  return `${Math.round(confidence * 100)}%`;
}

function formatRiskScoreValue(scenario: AttackScenario): string {
  const score =
    typeof scenario.riskScore === "number" && Number.isFinite(scenario.riskScore)
      ? scenario.riskScore
      : scenario.likelihood && scenario.impact
        ? computeRiskScore(scenario.likelihood, scenario.impact)
        : null;

  if (score === null) {
    return "-";
  }

  return Math.round(score) === score ? score.toFixed(0) : score.toFixed(1);
}

function getRiskScoreColor(score?: number): string {
  if (typeof score !== "number" || !Number.isFinite(score)) {
    return "border-surface-700 bg-surface-950/60 text-slate-200";
  }

  if (score >= 9) {
    return "border-red-500/30 bg-red-500/10 text-red-300";
  }

  if (score >= 7) {
    return "border-orange-500/30 bg-orange-500/10 text-orange-300";
  }

  if (score >= 5) {
    return "border-yellow-500/30 bg-yellow-500/10 text-yellow-200";
  }

  return "border-surface-700 bg-surface-950/60 text-slate-200";
}

export default function ScenarioCard({
  scenario,
  index,
  onSetDecision,
  onAnalyze,
}: ScenarioCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [pendingDecision, setPendingDecision] = useState<Decision | null>(null);
  const [reasonInput, setReasonInput] = useState("");
  const [progressionView, setProgressionView] = useState<"list" | "graph">("graph");
  const [showGovernanceActions, setShowGovernanceActions] = useState(false);

  const { decision } = scenario;
  const isPending = decision === "pending";
  const isRejected = decision === "rejected";
  const isQueued = decision === "validate_test";

  function applyDecision(nextDecision: Decision, reason?: string) {
    onSetDecision(scenario.id, nextDecision, reason);
    setPendingDecision(null);
    setReasonInput("");
  }

  function handleDecisionClick(nextDecision: Decision) {
    if (REASON_REQUIRED.includes(nextDecision)) {
      setPendingDecision(nextDecision);
      setReasonInput("");
      return;
    }

    applyDecision(nextDecision);
  }

  return (
    <div
      className={clsx(
        "animate-slide-up overflow-hidden rounded-xl border transition-all duration-300 hover:border-cyan-400 hover:bg-slate-800/40",
        isRejected
          ? "border-surface-700/50 bg-surface-900/50"
          : isQueued
            ? "border-cyan-500/30 bg-surface-900 shadow-lg shadow-cyan-500/5"
            : "border-surface-700 bg-surface-900"
      )}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="cursor-pointer select-none px-5 py-4" onClick={() => setExpanded((current) => !current)}>
        <div className="flex items-start gap-4">
          <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-surface-700 bg-surface-800">
            <span className="text-xs font-mono text-slate-500">
              {String(index + 1).padStart(2, "0")}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
                    AI Generated
                  </span>
                  {isPending && (
                    <span className="rounded-full border border-surface-700 bg-surface-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Human Review Pending
                    </span>
                  )}
                </div>
                <h3
                  className={clsx(
                    "text-sm font-semibold leading-snug",
                    isRejected
                      ? "text-slate-600 line-through decoration-slate-700"
                      : "text-white"
                  )}
                >
                  {scenario.title}
                </h3>
                <p
                  className={clsx(
                    "mt-1 line-clamp-1 font-mono text-xs",
                    isRejected ? "text-slate-700" : "text-slate-500"
                  )}
                >
                  {scenario.attackVector}
                </p>
              </div>

              <div className="flex flex-shrink-0 items-center gap-2">
                {!isPending && (
                  <span
                    className={clsx(
                      "rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                      DECISION_PILL_CLASS[decision] ?? "border-surface-700 text-slate-500"
                    )}
                  >
                    {DECISION_LABELS[decision]}
                  </span>
                )}
                <SeverityBadge severity={scenario.severity} />
                {expanded ? (
                  <ChevronUp className="h-4 w-4 text-slate-600" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-600" />
                )}
              </div>
            </div>

            <div className="mt-2.5 flex items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={clsx(
                    "inline-flex items-center rounded border border-surface-700 bg-surface-800 px-2 py-0.5 text-xs",
                    isRejected ? "text-slate-600" : "text-slate-400"
                  )}
                >
                  {`MITRE ${scenario.mitreId} — ${scenario.mitreTactic}`}
                </span>
                <span
                  className={clsx(
                    "rounded border px-1.5 py-px text-[10px] font-medium",
                    isRejected ? "border-surface-700 text-slate-700" : "border-surface-700 text-slate-500"
                  )}
                >
                  {scenario.ownerRole}
                </span>
              </div>

              <span className="text-[11px] text-slate-600">Owner: {scenario.ownerRole}</span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
              <MetricPill
                label="Likelihood"
                value={formatLevel(scenario.likelihood)}
                muted={isRejected}
                variant="subtle"
              />
              <MetricPill
                label="Impact"
                value={formatLevel(scenario.impact)}
                muted={isRejected}
                variant="subtle"
              />
              <MetricPill
                label="Risk Score"
                value={formatRiskScoreValue(scenario)}
                muted={isRejected}
                valueClassName={getRiskScoreColor(scenario.riskScore)}
                variant="badge"
              />
              <MetricPill
                label="Confidence"
                value={formatConfidence(scenario.confidence)}
                muted={isRejected}
                variant="subtle"
              />
            </div>
          </div>
        </div>
      </div>

      {expanded && (
        <div
          className={clsx(
            "border-t bg-surface-950/40",
            isRejected ? "border-surface-700/30" : "border-surface-700/60"
          )}
        >
          <div className="px-5 pb-4 pt-4">
            <div className="mb-2 flex items-center gap-2">
              <Target className={clsx("h-3.5 w-3.5", isRejected ? "text-slate-600" : "text-slate-500")} />
              <span
                className={clsx(
                  "text-xs font-semibold uppercase tracking-wider",
                  isRejected ? "text-slate-600" : "text-slate-400"
                )}
              >
                Scenario Description
              </span>
            </div>
            <p className={clsx("text-sm leading-relaxed", isRejected ? "text-slate-600" : "text-slate-300")}>
              {scenario.description}
            </p>
          </div>

          <div className="border-t border-surface-700/40 px-5 py-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <GitBranch
                  className={clsx("h-3.5 w-3.5", isRejected ? "text-slate-600" : "text-orange-500/70")}
                />
                <span
                  className={clsx(
                    "text-xs font-semibold uppercase tracking-wider",
                    isRejected ? "text-slate-600" : "text-slate-400"
                  )}
                >
                  Risk Progression
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-600">
                  {(scenario.attackChain ?? []).length} steps
                </span>
                <div className="rounded-lg border border-surface-700 bg-surface-900/80 p-0.5">
                  {(["graph", "list"] as const).map((view) => (
                    <button
                      key={view}
                      type="button"
                      onClick={() => setProgressionView(view)}
                      className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${progressionView === view
                        ? "bg-cyan-500/10 text-cyan-300"
                        : "text-slate-500 hover:text-slate-300"
                        }`}
                    >
                      {view === "graph" ? "Graph" : "List"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {progressionView === "graph" ? (
              <RiskProgressionGraph steps={scenario.attackChain ?? []} muted={isRejected} />
            ) : (
              <RiskProgressionList steps={scenario.attackChain ?? []} muted={isRejected} />
            )}
          </div>

          <div className="border-t border-surface-700/40 px-5 py-4">
            <div className="mb-2 flex items-center gap-2">
              <AlertTriangle
                className={clsx("h-3.5 w-3.5", isRejected ? "text-slate-600" : "text-amber-500/70")}
              />
              <span
                className={clsx(
                  "text-xs font-semibold uppercase tracking-wider",
                  isRejected ? "text-slate-600" : "text-slate-400"
                )}
              >
                Estimated Impact
              </span>
            </div>
            <p
              className={clsx(
                "text-sm leading-relaxed",
                isRejected ? "text-slate-600" : "text-slate-300"
              )}
            >
              {scenario.estimatedImpact}
            </p>
          </div>

          <div className="border-t border-surface-700/40 px-5 py-4">
            <div className="mb-3 flex items-center gap-2">
              <BookOpen
                className={clsx("h-3.5 w-3.5", isRejected ? "text-slate-600" : "text-emerald-500/70")}
              />
              <span
                className={clsx(
                  "text-xs font-semibold uppercase tracking-wider",
                  isRejected ? "text-slate-600" : "text-slate-400"
                )}
              >
                Defense Playbook
              </span>
            </div>
            <ol className="space-y-2">
              {(scenario.defensePlaybook ?? []).map((step, playbookIndex) => (
                <li key={playbookIndex} className="flex items-start gap-3">
                  <span
                    className={clsx(
                      "mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border text-xs font-mono",
                      isRejected
                        ? "border-surface-700 bg-surface-800/40 text-slate-600"
                        : "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                    )}
                  >
                    {playbookIndex + 1}
                  </span>
                  <span
                    className={clsx(
                      "text-sm leading-relaxed",
                      isRejected ? "text-slate-600" : "text-slate-400"
                    )}
                  >
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className="border-t border-surface-700/60 bg-surface-900/60 px-5 py-4">
            {isPending ? (
              pendingDecision ? (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400">
                    Reason for{" "}
                    <span className="font-medium text-white">{DECISION_LABELS[pendingDecision]}</span>{" "}
                    (optional):
                  </p>
                  <textarea
                    autoFocus
                    value={reasonInput}
                    onChange={(event) => setReasonInput(event.target.value.slice(0, 120))}
                    placeholder="e.g. Compensating controls already reduce immediate urgency"
                    rows={2}
                    className="w-full resize-none rounded-lg border border-surface-600 bg-surface-800 px-3 py-2 text-sm text-slate-300 placeholder-slate-600 focus:border-cyan-500/50 focus:outline-none"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        applyDecision(pendingDecision, reasonInput.trim() || undefined)
                      }
                      className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition-all duration-150 hover:bg-cyan-400"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPendingDecision(null);
                        setReasonInput("");
                      }}
                      className="rounded-lg border border-surface-600 px-4 py-2 text-sm font-medium text-slate-400 transition-all duration-150 hover:border-surface-500 hover:text-slate-300"
                    >
                      Cancel
                    </button>
                    <span className="ml-auto text-xs text-slate-600">{reasonInput.length}/120</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDecisionClick("validate_test")}
                      className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition-all duration-150 hover:bg-cyan-400"
                    >
                      <FlaskConical className="h-3.5 w-3.5" />
                      Validate / Test
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDecisionClick("mitigate_now")}
                      className="flex items-center gap-2 rounded-lg border border-orange-500/30 bg-orange-500/5 px-4 py-2 text-sm font-medium text-orange-400 transition-all duration-150 hover:bg-orange-500/10"
                    >
                      <Wrench className="h-3.5 w-3.5" />
                      Mitigate Now
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowGovernanceActions(true); onAnalyze(scenario.id) }}
                      className="ml-auto flex items-center gap-2 rounded-lg border border-surface-600 px-3 py-2 text-sm font-medium text-slate-400 transition-all duration-150 hover:border-cyan-500/30 hover:bg-cyan-500/5 hover:text-cyan-400"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      Review & Decide
                    </button>
                  </div>

                  {showGovernanceActions && (
                    <div className="rounded-lg border border-surface-700 bg-surface-950/40 p-3">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          Governance Decisions
                        </span>
                        <button
                          type="button"
                          onClick={() => onAnalyze(scenario.id)}
                          className="text-xs font-medium text-cyan-400 transition-colors hover:text-cyan-300"
                        >
                          Open Review Panel
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDecisionClick("accept_risk")}
                          className="flex items-center gap-1.5 rounded-lg border border-violet-500/20 px-3 py-1.5 text-xs font-medium text-violet-500/70 transition-all duration-150 hover:border-violet-500/40 hover:bg-violet-500/5 hover:text-violet-400"
                        >
                          <ThumbsUp className="h-3 w-3" />
                          Accept Risk
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDecisionClick("mitigate_now")}
                          className="flex items-center gap-1.5 rounded-lg border border-orange-500/20 px-3 py-1.5 text-xs font-medium text-orange-400 transition-all duration-150 hover:border-orange-500/40 hover:bg-orange-500/5"
                        >
                          <Wrench className="h-3 w-3" />
                          Mitigate
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDecisionClick("defer")}
                          className="flex items-center gap-1.5 rounded-lg border border-surface-600 px-3 py-1.5 text-xs font-medium text-slate-500 transition-all duration-150 hover:border-slate-500/50 hover:bg-surface-800 hover:text-slate-400"
                        >
                          <Clock className="h-3 w-3" />
                          Defer
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDecisionClick("rejected")}
                          className="flex items-center gap-1.5 rounded-lg border border-surface-600 px-3 py-1.5 text-xs font-medium text-slate-600 transition-all duration-150 hover:border-red-500/30 hover:bg-red-500/5 hover:text-red-400"
                        >
                          <XCircle className="h-3 w-3" />
                          Reject
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            ) : (
              <div className="flex items-center gap-3">
                <div className={clsx("min-w-0 text-sm", DECISION_TEXT_CLASS[decision])}>
                  <span className="flex items-center gap-2">
                    {isRejected ? (
                      <XCircle className="h-4 w-4 flex-shrink-0" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                    )}
                    <span className="font-medium">{DECISION_LABELS[decision]}</span>
                    {scenario.decisionReason && (
                      <span className="truncate text-slate-600">{scenario.decisionReason}</span>
                    )}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onSetDecision(scenario.id, "pending")}
                  className="ml-auto flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-surface-600 px-3 py-1.5 text-xs font-medium text-slate-500 transition-all duration-150 hover:border-slate-500 hover:bg-surface-800 hover:text-slate-300"
                >
                  <Undo2 className="h-3 w-3" />
                  Reset
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {!expanded && !isPending && (
        <div
          className={clsx(
            "flex items-center justify-between gap-2 border-t px-4 py-2",
            isQueued ? "border-cyan-500/20 bg-cyan-500/5" : "border-surface-700/50 bg-surface-950/10"
          )}
        >
          <span className={clsx("min-w-0 text-xs", DECISION_TEXT_CLASS[decision])}>
            <span className="flex items-center gap-1.5">
              {isRejected ? (
                <XCircle className="h-3.5 w-3.5 flex-shrink-0" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
              )}
              <span className="truncate">
                {DECISION_LABELS[decision]}
                {scenario.decisionReason ? ` - ${scenario.decisionReason}` : ""}
              </span>
            </span>
          </span>
          <button
            type="button"
            onClick={() => onSetDecision(scenario.id, "pending")}
            className="flex flex-shrink-0 items-center gap-1.5 rounded border border-surface-600 px-2 py-1 text-xs font-medium text-slate-600 transition-all duration-150 hover:border-slate-500 hover:bg-surface-800 hover:text-slate-300"
          >
            <Undo2 className="h-3 w-3" />
            Reset
          </button>
        </div>
      )}
    </div>
  );
}

function MetricPill({
  label,
  value,
  muted,
  valueClassName,
  variant = "badge",
}: {
  label: string;
  value: string;
  muted: boolean;
  valueClassName?: string;
  variant?: "badge" | "subtle" | "mutedText";
}) {
  return (
    <div
      className={clsx(
        "rounded-lg border px-3 py-2",
        muted ? "border-surface-700 bg-surface-900/40" : "border-surface-700 bg-surface-950/60"
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">{label}</p>
      {variant === "badge" && (
        <p
          className={clsx(
            "mt-1 inline-flex rounded-md border px-2 py-1 text-sm font-semibold",
            muted ? "border-surface-700 bg-surface-900/40 text-slate-600" : valueClassName
          )}
        >
          {value}
        </p>
      )}
      {variant === "subtle" && (
        <p className={clsx("mt-1 text-sm font-medium", muted ? "text-slate-600" : "text-slate-300")}>
          {value}
        </p>
      )}
      {variant === "mutedText" && (
        <p className={clsx("mt-1 text-sm", muted ? "text-slate-600" : "text-slate-500")}>
          {label}: {value}
        </p>
      )}
    </div>
  );
}

function RiskProgressionList({
  steps,
  muted,
}: {
  steps: string[];
  muted: boolean;
}) {
  if (steps.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-surface-700 px-3 py-4 text-sm text-slate-500">
        No risk progression steps were provided for this scenario.
      </p>
    );
  }

  return (
    <div className="space-y-0">
      {steps.map((step, stepIndex) => (
        <div key={`${step}-${stepIndex}`} className="flex items-stretch gap-3">
          <div className="flex w-6 flex-shrink-0 flex-col items-center">
            <div
              className={clsx(
                "flex h-5 w-5 items-center justify-center rounded-full border",
                muted ? "border-surface-700 bg-surface-800/40" : "border-red-500/30 bg-red-500/15"
              )}
            >
              <span className={clsx("text-[9px] font-mono font-bold", muted ? "text-slate-600" : "text-orange-400")}>
                {stepIndex + 1}
              </span>
            </div>
            {stepIndex < steps.length - 1 && (
              <div
                className={clsx(
                  "my-0.5 min-h-[12px] w-px flex-1",
                  muted ? "bg-surface-700/50" : "bg-gradient-to-b from-red-500/25 to-orange-500/10"
                )}
              />
            )}
          </div>
          <div className={clsx("min-w-0 flex-1", stepIndex < steps.length - 1 ? "pb-2.5" : "pb-0")}>
            <p className={clsx("pt-0.5 text-xs leading-relaxed", muted ? "text-slate-600" : "text-slate-300")}>
              {step}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function RiskProgressionGraph({
  steps,
  muted,
}: {
  steps: string[];
  muted: boolean;
}) {
  if (steps.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-surface-700 px-3 py-4 text-sm text-slate-500">
        No risk progression steps were provided for this scenario.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex min-w-max items-center gap-2 rounded-xl border border-surface-700 bg-surface-950/50 p-3">
        {steps.map((step, stepIndex) => (
          <div key={`${step}-${stepIndex}`} className="flex items-center gap-2">
            <div
              className={clsx(
                "w-44 rounded-xl border p-3",
                muted ? "border-surface-700 bg-surface-900/40" : "border-cyan-500/15 bg-surface-900"
              )}
            >
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                Step {stepIndex + 1}
              </div>
              <p className={clsx("text-xs leading-relaxed", muted ? "text-slate-600" : "text-slate-300")}>
                {step}
              </p>
            </div>
            {stepIndex < steps.length - 1 && (
              <div className="flex items-center gap-1 text-cyan-400/60">
                <div className="h-px w-5 bg-cyan-400/30" />
                <div className="border-y-4 border-l-4 border-y-transparent border-l-cyan-400/50" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
