"use client";

import type { Decision, OwnerRole, ScenarioSortOption, Severity } from "@/types";

interface ScenarioFiltersProps {
  severityFilters: Severity[];
  ownerRoleFilter: OwnerRole | "all";
  decisionFilter: Decision | "all";
  tacticFilter: string;
  sortBy: ScenarioSortOption;
  tacticOptions: string[];
  onSeverityToggle: (severity: Severity) => void;
  onOwnerRoleChange: (value: OwnerRole | "all") => void;
  onDecisionChange: (value: Decision | "all") => void;
  onTacticChange: (value: string) => void;
  onSortChange: (value: ScenarioSortOption) => void;
  onClear: () => void;
}

const SEVERITIES: Severity[] = ["Critical", "High", "Medium", "Low"];
const OWNER_ROLE_OPTIONS: Array<OwnerRole | "all"> = [
  "all",
  "Security",
  "Platform",
  "Compliance",
  "Product",
  "Data",
  "Unknown",
];
const DECISION_OPTIONS: Array<Decision | "all"> = [
  "all",
  "validate_test",
  "mitigate_now",
  "pending",
  "defer",
  "accept_risk",
  "rejected",
];

const DECISION_LABELS: Record<Decision | "all", string> = {
  all: "All Decisions",
  pending: "Pending",
  validate_test: "Validate / Test",
  mitigate_now: "Mitigate Now",
  defer: "Defer",
  accept_risk: "Accept Risk",
  rejected: "Rejected",
};

const SORT_LABELS: Record<ScenarioSortOption, string> = {
  severity_desc: "Severity (High to Low)",
  risk_score_desc: "Risk Score (High to Low)",
  confidence_desc: "Confidence (High to Low)",
  confidence_asc: "Confidence (Low to High)",
};

export default function ScenarioFilters({
  severityFilters,
  ownerRoleFilter,
  decisionFilter,
  tacticFilter,
  sortBy,
  tacticOptions,
  onSeverityToggle,
  onOwnerRoleChange,
  onDecisionChange,
  onTacticChange,
  onSortChange,
  onClear,
}: ScenarioFiltersProps) {
  return (
    <div className="rounded-xl border border-surface-700 bg-surface-900/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Severity
          </span>
          {SEVERITIES.map((severity) => {
            const active = severityFilters.includes(severity);
            return (
              <button
                key={severity}
                type="button"
                onClick={() => onSeverityToggle(severity)}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                  active
                    ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
                    : "border-surface-700 text-slate-500 hover:border-surface-600 hover:text-slate-300"
                }`}
              >
                {severity}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onClear}
          className="text-xs font-medium text-slate-500 transition-colors hover:text-slate-300"
        >
          Clear Filters
        </button>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
        <label className="space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Owner Role
          </span>
          <select
            value={ownerRoleFilter}
            onChange={(event) => onOwnerRoleChange(event.target.value as OwnerRole | "all")}
            className="w-full rounded-lg border border-surface-700 bg-surface-950 px-3 py-2 text-sm text-slate-300 focus:border-cyan-500/50 focus:outline-none"
          >
            {OWNER_ROLE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === "all" ? "All Owner Roles" : option}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Decision
          </span>
          <select
            value={decisionFilter}
            onChange={(event) => onDecisionChange(event.target.value as Decision | "all")}
            className="w-full rounded-lg border border-surface-700 bg-surface-950 px-3 py-2 text-sm text-slate-300 focus:border-cyan-500/50 focus:outline-none"
          >
            {DECISION_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {DECISION_LABELS[option]}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            MITRE Tactic
          </span>
          <select
            value={tacticFilter}
            onChange={(event) => onTacticChange(event.target.value)}
            className="w-full rounded-lg border border-surface-700 bg-surface-950 px-3 py-2 text-sm text-slate-300 focus:border-cyan-500/50 focus:outline-none"
          >
            <option value="all">All Tactics</option>
            {tacticOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Sort
          </span>
          <select
            value={sortBy}
            onChange={(event) => onSortChange(event.target.value as ScenarioSortOption)}
            className="w-full rounded-lg border border-surface-700 bg-surface-950 px-3 py-2 text-sm text-slate-300 focus:border-cyan-500/50 focus:outline-none"
          >
            {Object.entries(SORT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
