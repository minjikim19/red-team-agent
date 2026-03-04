"use client";

import { FlaskConical, Clock, Layers, AlertCircle, X } from "lucide-react";
import type { AttackScenario } from "@/types";
import SeverityBadge from "./SeverityBadge";
import clsx from "clsx";

interface ScenarioQueueProps {
  scenarios: AttackScenario[];
  onRemove: (id: string) => void;
}

const SEVERITY_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3 };

export default function ScenarioQueue({ scenarios, onRemove }: ScenarioQueueProps) {
  const sorted = [...scenarios].sort(
    (a, b) =>
      (b.riskScore ?? 0) - (a.riskScore ?? 0) ||
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
      a.id.localeCompare(b.id)
  );

  const criticalCount = scenarios.filter((scenario) => scenario.severity === "Critical").length;
  const highCount = scenarios.filter((scenario) => scenario.severity === "High").length;

  return (
    <div className="sticky top-20 h-fit overflow-hidden rounded-xl border border-surface-700 bg-surface-900">
      <div className="border-b border-surface-700 px-5 py-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-md border border-cyan-500/20 bg-cyan-500/10">
              <FlaskConical className="h-3.5 w-3.5 text-cyan-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Decision Queue</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {scenarios.length === 0
                  ? "No scenarios queued"
                  : `${scenarios.length} scenario${scenarios.length !== 1 ? "s" : ""} queued for validation`}
              </p>
            </div>
          </div>
          {scenarios.length > 0 && (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500 text-xs font-bold text-slate-950">
              {scenarios.length}
            </span>
          )}
        </div>

        {scenarios.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {criticalCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">
                <AlertCircle className="h-3 w-3" />
                {criticalCount} Critical
              </span>
            )}
            {highCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md border border-orange-500/20 bg-orange-500/10 px-2 py-0.5 text-xs font-medium text-orange-400">
                {highCount} High
              </span>
            )}
          </div>
        )}
      </div>

      {scenarios.length === 0 && (
        <div className="flex flex-col items-center px-5 py-12 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-surface-700 bg-surface-800">
            <Layers className="h-5 w-5 text-slate-600" />
          </div>
          <p className="mb-1 text-sm font-medium text-slate-500">Queue is empty</p>
          <p className="max-w-[200px] text-xs leading-relaxed text-slate-600">
            Select a decision on any scenario to add it to the queue
          </p>
        </div>
      )}

      {sorted.length > 0 && (
        <div className="divide-y divide-surface-700/50">
          {sorted.map((scenario, index) => (
            <QueueItem
              key={scenario.id}
              scenario={scenario}
              position={index + 1}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}

      {scenarios.length > 0 && (
        <div className="border-t border-surface-700 bg-surface-950/30 px-5 py-3">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Clock className="h-3 w-3" />
            <span>Priority order for human validation and testing</span>
          </div>
        </div>
      )}
    </div>
  );
}

function QueueItem({
  scenario,
  position,
  onRemove,
}: {
  scenario: AttackScenario;
  position: number;
  onRemove: (id: string) => void;
}) {
  const borderAccent = {
    Critical: "border-l-red-500",
    High: "border-l-orange-500",
    Medium: "border-l-yellow-500",
    Low: "border-l-blue-500",
  }[scenario.severity];

  return (
    <div
      className={clsx(
        "group animate-fade-in border-l-2 px-4 py-3.5 transition-colors hover:bg-surface-800/40",
        borderAccent
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 w-4 flex-shrink-0 text-xs font-mono text-slate-600">
          {position}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-2 text-xs font-medium leading-snug text-slate-300 transition-colors group-hover:text-white">
              {scenario.title}
            </p>
            <button
              type="button"
              onClick={() => onRemove(scenario.id)}
              title="Remove from queue"
              className="mt-[-2px] flex-shrink-0 rounded p-1 text-slate-700 transition-colors hover:bg-red-500/10 hover:text-red-400"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <SeverityBadge severity={scenario.severity} size="sm" />
            <span className="text-xs font-mono text-slate-600">{scenario.mitreId}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
