"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  MessageSquare,
  Send,
  Zap,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import type { AttackScenario, ChatMessage } from "@/types";
import SeverityBadge from "./SeverityBadge";
import clsx from "clsx";

// ─── Suggested questions ───────────────────────────────────────────────────────

const SUGGESTED = [
  "Is this attack feasible in our current architecture?",
  "What's the most critical fix we should prioritize?",
  "Walk me through how an attacker would actually execute this",
  "What monitoring would detect this attack in real-time?",
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnalysisPanelProps {
  /** The scenario to analyse, or null when the panel is closed. */
  scenario: AttackScenario | null;
  onClose: () => void;
}

// ─── Markdown renderer ────────────────────────────────────────────────────────

/** Converts **bold** spans inline. Returns an array of strings/JSX. */
function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="text-white font-semibold">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    )
  );
}

/** Simple line-by-line markdown renderer for Gemini responses. */
function MessageContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Blank line → spacer
    if (line.trim() === "") {
      nodes.push(<div key={i} className="h-1.5" />);
      i++;
      continue;
    }

    // Headings: ## or ###
    if (/^#{2,3}\s/.test(line)) {
      nodes.push(
        <p key={i} className="font-semibold text-white mt-2 mb-0.5 first:mt-0">
          {renderInline(line.replace(/^#+\s/, ""))}
        </p>
      );
      i++;
      continue;
    }

    // Numbered list item: "1. "
    if (/^\d+\.\s/.test(line)) {
      const num = line.match(/^(\d+)\.\s/)?.[1];
      const rest = line.replace(/^\d+\.\s/, "");
      nodes.push(
        <div key={i} className="flex gap-2.5 my-0.5">
          <span className="flex-shrink-0 flex items-center justify-center w-4 h-4 rounded-full bg-cyan-500/15 text-cyan-400 text-[9px] font-mono font-bold mt-0.5">
            {num}
          </span>
          <span className="text-slate-300 leading-relaxed">{renderInline(rest)}</span>
        </div>
      );
      i++;
      continue;
    }

    // Bullet list item: "- " or "• "
    if (/^[-•]\s/.test(line)) {
      nodes.push(
        <div key={i} className="flex gap-2 my-0.5">
          <span className="text-cyan-500/70 mt-1.5 flex-shrink-0 leading-none">·</span>
          <span className="text-slate-300 leading-relaxed">
            {renderInline(line.replace(/^[-•]\s/, ""))}
          </span>
        </div>
      );
      i++;
      continue;
    }

    // Regular paragraph
    nodes.push(
      <p key={i} className="leading-relaxed">
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return <div className="space-y-0.5 text-sm text-slate-300">{nodes}</div>;
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <span className="inline-flex items-center gap-1 px-1">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AnalysisPanel({ scenario, onClose }: AnalysisPanelProps) {
  // Messages stored per scenario ID so history persists as user switches between scenarios
  const [historyById, setHistoryById] = useState<Record<string, ChatMessage[]>>({});
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = inputRef; // alias

  const messages: ChatMessage[] = scenario ? (historyById[scenario.id] ?? []) : [];
  const isOpen = scenario !== null;

  // Scroll to bottom whenever messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, messages[messages.length - 1]?.content]);

  // Focus input when a scenario is opened
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 340);
      return () => clearTimeout(t);
    }
  }, [isOpen, scenario?.id]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!scenario || !text.trim() || isStreaming) return;

      const trimmed = text.trim();
      const userMsg: ChatMessage = {
        id: `${Date.now()}-u`,
        role: "user",
        content: trimmed,
      };
      const assistantMsg: ChatMessage = {
        id: `${Date.now()}-m`,
        role: "model",
        content: "",
      };

      // Build history from current messages (exclude empty assistant placeholder)
      const currentMessages = historyById[scenario.id] ?? [];
      const historyForApi = currentMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      setHistoryById((prev) => ({
        ...prev,
        [scenario.id]: [...(prev[scenario.id] ?? []), userMsg, assistantMsg],
      }));
      setInput("");
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "40px";
      }
      setIsStreaming(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scenario,
            history: historyForApi,
            message: trimmed,
          }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            const dataLine = part.split("\n").find((l) => l.startsWith("data: "));
            if (!dataLine) continue;
            try {
              const event = JSON.parse(dataLine.slice(6));
              if (event.text) {
                setHistoryById((prev) => {
                  const msgs = [...(prev[scenario.id] ?? [])];
                  const last = msgs[msgs.length - 1];
                  if (last?.role === "model") {
                    msgs[msgs.length - 1] = {
                      ...last,
                      content: last.content + event.text,
                    };
                  }
                  return { ...prev, [scenario.id]: msgs };
                });
              }
            } catch {
              // skip malformed chunks
            }
          }
        }
      } catch (err) {
        // Write error into the assistant message
        setHistoryById((prev) => {
          const msgs = [...(prev[scenario.id] ?? [])];
          const last = msgs[msgs.length - 1];
          if (last?.role === "model") {
            msgs[msgs.length - 1] = {
              ...last,
              content: `Error: ${err instanceof Error ? err.message : "Failed to get response"}`,
            };
          }
          return { ...prev, [scenario.id]: msgs };
        });
      } finally {
        setIsStreaming(false);
      }
    },
    [scenario, isStreaming, historyById, textareaRef]
  );

  const clearHistory = useCallback(() => {
    if (!scenario) return;
    setHistoryById((prev) => ({ ...prev, [scenario.id]: [] }));
  }, [scenario]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    el.style.height = "40px";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  };

  return (
    <>
      {/* Backdrop — only rendered when open */}
      <div
        className={clsx(
          "fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in panel — always in DOM so state persists */}
      <div
        className={clsx(
          "fixed right-0 top-0 h-full w-full max-w-[520px] z-50 flex flex-col",
          "bg-surface-900 border-l border-surface-700 shadow-2xl",
          "transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
        aria-label="Scenario analysis panel"
      >
        {/* ── Panel header ───────────────────────────────────────────────── */}
        <div className="flex-shrink-0 border-b border-surface-700 bg-surface-900/95 backdrop-blur-sm">
          <div className="px-5 py-4 flex items-start gap-3">
            {/* Icon + label */}
            <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 mt-0.5">
              <MessageSquare className="w-4 h-4 text-cyan-400" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider mb-0.5">
                Analysis
              </p>
              <h2 className="text-sm font-semibold text-white leading-snug line-clamp-2">
                {scenario?.title ?? "Select a scenario"}
              </h2>
              {scenario && (
                <div className="flex items-center gap-2 mt-1.5">
                  <SeverityBadge severity={scenario.severity} size="sm" />
                  <span className="text-xs text-slate-500 font-mono">
                    {scenario.mitreId}
                  </span>
                  <span className="text-slate-700 text-xs">·</span>
                  <span className="text-xs text-slate-500">{scenario.mitreTactic}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {messages.length > 0 && (
                <button
                  onClick={clearHistory}
                  title="Clear conversation"
                  className="p-1.5 rounded-lg hover:bg-surface-700 text-slate-600 hover:text-slate-400 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-surface-700 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Attack chain mini-preview */}
          {scenario && scenario.attackChain.length > 0 && (
            <div className="px-5 pb-3.5 flex items-center gap-1 flex-wrap">
              {scenario.attackChain.slice(0, 4).map((step, i) => (
                <div key={i} className="flex items-center gap-1">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/8 border border-red-500/20 text-red-400 font-mono max-w-[130px] truncate">
                    {step}
                  </span>
                  {i < Math.min(scenario.attackChain.length, 4) - 1 && (
                    <ChevronRight className="w-3 h-3 text-orange-500/40 flex-shrink-0" />
                  )}
                </div>
              ))}
              {scenario.attackChain.length > 4 && (
                <span className="text-[10px] text-slate-600 ml-1">
                  +{scenario.attackChain.length - 4} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Messages ───────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {messages.length === 0 ? (
            /* Empty state + suggested questions */
            <div className="space-y-5">
              <div className="text-center pt-4 pb-2">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-surface-800 border border-surface-700 mx-auto mb-3">
                  <Zap className="w-5 h-5 text-cyan-400" />
                </div>
                <p className="text-sm font-medium text-slate-300 mb-1">
                  Ask anything about this scenario
                </p>
                <p className="text-xs text-slate-600 max-w-[280px] mx-auto leading-relaxed">
                  Gemini has full context of the attack chain, MITRE tactic, and business impact
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
                  Suggested questions
                </p>
                {SUGGESTED.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="w-full text-left px-3.5 py-2.5 rounded-xl border border-surface-700 bg-surface-800/60 hover:bg-surface-700 hover:border-surface-600 text-sm text-slate-300 transition-all duration-150 cursor-pointer leading-snug"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Conversation */
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={clsx(
                    "flex gap-2.5",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {/* Model avatar */}
                  {msg.role === "model" && (
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mt-1">
                      <Zap className="w-3 h-3 text-cyan-400" />
                    </div>
                  )}

                  <div
                    className={clsx(
                      "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm",
                      msg.role === "user"
                        ? "bg-cyan-500/12 border border-cyan-500/20 text-white rounded-tr-sm"
                        : "bg-surface-800 border border-surface-700 rounded-tl-sm"
                    )}
                  >
                    {msg.role === "model" && msg.content === "" ? (
                      <TypingIndicator />
                    ) : msg.role === "user" ? (
                      <p className="leading-relaxed">{msg.content}</p>
                    ) : (
                      <MessageContent content={msg.content} />
                    )}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* ── Quick-reply chips (shown mid-conversation) ─────────────────── */}
        {messages.length > 0 && !isStreaming && (
          <div className="flex-shrink-0 px-5 pb-2 flex gap-2 overflow-x-auto">
            {SUGGESTED.slice(0, 2).map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="flex-shrink-0 text-[11px] px-3 py-1.5 rounded-full border border-surface-700 bg-surface-800 hover:bg-surface-700 hover:border-surface-600 text-slate-400 hover:text-slate-300 transition-all cursor-pointer whitespace-nowrap"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* ── Input area ─────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 border-t border-surface-700 px-4 pt-3 pb-4">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onInput={handleInput}
              placeholder="Ask about this scenario…"
              rows={1}
              disabled={isStreaming || !scenario}
              className="flex-1 resize-none bg-surface-800 border border-surface-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/15 transition-all disabled:opacity-40 overflow-hidden"
              style={{ minHeight: "40px", maxHeight: "128px" }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isStreaming || !scenario}
              className="flex-shrink-0 w-10 h-10 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed text-slate-950 flex items-center justify-center transition-all cursor-pointer shadow-lg shadow-cyan-500/20"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-slate-700 mt-2 text-center">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </>
  );
}
