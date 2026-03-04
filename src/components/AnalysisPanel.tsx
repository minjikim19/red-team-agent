"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
  type KeyboardEvent as ReactKeyboardEvent,
  type FormEvent as ReactFormEvent,
} from "react";
import {
  X,
  MessageSquare,
  Send,
  Zap,
  ChevronRight,
  RotateCcw,
  FlaskConical,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  TrendingUp,
} from "lucide-react";
import type { AttackScenario, ChatMessage } from "@/types";
import { formatRiskScore } from "@/utils/riskScore";
import SeverityBadge from "./SeverityBadge";
import clsx from "clsx";

const SUGGESTED = [
  "What assumptions make this risk plausible in our architecture?",
  "What telemetry would confirm or falsify this risk?",
  "What's the smallest mitigation that reduces impact fastest?",
  "What would break first at scale, and how do we monitor drift?",
];

interface AnalysisPanelProps {
  scenario: AttackScenario | null;
  onClose: () => void;
  onPatchScenario: (id: string, patch: Partial<AttackScenario>) => void;
}

function renderInline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={index} className="font-semibold text-white">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    )
  );
}

function MessageContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const nodes: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (line.trim() === "") {
      nodes.push(<div key={index} className="h-1.5" />);
      index += 1;
      continue;
    }

    if (/^#{2,3}\s/.test(line)) {
      nodes.push(
        <p key={index} className="mb-0.5 mt-2 font-semibold text-white first:mt-0">
          {renderInline(line.replace(/^#+\s/, ""))}
        </p>
      );
      index += 1;
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      const num = line.match(/^(\d+)\.\s/)?.[1];
      const rest = line.replace(/^\d+\.\s/, "");
      nodes.push(
        <div key={index} className="my-0.5 flex gap-2.5">
          <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-cyan-500/15 text-[9px] font-bold font-mono text-cyan-400">
            {num}
          </span>
          <span className="leading-relaxed text-slate-300">{renderInline(rest)}</span>
        </div>
      );
      index += 1;
      continue;
    }

    if (/^[-*]\s/.test(line)) {
      nodes.push(
        <div key={index} className="my-0.5 flex gap-2">
          <span className="mt-1.5 flex-shrink-0 leading-none text-cyan-500/70">*</span>
          <span className="leading-relaxed text-slate-300">
            {renderInline(line.replace(/^[-*]\s/, ""))}
          </span>
        </div>
      );
      index += 1;
      continue;
    }

    nodes.push(
      <p key={index} className="leading-relaxed">
        {renderInline(line)}
      </p>
    );
    index += 1;
  }

  return <div className="space-y-0.5 text-sm text-slate-300">{nodes}</div>;
}

function TypingIndicator() {
  return (
    <span className="inline-flex items-center gap-1 px-1">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}

export default function AnalysisPanel({ scenario, onClose, onPatchScenario }: AnalysisPanelProps) {
  const [historyById, setHistoryById] = useState<Record<string, ChatMessage[]>>({});
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [assumptionsOpen, setAssumptionsOpen] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const messages: ChatMessage[] = scenario ? (historyById[scenario.id] ?? []) : [];
  const isOpen = scenario !== null;
  const latestDecisionEvent =
    scenario?.decisionHistory && scenario.decisionHistory.length > 0
      ? scenario.decisionHistory[scenario.decisionHistory.length - 1]
      : null;

  const lastMessageContent = messages.length ? messages[messages.length - 1].content : "";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, lastMessageContent]);

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => inputRef.current?.focus(), 340);
    return () => clearTimeout(timer);
  }, [isOpen, scenario?.id]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!scenario || !text.trim() || isStreaming) {
        return;
      }

      const trimmed = text.trim();
      const userMessage: ChatMessage = {
        id: `${Date.now()}-u`,
        role: "user",
        content: trimmed,
      };
      const assistantMessage: ChatMessage = {
        id: `${Date.now()}-m`,
        role: "model",
        content: "",
      };

      const currentMessages = historyById[scenario.id] ?? [];
      const historyForApi = currentMessages.map((message) => ({
        role: message.role,
        content: message.content,
      }));

      setHistoryById((prev) => ({
        ...prev,
        [scenario.id]: [...(prev[scenario.id] ?? []), userMessage, assistantMessage],
      }));
      setInput("");

      if (inputRef.current) {
        inputRef.current.style.height = "40px";
      }

      setIsStreaming(true);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scenario, history: historyForApi, message: trimmed }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();

        if (!reader) {
          throw new Error("Empty response body");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            const dataLine = part.split("\n").find((line) => line.startsWith("data: "));
            if (!dataLine) continue;

            try {
              const event = JSON.parse(dataLine.slice(6)) as { text?: string };

              if (!event.text) {
                continue;
              }

              setHistoryById((prev) => {
                const nextMessages = [...(prev[scenario.id] ?? [])];
                const last = nextMessages[nextMessages.length - 1];

                if (last?.role === "model") {
                  nextMessages[nextMessages.length - 1] = {
                    ...last,
                    content: last.content + event.text,
                  };
                }

                return {
                  ...prev,
                  [scenario.id]: nextMessages,
                };
              });
            } catch {
              // Ignore malformed SSE chunks.
            }
          }
        }
      } catch (error) {
        setHistoryById((prev) => {
          const nextMessages = [...(prev[scenario.id] ?? [])];
          const last = nextMessages[nextMessages.length - 1];

          if (last?.role === "model") {
            nextMessages[nextMessages.length - 1] = {
              ...last,
              content: `Error: ${error instanceof Error ? error.message : "Failed to get response"}`,
            };
          }

          return {
            ...prev,
            [scenario.id]: nextMessages,
          };
        });
      } finally {
        setIsStreaming(false);
      }
    },
    [historyById, isStreaming, scenario]
  );

  const clearHistory = useCallback(() => {
    if (!scenario) {
      return;
    }

    setHistoryById((prev) => ({
      ...prev,
      [scenario.id]: [],
    }));
  }, [scenario]);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(input);
    }
  };

  const handleInput = (event: ReactFormEvent<HTMLTextAreaElement>) => {
    const element = event.currentTarget;
    element.style.height = "40px";
    element.style.height = `${Math.min(element.scrollHeight, 128)}px`;
  };

  return (
    <>
      <div
        className={clsx(
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={clsx(
          "fixed right-0 top-0 z-50 flex h-full w-full max-w-[520px] flex-col min-h-0",
          "border-l border-surface-700 bg-surface-900 shadow-2xl",
          "transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
        aria-label="Review and decide panel"
      >
        <div className="flex-shrink-0 border-b border-surface-700 bg-surface-900/95 backdrop-blur-sm">
          <div className="flex items-start gap-3 px-5 py-4">
            <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/10">
              <MessageSquare className="h-4 w-4 text-cyan-400" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-400">
                Review & Decide
              </p>
              <h2 className="line-clamp-2 text-sm font-semibold leading-snug text-white">
                {scenario?.title ?? "Select a scenario"}
              </h2>
              {scenario && (
                <div className="mt-1.5 flex items-center gap-2">
                  <SeverityBadge severity={scenario.severity} size="sm" />
                  <span className="font-mono text-xs text-slate-500">{scenario.mitreId}</span>
                  <span className="text-xs text-slate-700">|</span>
                  <span className="text-xs text-slate-500">{scenario.mitreTactic}</span>
                  <span className="rounded border border-surface-700 px-1.5 py-px text-[10px] font-medium text-slate-500">
                    {formatRiskScore(scenario.riskScore)}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-shrink-0 items-center gap-1">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={clearHistory}
                  title="Clear conversation"
                  className="rounded-lg p-1.5 text-slate-600 transition-colors hover:bg-surface-700 hover:text-slate-400"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-surface-700 hover:text-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {scenario && scenario.attackChain.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 pb-3.5">
              {scenario.attackChain.slice(0, 4).map((step, index) => (
                <div key={`${step}-${index}`} className="flex items-center gap-1">
                  <span className="max-w-[130px] rounded border border-red-500/20 bg-red-500/8 px-2 py-0.5 font-mono text-[10px] text-red-400">
                    {step}
                  </span>
                  {index < Math.min(scenario.attackChain.length, 4) - 1 && (
                    <ChevronRight className="h-3 w-3 flex-shrink-0 text-orange-500/40" />
                  )}
                </div>
              ))}
              {scenario.attackChain.length > 4 && (
                <span className="ml-1 text-[10px] text-slate-600">+{scenario.attackChain.length - 4} more</span>
              )}
            </div>
          )}

          {scenario && (
            <>
              <div className="border-t border-surface-700/60 pb-3.5 pt-3">
                <div className="mb-2 flex items-center gap-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                    Confidence
                  </span>
                  <div className="flex items-center gap-1 rounded-md px-1 py-0.5">
                    <div className="h-1 w-16 overflow-hidden rounded-full bg-surface-700">
                      <div
                        className="h-full rounded-full bg-cyan-500/70 transition-all duration-300"
                        style={{ width: `${((scenario.confidence ?? 0.5) * 100).toFixed(0)}%` }}
                      />
                    </div>
                    <span className="font-mono text-[10px] text-slate-400">
                      {((scenario.confidence ?? 0.5) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <span className="text-xs text-slate-700">|</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                    Owner
                  </span>
                  <span className="rounded border border-surface-600 px-1.5 py-px text-[10px] font-medium text-slate-400">
                    {scenario.ownerRole}
                  </span>
                </div>

                {latestDecisionEvent && (
                  <p className="mb-2 text-[10px] text-slate-500">
                    Last decision: {latestDecisionEvent.from} -&gt; {latestDecisionEvent.to} ({latestDecisionEvent.at})
                  </p>
                )}

                {(scenario.assumptions ?? []).length > 0 && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setAssumptionsOpen((value) => !value)}
                      className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600 transition-colors hover:text-slate-400"
                    >
                      <ChevronRight
                        className={clsx("h-3 w-3 transition-transform duration-150", assumptionsOpen && "rotate-90")}
                      />
                      Assumptions ({(scenario.assumptions ?? []).length})
                    </button>
                    {assumptionsOpen && (
                      <ul className="mt-1.5 space-y-1">
                        {(scenario.assumptions ?? []).slice(0, 3).map((assumption, index) => (
                          <li key={`${assumption}-${index}`} className="flex items-start gap-1.5">
                            <span className="mt-1 flex-shrink-0 leading-none text-slate-700">*</span>
                            <span className="text-[11px] leading-snug text-slate-500">{assumption}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {(scenario.evidence ?? []).length > 0 && (
                  <div className="mt-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                      Evidence
                    </span>
                    <span className="text-[10px] text-slate-600">
                      ({(scenario.evidence ?? []).length} total, showing latest 2)
                    </span>
                    <ul className="mt-1.5 space-y-1">
                      {(scenario.evidence ?? []).slice(-2).map((item, index) => (
                        <li key={`${item}-${index}`} className="flex items-start gap-1.5">
                          <span className="mt-1 flex-shrink-0 leading-none text-cyan-700/60">*</span>
                          <span className="font-mono text-[11px] leading-snug text-slate-500">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </>
          )}

          {messages.length === 0 ? (
            <div className="space-y-5">
              <div className="pb-2 pt-4 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-surface-700 bg-surface-800">
                  <Zap className="h-5 w-5 text-cyan-400" />
                </div>
                <p className="mb-1 text-sm font-medium text-slate-300">Ask anything about this scenario</p>
                <p className="mx-auto max-w-[280px] text-xs leading-relaxed text-slate-600">
                  Gemini has full context of the attack chain, MITRE tactic, and business impact.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                  Suggested questions
                </p>
                {SUGGESTED.map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => void sendMessage(question)}
                    className="w-full rounded-xl border border-surface-700 bg-surface-800/60 px-3.5 py-2.5 text-left text-sm leading-snug text-slate-300 transition-all duration-150 hover:border-surface-600 hover:bg-surface-700"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={clsx("flex gap-2.5", message.role === "user" ? "justify-end" : "justify-start")}
                >
                  {message.role === "model" && (
                    <div className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-cyan-500/20 bg-cyan-500/10">
                      <Zap className="h-3 w-3 text-cyan-400" />
                    </div>
                  )}
                  <div
                    className={clsx(
                      "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm",
                      message.role === "user"
                        ? "rounded-tr-sm border border-cyan-500/20 bg-cyan-500/12 text-white"
                        : "rounded-tl-sm border border-surface-700 bg-surface-800"
                    )}
                  >
                    {message.role === "model" && message.content === "" ? (
                      <TypingIndicator />
                    ) : message.role === "user" ? (
                      <p className="leading-relaxed">{message.content}</p>
                    ) : (
                      <MessageContent content={message.content} />
                    )}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {messages.length > 0 && !isStreaming && (
          <div className="flex flex-shrink-0 gap-2 overflow-x-auto px-5 pb-2">
            {SUGGESTED.slice(0, 2).map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => void sendMessage(question)}
                className="flex-shrink-0 whitespace-nowrap rounded-full border border-surface-700 bg-surface-800 px-3 py-1.5 text-[11px] text-slate-400 transition-all hover:border-surface-600 hover:bg-surface-700 hover:text-slate-300"
              >
                {question}
              </button>
            ))}
          </div>
        )}

        <div className="flex-shrink-0 border-t border-surface-700 px-4 pb-4 pt-3">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              onInput={handleInput}
              placeholder="Ask about this scenario..."
              rows={1}
              disabled={isStreaming || !scenario}
              className="flex-1 resize-none overflow-hidden rounded-xl border border-surface-700 bg-surface-800 px-3.5 py-2.5 text-sm text-white placeholder-slate-600 transition-all focus:border-cyan-500/40 focus:outline-none focus:ring-1 focus:ring-cyan-500/15 disabled:opacity-40"
              style={{ minHeight: "40px", maxHeight: "128px" }}
            />
            <button
              type="button"
              onClick={() => void sendMessage(input)}
              disabled={!input.trim() || isStreaming || !scenario}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20 transition-all hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 text-center text-[10px] text-slate-700">Enter to send | Shift+Enter for new line</p>
        </div>
      </div>
    </>
  );
}
