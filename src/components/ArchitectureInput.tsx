"use client";

import { useState } from "react";
import { FileText, Zap, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { MOCK_ARCHITECTURE } from "@/lib/mock-data";

interface ArchitectureInputProps {
  onGenerate: (architecture: string) => void;
  isLoading: boolean;
}

export default function ArchitectureInput({
  onGenerate,
  isLoading,
}: ArchitectureInputProps) {
  const [value, setValue] = useState("");
  const [expanded, setExpanded] = useState(true);

  const handleLoadMock = () => {
    setValue(MOCK_ARCHITECTURE);
    setExpanded(true);
  };

  const handleSubmit = () => {
    if (!value.trim() || isLoading) return;
    onGenerate(value.trim());
    setExpanded(false);
  };

  const charCount = value.length;
  const isReady = charCount >= 50 && !isLoading;

  return (
    <div className="rounded-xl border border-surface-700 bg-surface-900 overflow-hidden">
      {/* Header */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => e.key === "Enter" || e.key === " " ? setExpanded((v) => !v) : undefined}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-800/50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-surface-700">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-white">System Architecture</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {charCount > 0
                ? `${charCount.toLocaleString()} characters — ${expanded ? "editing" : "ready"}`
                : "Paste your architecture description to begin"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {charCount === 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleLoadMock();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/10 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Load demo
            </button>
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          )}
        </div>
      </div>

      {/* Expandable body */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-surface-700/50">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={`Describe your system architecture...\n\nInclude: services, databases, auth mechanisms, third-party integrations, network topology, and any known trust boundaries.\n\nExample: "React SPA → API Gateway → Node.js microservices → PostgreSQL. Auth via JWT + MFA. Plaid integration for bank linking..."`}
            className="w-full mt-4 h-52 bg-surface-950 border border-surface-700 rounded-lg px-4 py-3 text-sm text-slate-300 placeholder:text-slate-600 font-mono resize-none focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors leading-relaxed"
            spellCheck={false}
          />
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-3">
              {value.length > 0 && (
                <button
                  onClick={() => setValue("")}
                  className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
                >
                  Clear
                </button>
              )}
              {charCount < 50 && charCount > 0 && (
                <p className="text-xs text-amber-500/70">
                  {50 - charCount} more characters needed
                </p>
              )}
            </div>

            <button
              onClick={handleSubmit}
              disabled={!isReady}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isReady
                  ? "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20 cursor-pointer"
                  : "bg-surface-700 text-slate-600 cursor-not-allowed"
              }`}
            >
              {isLoading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  Generate Scenarios
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
