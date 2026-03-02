"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Shield,
  Target,
  AlertTriangle,
  BookOpen,
  Zap,
  MessageSquare,
  Undo2,
} from "lucide-react";
import type { AttackScenario } from "@/types";
import SeverityBadge from "./SeverityBadge";
import clsx from "clsx";

interface ScenarioCardProps {
  scenario: AttackScenario;
  index: number;
  onApprove: (id: string) => void;
  onDismiss: (id: string) => void;
  onAnalyze: (id: string) => void;
  onUnqueue: (id: string) => void;
  onUndismiss: (id: string) => void;
}

export default function ScenarioCard({
  scenario,
  index,
  onApprove,
  onDismiss,
  onAnalyze,
  onUnqueue,
  onUndismiss,
}: ScenarioCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isDismissed = scenario.status === "dismissed";
  const isApproved = scenario.status === "approved";

  return (
    <div
      className={clsx(
        "rounded-xl border transition-all duration-300 overflow-hidden animate-slide-up",
        isDismissed
          ? "border-surface-700/50 bg-surface-900/50"
          : isApproved
          ? "border-cyan-500/30 bg-surface-900 shadow-lg shadow-cyan-500/5"
          : "border-surface-700 bg-surface-900 hover:border-surface-600"
      )}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Card header — always visible and always expandable */}
      <div
        className="px-5 py-4 cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-start gap-4">
          {/* Index number */}
          <div className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg bg-surface-800 border border-surface-700 mt-0.5">
            <span className="text-xs font-mono text-slate-500">
              {String(index + 1).padStart(2, "0")}
            </span>
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3
                  className={clsx(
                    "text-sm font-semibold leading-snug",
                    isDismissed ? "text-slate-600 line-through decoration-slate-700" : "text-white"
                  )}
                >
                  {scenario.title}
                </h3>
                <p className={clsx(
                  "text-xs mt-1 font-mono line-clamp-1",
                  isDismissed ? "text-slate-700" : "text-slate-500"
                )}>
                  {scenario.attackVector}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {isDismissed && (
                  <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider px-1.5 py-0.5 rounded border border-surface-700">
                    dismissed
                  </span>
                )}
                <SeverityBadge severity={scenario.severity} />
                {expanded ? (
                  <ChevronUp className="w-4 h-4 text-slate-600" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-600" />
                )}
              </div>
            </div>

            {/* MITRE tag + action button */}
            <div className="flex items-center justify-between gap-2 mt-2.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-xs bg-surface-800 border border-surface-700 text-slate-500">
                  <span className="text-slate-600">MITRE</span>
                  <span className={isDismissed ? "text-slate-600" : "text-slate-400"}>
                    {scenario.mitreId}
                  </span>
                </span>
                <span className={clsx(
                  "text-xs",
                  isDismissed ? "text-slate-700" : "text-slate-600"
                )}>
                  {scenario.mitreTactic}
                </span>
              </div>
              {/* Undismiss for dismissed, Analyze for active */}
              {isDismissed ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUndismiss(scenario.id);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-surface-700 hover:border-cyan-500/40 hover:bg-cyan-500/5 text-slate-600 hover:text-cyan-400 text-xs font-medium transition-all duration-150 cursor-pointer flex-shrink-0"
                >
                  <Undo2 className="w-3 h-3" />
                  Undismiss
                </button>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAnalyze(scenario.id);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-surface-700 hover:border-cyan-500/40 hover:bg-cyan-500/5 text-slate-500 hover:text-cyan-400 text-xs font-medium transition-all duration-150 cursor-pointer flex-shrink-0"
                >
                  <MessageSquare className="w-3 h-3" />
                  Analyze
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded detail — available for all states including dismissed */}
      {expanded && (
        <div className={clsx(
          "border-t bg-surface-950/40",
          isDismissed ? "border-surface-700/30" : "border-surface-700/60"
        )}>
          {/* Description */}
          <div className="px-5 pt-4 pb-3">
            <div className="flex items-center gap-2 mb-2">
              <Target className={clsx("w-3.5 h-3.5", isDismissed ? "text-slate-600" : "text-slate-500")} />
              <span className={clsx(
                "text-xs font-semibold uppercase tracking-wider",
                isDismissed ? "text-slate-600" : "text-slate-400"
              )}>
                Attack Description
              </span>
            </div>
            <p className={clsx(
              "text-sm leading-relaxed",
              isDismissed ? "text-slate-600" : "text-slate-300"
            )}>
              {scenario.description}
            </p>
          </div>

          {/* Attack chain */}
          {scenario.attackChain && scenario.attackChain.length > 0 && (
            <div className="px-5 py-3 border-t border-surface-700/40">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap className={clsx("w-3.5 h-3.5", isDismissed ? "text-slate-600" : "text-orange-500/70")} />
                  <span className={clsx(
                    "text-xs font-semibold uppercase tracking-wider",
                    isDismissed ? "text-slate-600" : "text-slate-400"
                  )}>
                    Attack Chain
                  </span>
                </div>
                <span className="text-xs font-mono text-slate-600">
                  {scenario.attackChain.length} steps
                </span>
              </div>

              {scenario.attackChain.length <= 3 ? (
                <div className="flex items-start flex-wrap gap-1.5">
                  {scenario.attackChain.map((step, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <div className={clsx(
                        "flex items-start gap-2 px-3 py-2 rounded-lg border min-w-0 max-w-[220px]",
                        isDismissed
                          ? "bg-surface-800/40 border-surface-700/50"
                          : "bg-red-500/8 border-red-500/20"
                      )}>
                        <span className={clsx(
                          "flex-shrink-0 text-xs font-mono font-semibold mt-px",
                          isDismissed ? "text-slate-600" : "text-orange-400"
                        )}>
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className={clsx(
                          "text-xs leading-relaxed break-words",
                          isDismissed ? "text-slate-600" : "text-slate-300"
                        )}>
                          {step}
                        </span>
                      </div>
                      {i < scenario.attackChain.length - 1 && (
                        <span className={clsx(
                          "text-sm font-bold mt-2 flex-shrink-0",
                          isDismissed ? "text-slate-700" : "text-orange-500/40"
                        )}>
                          →
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-0">
                  {scenario.attackChain.map((step, i) => (
                    <div key={i} className="flex items-stretch gap-3">
                      <div className="flex flex-col items-center flex-shrink-0 w-6">
                        <div className={clsx(
                          "flex items-center justify-center w-5 h-5 rounded-full border flex-shrink-0",
                          isDismissed
                            ? "bg-surface-800/40 border-surface-700"
                            : "bg-red-500/15 border-red-500/30"
                        )}>
                          <span className={clsx(
                            "text-[9px] font-mono font-bold",
                            isDismissed ? "text-slate-600" : "text-orange-400"
                          )}>
                            {i + 1}
                          </span>
                        </div>
                        {i < scenario.attackChain.length - 1 && (
                          <div className={clsx(
                            "w-px flex-1 my-0.5 min-h-[12px]",
                            isDismissed
                              ? "bg-surface-700/50"
                              : "bg-gradient-to-b from-red-500/25 to-orange-500/10"
                          )} />
                        )}
                      </div>
                      <div className={clsx("flex-1 min-w-0", i < scenario.attackChain.length - 1 ? "pb-2.5" : "pb-0")}>
                        <p className={clsx(
                          "text-xs leading-relaxed pt-0.5",
                          isDismissed ? "text-slate-600" : "text-slate-300"
                        )}>
                          {step}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Impact */}
          <div className="px-5 py-3 border-t border-surface-700/40">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className={clsx("w-3.5 h-3.5", isDismissed ? "text-slate-600" : "text-amber-500/70")} />
              <span className={clsx(
                "text-xs font-semibold uppercase tracking-wider",
                isDismissed ? "text-slate-600" : "text-slate-400"
              )}>
                Estimated Impact
              </span>
            </div>
            <p className={clsx(
              "text-sm leading-relaxed",
              isDismissed ? "text-slate-600" : "text-amber-400/80"
            )}>
              {scenario.estimatedImpact}
            </p>
          </div>

          {/* Defense playbook */}
          <div className="px-5 py-3 border-t border-surface-700/40">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className={clsx("w-3.5 h-3.5", isDismissed ? "text-slate-600" : "text-emerald-500/70")} />
              <span className={clsx(
                "text-xs font-semibold uppercase tracking-wider",
                isDismissed ? "text-slate-600" : "text-slate-400"
              )}>
                Defense Playbook
              </span>
            </div>
            <ol className="space-y-2">
              {scenario.defensePlaybook.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className={clsx(
                    "flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full border text-xs font-mono mt-0.5",
                    isDismissed
                      ? "bg-surface-800/40 border-surface-700 text-slate-600"
                      : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  )}>
                    {i + 1}
                  </span>
                  <span className={clsx(
                    "text-sm leading-relaxed",
                    isDismissed ? "text-slate-600" : "text-slate-400"
                  )}>
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          {/* Action buttons */}
          <div className="px-5 py-4 border-t border-surface-700/60 bg-surface-900/60 flex items-center gap-3">
            {isDismissed ? (
              <button
                onClick={() => onUndismiss(scenario.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-surface-600 hover:border-cyan-500/30 hover:bg-cyan-500/5 text-slate-500 hover:text-cyan-400 text-sm font-medium transition-all duration-150 cursor-pointer"
              >
                <Undo2 className="w-3.5 h-3.5" />
                Undismiss
              </button>
            ) : scenario.status === "pending" ? (
              <>
                <button
                  onClick={() => onApprove(scenario.id)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-sm font-semibold transition-all duration-150 shadow-lg shadow-cyan-500/20 cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5" />
                  Test This
                </button>
                <button
                  onClick={() => onDismiss(scenario.id)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-surface-600 hover:border-surface-500 hover:bg-surface-800 text-slate-400 text-sm font-medium transition-all duration-150 cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Dismiss
                </button>
                <button
                  onClick={() => onAnalyze(scenario.id)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-surface-600 hover:border-cyan-500/30 hover:bg-cyan-500/5 text-slate-400 hover:text-cyan-400 text-sm font-medium transition-all duration-150 cursor-pointer ml-auto"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Analyze
                </button>
              </>
            ) : isApproved ? (
              <>
                <div className="flex items-center gap-2 text-cyan-400 text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="font-medium">Added to test queue</span>
                </div>
                <button
                  onClick={() => onUnqueue(scenario.id)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-surface-600 hover:border-orange-500/30 hover:bg-orange-500/5 text-slate-500 hover:text-orange-400 text-sm font-medium transition-all duration-150 cursor-pointer"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  Unqueue
                </button>
                <button
                  onClick={() => onAnalyze(scenario.id)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-surface-600 hover:border-cyan-500/30 hover:bg-cyan-500/5 text-slate-500 hover:text-cyan-400 text-xs font-medium transition-all duration-150 cursor-pointer ml-auto"
                >
                  <MessageSquare className="w-3 h-3" />
                  Analyze
                </button>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Collapsed status footer — approved and dismissed only */}
      {!expanded && (isApproved || isDismissed) && (
        <div
          className={clsx(
            "px-4 py-2 border-t flex items-center justify-between gap-2",
            isApproved
              ? "border-cyan-500/20 bg-cyan-500/5"
              : "border-surface-700/50 bg-surface-950/10"
          )}
        >
          {isApproved ? (
            <>
              <span className="flex items-center gap-1.5 text-xs text-cyan-500">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Added to test queue
              </span>
              <button
                onClick={() => onUnqueue(scenario.id)}
                className="flex items-center gap-1.5 px-2 py-1 rounded border border-surface-600 hover:border-orange-500/30 hover:bg-orange-500/5 text-slate-600 hover:text-orange-400 text-xs font-medium transition-all duration-150 cursor-pointer flex-shrink-0"
              >
                <Undo2 className="w-3 h-3" />
                Unqueue
              </button>
            </>
          ) : (
            <>
              <span className="flex items-center gap-1.5 text-xs text-slate-600">
                <XCircle className="w-3.5 h-3.5" />
                Dismissed — click to expand and review
              </span>
              <button
                onClick={() => onUndismiss(scenario.id)}
                className="flex items-center gap-1.5 px-2 py-1 rounded border border-surface-600 hover:border-cyan-500/30 hover:bg-cyan-500/5 text-slate-500 hover:text-cyan-400 text-xs font-medium transition-all duration-150 cursor-pointer flex-shrink-0"
              >
                <Undo2 className="w-3 h-3" />
                Undismiss
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
