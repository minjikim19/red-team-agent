import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest } from "next/server";
import type { Severity } from "@/types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// ─── Types ────────────────────────────────────────────────────────────────────

interface RawScenario {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  mitreId: string;
  mitreTactic: string;
  attackVector: string;
  attackChain: string[];
  playbook: string[];
  businessImpact: string;
}

type SSEEvent =
  | { type: "agent_start" }
  | { type: "tool_call"; tool: string; callId: string; label: string; summary: string }
  | { type: "tool_result"; callId: string; summary: string }
  | { type: "complete"; scenarios: object[] }
  | { type: "error"; message: string };

// ─── Prompt ───────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a senior penetration tester and red team lead specializing in fintech security assessments.

Analyze the provided system architecture and generate exactly 6 realistic, high-impact attack scenarios specific to that system.

Return ONLY a valid JSON array — no markdown, no code fences, no explanation. The array must contain exactly 6 objects with this exact structure:

[
  {
    "id": "scn-001",
    "title": "Short specific attack title (max 60 chars)",
    "description": "3-4 sentence description of how the attack unfolds, what is compromised, and why this specific system is vulnerable",
    "severity": "Critical",
    "mitreId": "T1190",
    "mitreTactic": "Initial Access",
    "attackVector": "Specific entry point and exploitation technique (1-2 sentences referencing actual system components)",
    "attackChain": [
      "Step 1: Initial foothold description",
      "Step 2: Lateral movement or escalation",
      "Step 3: Objective achieved"
    ],
    "playbook": [
      "Specific actionable defense step 1",
      "Specific actionable defense step 2",
      "Specific actionable defense step 3",
      "Specific actionable defense step 4",
      "Specific actionable defense step 5"
    ],
    "businessImpact": "Specific business and regulatory impact with dollar amounts or user counts where relevant"
  }
]

Severity must be exactly one of: Critical, High, Medium, Low
Cover a mix of: external attackers, compromised third-party integrations, and malicious insiders.
Reference actual service names, protocols, and data flows from the architecture — do not write generic descriptions.`;

// ─── JSON parsing ─────────────────────────────────────────────────────────────

function parseScenarios(raw: string): RawScenario[] {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("No JSON array found in Gemini response");
    parsed = JSON.parse(match[0]);
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Gemini returned an empty or non-array response");
  }

  return parsed as RawScenario[];
}

// ─── Agent loop ───────────────────────────────────────────────────────────────

async function runAgentLoop(
  architecture: string,
  send: (event: SSEEvent) => Promise<void>
) {
  await send({ type: "agent_start" });

  // Phase 1 — surface analysis (UI feedback before the Gemini call)
  const analyzeId = "analyze-0";
  await send({
    type: "tool_call",
    tool: "analyze_attack_surface",
    callId: analyzeId,
    label: "Analyze Attack Surface",
    summary: "Scanning architecture for entry points and trust boundaries...",
  });

  // Phase 2 — scenario generation (UI feedback, Gemini call starts here)
  const generateId = "generate-0";
  await send({
    type: "tool_call",
    tool: "generate_scenarios",
    callId: generateId,
    label: "Generate Scenarios",
    summary: "Prompting Gemini for 6 tailored attack scenarios...",
  });

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: SYSTEM_PROMPT,
  });

  const result = await model.generateContent(
    `Generate 6 attack scenarios for this fintech system architecture:\n\n${architecture}`
  );

  const rawText = result.response.text();
  console.log("[Agent] Raw Gemini response (first 500 chars):", rawText.slice(0, 500));

  const rawScenarios = parseScenarios(rawText);
  console.log("[Agent] Parsed", rawScenarios.length, "scenarios");

  // Resolve phase 1 + 2 now that we have data
  await send({
    type: "tool_result",
    callId: analyzeId,
    summary: `Architecture mapped — ${rawScenarios.length} attack surfaces identified`,
  });

  await send({
    type: "tool_result",
    callId: generateId,
    summary: `${rawScenarios.length} scenarios generated`,
  });

  // Phase 3 — attack chain events (one per scenario)
  for (const s of rawScenarios) {
    const chainId = `chain-${s.id}`;
    await send({
      type: "tool_call",
      tool: "create_attack_chain",
      callId: chainId,
      label: "Build Attack Chain",
      summary: `Mapping chain: "${s.title}"`,
    });
    await send({
      type: "tool_result",
      callId: chainId,
      summary: `${s.severity} severity · ${s.attackChain.length} steps`,
    });
  }

  // Phase 4 — playbook events (one per scenario)
  for (const s of rawScenarios) {
    const playbookId = `playbook-${s.id}`;
    await send({
      type: "tool_call",
      tool: "generate_playbook",
      callId: playbookId,
      label: "Draft Defense Playbook",
      summary: `Writing playbook: "${s.title}"`,
    });
    await send({
      type: "tool_result",
      callId: playbookId,
      summary: `${s.playbook.length} defense steps drafted`,
    });
  }

  // Map RawScenario → AttackScenario shape expected by the frontend
  const scenarios = rawScenarios.map((s) => ({
    id: s.id,
    title: s.title,
    attackVector: s.attackVector,
    severity: s.severity,
    description: s.description,
    mitreTactic: s.mitreTactic,
    mitreId: s.mitreId,
    estimatedImpact: s.businessImpact,
    attackChain: s.attackChain ?? [],
    defensePlaybook: s.playbook,
  }));

  await send({ type: "complete", scenarios });
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { architecture } = body as { architecture: string };

    if (!architecture || architecture.trim().length < 50) {
      return new Response(
        JSON.stringify({ error: "Architecture description must be at least 50 characters." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const encoder = new TextEncoder();
    const stream = new TransformStream<Uint8Array, Uint8Array>();
    const writer = stream.writable.getWriter();

    const send = async (event: SSEEvent) => {
      await writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
    };

    // Run the agent in the background — do not await
    (async () => {
      try {
        await runAgentLoop(architecture.trim(), send);
      } catch (err) {
        console.error("[Agent] Error:", err);
        await send({
          type: "error",
          message: err instanceof Error ? err.message : "Unknown error occurred",
        });
      } finally {
        await writer.close();
      }
    })();

    return new Response(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "Failed to start agent",
        details: err instanceof Error ? err.message : "",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
