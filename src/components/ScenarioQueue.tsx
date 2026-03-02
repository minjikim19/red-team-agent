"use client";

import {
  FlaskConical,
  Clock,
  Layers,
  AlertCircle,
  X,
} from "lucide-react";
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
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
  );

  const criticalCount = scenarios.filter((s) => s.severity === "Critical").length;
  const highCount = scenarios.filter((s) => s.severity === "High").length;

  return (
    <div className="rounded-xl border border-surface-700 bg-surface-900 overflow-hidden h-fit sticky top-20">
      {/* Queue header */}
      <div className="px-5 py-4 border-b border-surface-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-7 h-7 rounded-md bg-cyan-500/10 border border-cyan-500/20">
              <FlaskConical className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Test Queue</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {scenarios.length === 0
                  ? "No scenarios queued"
                  : `${scenarios.length} scenario${scenarios.length !== 1 ? "s" : ""} approved`}
              </p>
            </div>
          </div>
          {scenarios.length > 0 && (
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-cyan-500 text-slate-950 text-xs font-bold">
              {scenarios.length}
            </span>
          )}
        </div>

        {/* Severity summary chips */}
        {scenarios.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {criticalCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
                <AlertCircle className="w-3 h-3" />
                {criticalCount} Critical
              </span>
            )}
            {highCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-medium">
                {highCount} High
              </span>
            )}
          </div>
        )}
      </div>

      {/* Empty state */}
      {scenarios.length === 0 && (
        <div className="px-5 py-12 flex flex-col items-center text-center">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-surface-800 border border-surface-700 mb-4">
            <Layers className="w-5 h-5 text-slate-600" />
          </div>
          <p className="text-sm text-slate-500 font-medium mb-1">
            Queue is empty
          </p>
          <p className="text-xs text-slate-600 leading-relaxed max-w-[200px]">
            Click &ldquo;Test This&rdquo; on any generated scenario to add it here
          </p>
        </div>
      )}

      {/* Queue items */}
      {sorted.length > 0 && (
        <div className="divide-y divide-surface-700/50">
          {sorted.map((scenario, i) => (
            <QueueItem
              key={scenario.id}
              scenario={scenario}
              position={i + 1}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}

      {/* Footer */}
      {scenarios.length > 0 && (
        <div className="px-5 py-3 border-t border-surface-700 bg-surface-950/30">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Clock className="w-3 h-3" />
            <span>Sorted by severity · pending execution</span>
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
        "px-4 py-3.5 border-l-2 hover:bg-surface-800/40 transition-colors group animate-fade-in",
        borderAccent
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 text-xs font-mono text-slate-600 mt-0.5 w-4">
          {position}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-medium text-slate-300 leading-snug line-clamp-2 group-hover:text-white transition-colors">
              {scenario.title}
            </p>
            <button
              onClick={() => onRemove(scenario.id)}
              title="Remove from queue"
              className="flex-shrink-0 p-1 rounded hover:bg-red-500/10 text-slate-700 hover:text-red-400 transition-colors cursor-pointer mt-[-2px]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <SeverityBadge severity={scenario.severity} size="sm" />
            <span className="text-xs text-slate-600 font-mono">
              {scenario.mitreId}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
