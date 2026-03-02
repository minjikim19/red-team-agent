"use client";

import { useState, useCallback } from "react";
import Header from "@/components/Header";
import ArchitectureInput from "@/components/ArchitectureInput";
import ScenarioCard from "@/components/ScenarioCard";
import ScenarioQueue from "@/components/ScenarioQueue";
import LoadingScenarios from "@/components/LoadingScenarios";
import AnalysisPanel from "@/components/AnalysisPanel";
import { AlertCircle, Cpu, ScanLine, FileDown } from "lucide-react";
import type { AttackScenario, AgentLogEntry, AgentSSEEvent } from "@/types";
import { exportPDF } from "@/lib/export-pdf";

export default function HomePage() {
  const [scenarios, setScenarios] = useState<AttackScenario[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [agentLog, setAgentLog] = useState<AgentLogEntry[]>([]);
  const [analysisScenario, setAnalysisScenario] = useState<AttackScenario | null>(null);

  const approvedScenarios = scenarios.filter((s) => s.status === "approved");

  const handleGenerate = useCallback(async (architecture: string) => {
    setIsLoading(true);
    setError(null);
    setScenarios([]);
    setAgentLog([]);

    try {
      const response = await fetch("/api/generate-scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ architecture }),
      });

      // Non-2xx before streaming means a hard error (e.g. validation)
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error ?? `HTTP ${response.status}`);
      }

      // Consume the SSE stream
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE messages are separated by double newlines
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const dataLine = part.split("\n").find((l) => l.startsWith("data: "));
          if (!dataLine) continue;

          let event: AgentSSEEvent;
          try {
            event = JSON.parse(dataLine.slice(6)) as AgentSSEEvent;
          } catch {
            continue; // skip malformed chunks
          }

          switch (event.type) {
            case "agent_start":
              break;

            case "tool_call":
              setAgentLog((prev) => [
                ...prev,
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
              setAgentLog((prev) =>
                prev.map((entry) =>
                  entry.callId === event.callId
                    ? { ...entry, summary: event.summary, status: "done" }
                    : entry
                )
              );
              break;

            case "complete": {
              const withStatus: AttackScenario[] = event.scenarios.map((s) => ({
                ...s,
                status: "pending",
              }));
              setScenarios(withStatus);
              setHasGenerated(true);
              setIsLoading(false);
              break;
            }

            case "error":
              throw new Error(event.message);
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
      setIsLoading(false);
    }
  }, []);

  const handleApprove = useCallback((id: string) => {
    setScenarios((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "approved" } : s))
    );
  }, []);

  const handleDismiss = useCallback((id: string) => {
    setScenarios((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "dismissed" } : s))
    );
  }, []);

  const handleSetPending = useCallback((id: string) => {
    setScenarios((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "pending" } : s))
    );
  }, []);

  const handleAnalyze = useCallback(
    (id: string) => {
      const found = scenarios.find((s) => s.id === id) ?? null;
      setAnalysisScenario(found);
    },
    [scenarios]
  );

  const pendingScenarios = scenarios.filter((s) => s.status === "pending");
  const dismissedCount = scenarios.filter((s) => s.status === "dismissed").length;

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        approvedCount={approvedScenarios.length}
        totalGenerated={scenarios.length}
      />

      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-6 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-8 items-start">
          {/* Left column */}
          <div className="space-y-6">
            {/* Page title */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ScanLine className="w-4 h-4 text-cyan-400" />
                <h1 className="text-base font-semibold text-white">
                  Threat Scenario Generator
                </h1>
              </div>
              <p className="text-sm text-slate-500">
                Describe your system architecture and Gemini will generate realistic,
                prioritized attack scenarios with defense playbooks.
              </p>
            </div>

            {/* Architecture input */}
            <ArchitectureInput
              onGenerate={handleGenerate}
              isLoading={isLoading}
            />

            {/* Error state */}
            {error && (
              <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl border border-red-500/25 bg-red-500/5 text-red-400 animate-fade-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Agent failed</p>
                  <p className="text-xs text-red-400/70 mt-0.5 font-mono">{error}</p>
                </div>
              </div>
            )}

            {/* Loading state — live agent log */}
            {isLoading && <LoadingScenarios agentLog={agentLog} />}

            {/* Results header */}
            {!isLoading && scenarios.length > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-300">
                    {scenarios.length} scenarios generated
                  </span>
                  {dismissedCount > 0 && (
                    <span className="text-xs text-slate-600">
                      · {dismissedCount} dismissed
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-600">
                    {pendingScenarios.length} pending review
                  </span>
                  <button
                    onClick={() => exportPDF(scenarios)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold transition-all duration-150 cursor-pointer shadow-sm shadow-cyan-500/20"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    Export Report
                  </button>
                </div>
              </div>
            )}

            {/* Scenario cards */}
            {!isLoading && scenarios.length > 0 && (
              <div className="space-y-3">
                {scenarios.map((scenario, i) => (
                  <ScenarioCard
                    key={scenario.id}
                    scenario={scenario}
                    index={i}
                    onApprove={handleApprove}
                    onDismiss={handleDismiss}
                    onAnalyze={handleAnalyze}
                    onUnqueue={handleSetPending}
                    onUndismiss={handleSetPending}
                  />
                ))}
              </div>
            )}

            {/* Empty state (before first generation) */}
            {!isLoading && !hasGenerated && !error && (
              <div className="rounded-xl border border-dashed border-surface-700 bg-surface-900/30 px-8 py-16 text-center">
                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-surface-800 border border-surface-700 mx-auto mb-5">
                  <ScanLine className="w-6 h-6 text-slate-600" />
                </div>
                <p className="text-sm font-medium text-slate-400 mb-2">
                  No scenarios generated yet
                </p>
                <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                  Paste your system architecture above and click{" "}
                  <span className="text-cyan-500">Generate Scenarios</span> to
                  begin the red team analysis. Use the demo data to see an example.
                </p>
              </div>
            )}
          </div>

          {/* Right column — Test queue */}
          <div className="xl:pt-[52px]">
            <ScenarioQueue scenarios={approvedScenarios} onRemove={handleSetPending} />
          </div>
        </div>
      </main>

      {/* Analysis panel — always in DOM, slides in/out based on analysisScenario */}
      <AnalysisPanel
        scenario={analysisScenario}
        onClose={() => setAnalysisScenario(null)}
      />
    </div>
  );
}
