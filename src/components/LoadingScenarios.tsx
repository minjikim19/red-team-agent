"use client";

import { useEffect, useRef } from "react";
import {
  CheckCircle2,
  Loader2,
  Radar,
  LayoutList,
  GitMerge,
  BookOpen,
  Bot,
} from "lucide-react";
import type { AgentLogEntry } from "@/types";
import clsx from "clsx";

type ToolConfig = {
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  dotColor: string;
};

const TOOL_CONFIG: Record<string, ToolConfig> = {
  analyze_attack_surface: {
    label: "Extract Risk Surface",
    Icon: Radar,
    iconColor: "text-blue-400",
    dotColor: "bg-blue-500",
  },
  generate_scenarios: {
    label: "Generate Risk Register",
    Icon: LayoutList,
    iconColor: "text-violet-400",
    dotColor: "bg-violet-500",
  },
  create_attack_chain: {
    label: "Model Risk Progression",
    Icon: GitMerge,
    iconColor: "text-orange-400",
    dotColor: "bg-orange-500",
  },
  generate_playbook: {
    label: "Draft Mitigations & Detection Plan",
    Icon: BookOpen,
    iconColor: "text-emerald-400",
    dotColor: "bg-emerald-500",
  },
};

interface LoadingScenariosProps {
  agentLog: AgentLogEntry[];
}

function formatAgentSummary(summary: string): string {
  const metadataMatch = summary.match(
    /assets=(\d+),\s*boundaries=(\d+),\s*entryPoints=(\d+),\s*controls=(\d+),\s*unknowns=(\d+)/i
  );

  if (!metadataMatch) {
    return summary;
  }

  const [, assets, boundaries, entryPoints, controls, unknowns] = metadataMatch;
  return `Assets: ${assets} · Boundaries: ${boundaries} · Entry points: ${entryPoints} · Controls: ${controls} · Unknowns: ${unknowns}`;
}

export default function LoadingScenarios({ agentLog }: LoadingScenariosProps) {
  const logBottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll log as new entries arrive
  useEffect(() => {
    logBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [agentLog.length]);

  const runningEntry = agentLog.find((e) => e.status === "running");
  const doneCount = agentLog.filter((e) => e.status === "done").length;

  return (
    <div className="space-y-3">
      {/* Agent runner card */}
      <div className="rounded-xl border border-surface-700 bg-surface-900 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-surface-700/50 flex items-center gap-3">
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-cyan-500/10 border border-cyan-500/20">
            <Bot className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Agent Running</p>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {runningEntry
                ? `${runningEntry.label}...`
                : agentLog.length === 0
                ? "Initializing Gemini agent..."
                : "Processing function responses..."}
            </p>
          </div>
          {agentLog.length > 0 && (
            <div className="flex-shrink-0 flex items-center gap-2.5">
              <span className="text-xs text-slate-600 font-mono tabular-nums">
                Step {doneCount} / {agentLog.length}
              </span>
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Live log */}
        <div className="max-h-72 overflow-y-auto">
          {agentLog.length === 0 ? (
            <div className="px-5 py-4 flex items-center gap-2 text-xs text-slate-600">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Sending architecture to agent...</span>
            </div>
          ) : (
            <div className="divide-y divide-surface-800/60">
              {agentLog.map((entry, i) => {
                const config = TOOL_CONFIG[entry.tool];
                const Icon = config?.Icon;
                const isRunning = entry.status === "running";

                return (
                  <div
                    key={entry.id}
                    className={clsx(
                      "px-5 py-3 flex items-start gap-3 animate-fade-in transition-colors",
                      isRunning ? "bg-surface-800/30" : ""
                    )}
                    style={{ animationDelay: `${Math.min(i * 30, 200)}ms` }}
                  >
                    {/* Tool icon */}
                    <div className="flex-shrink-0 mt-0.5 w-5 h-5 flex items-center justify-center">
                      {Icon ? (
                        <Icon className={clsx("w-3.5 h-3.5", config.iconColor)} />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-slate-600" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {config && (
                          <span
                            className={clsx(
                              "inline-block w-1.5 h-1.5 rounded-full flex-shrink-0",
                              config.dotColor
                            )}
                          />
                        )}
                        <p className="text-xs font-medium text-slate-300 truncate">
                          {config?.label ?? entry.label}
                        </p>
                      </div>
                      <p
                        className={clsx(
                          "text-xs mt-0.5 truncate",
                          isRunning ? "text-slate-400" : "text-slate-600"
                        )}
                      >
                        {formatAgentSummary(entry.summary)}
                      </p>
                    </div>

                    {/* Status */}
                    <div className="flex-shrink-0 mt-0.5">
                      {isRunning ? (
                        <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={logBottomRef} />
            </div>
          )}
        </div>
      </div>

      {/* Skeleton cards */}
      {[...Array(2)].map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-surface-700 bg-surface-900 px-5 py-4 animate-pulse"
          style={{ animationDelay: `${i * 120}ms` }}
        >
          <div className="flex items-start gap-4">
            <div className="w-7 h-7 rounded-lg bg-surface-700 flex-shrink-0" />
            <div className="flex-1 space-y-2.5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-surface-700 rounded-md w-3/4" />
                  <div className="h-3 bg-surface-800 rounded-md w-full" />
                </div>
                <div className="h-6 w-16 bg-surface-700 rounded-full flex-shrink-0" />
              </div>
              <div className="h-5 w-32 bg-surface-800 rounded-md" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
