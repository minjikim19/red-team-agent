import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest } from "next/server";
import { z } from "zod";
import type { Severity, OwnerRole, RiskLevel } from "@/types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

function coerceStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String).map((s) => s.trim()).filter(Boolean);

  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return [];

    // 1) "a\nb\nc"
    // 2) "1. a\n2. b"
    // 3) "a, b, c"
    const lines = s
      .split(/\r?\n|,/)
      .map((x) => x.replace(/^\s*[-*]\s+/, ""))          // bullets
      .map((x) => x.replace(/^\s*\d+[\).\]]\s+/, ""))   // 1. / 1) / 1]
      .map((x) => x.trim())
      .filter(Boolean);

    return lines.length ? lines : [s];
  }

  return [];
}

// ─────────────────────────────────────────────────────────────
// Zod schema
// ─────────────────────────────────────────────────────────────

const OWNER_ROLES = ["Security", "Platform", "Compliance", "Product", "Data", "Unknown"] as const;
const RISK_LEVELS = ["Low", "Medium", "High"] as const;

const RiskSurfaceSchema = z.object({
  assets: z.array(z.string()).default([]),
  trustBoundaries: z.array(z.string()).default([]),
  entryPoints: z.array(z.string()).default([]),
  controlsPresent: z.array(z.string()).default([]),
  unknowns: z.array(z.string()).default([]),
});

const RawScenarioSchema = z.object({
  id: z.preprocess((v) => {
    if (typeof v === "string") return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
    return v;
  }, z.string().min(1)),
  title: z.string(),
  description: z.string(),
  severity: z.enum(["Critical", "High", "Medium", "Low"]),
  mitreId: z.string(),
  mitreTactic: z.string(),
  attackVector: z.string(),
  attackChain: z.preprocess(coerceStringArray, z.array(z.string())).default([]),
  playbook: z.preprocess(coerceStringArray, z.array(z.string())).default([]),
  businessImpact: z.string(),
  assumptions: z.preprocess(coerceStringArray, z.array(z.string())).default([]),
  evidence: z.preprocess(coerceStringArray, z.array(z.string())).default([]),
  // Accept numeric strings ("0.78") in addition to numbers
  confidence: z.preprocess(
    (v) => {
      if (v === undefined || v === null) return undefined;
      if (typeof v === "number") return v;
      if (typeof v === "string") { const n = parseFloat(v); return isNaN(n) ? undefined : n; }
      return undefined;
    },
    z.number().min(0).max(1).optional()
  ),
  controlGaps: z.preprocess(coerceStringArray, z.array(z.string())).default([]),
  // Strict enum; invalid values default to "Unknown" only when field is absent
  ownerRole: z.preprocess(
    (v) => (typeof v === "string" && OWNER_ROLES.includes(v as any) ? v : "Unknown"),
    z.enum(OWNER_ROLES)
  ),
  likelihood: z.enum(RISK_LEVELS).optional(),
  impact: z.enum(RISK_LEVELS).optional(),
  riskScore: z.preprocess(
    (v) => {
      if (v === undefined || v === null) return undefined;
      if (typeof v === "number") return v;
      if (typeof v === "string") { const n = parseFloat(v); return isNaN(n) ? undefined : n; }
      return undefined;
    },
    z.number().min(1).max(9).optional()
  ),
});

// Array-level validations: exactly 6 items, all IDs unique
const RawScenarioArraySchema = z.array(RawScenarioSchema)
  .superRefine((arr, ctx) => {
    if (arr.length !== 6) {
      ctx.addIssue({
        code: "custom",
        message: `Expected exactly 6 scenarios, got ${arr.length}`,
      });
      return;
    }
    const ids = arr.map((s) => s.id);
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const id of ids) {
      if (seen.has(id)) {
        dupes.push(id);
      } else {
        seen.add(id);
      }
    }
    if (dupes.length > 0) {
      ctx.addIssue({
        code: "custom",
        message: `Duplicate scenario IDs: ${dupes.join(", ")}`,
      });
    }
  });

type RawScenario = z.infer<typeof RawScenarioSchema>;
type RiskSurface = z.infer<typeof RiskSurfaceSchema>;

type SSEEvent =
  | { type: "agent_start" }
  | { type: "tool_call"; tool: string; callId: string; label: string; summary: string }
  | { type: "tool_result"; callId: string; summary: string }
  | { type: "complete"; scenarios: object[] }
  | { type: "error"; message: string };

const MOCK_SCENARIOS_FALLBACK: RawScenario[] = [
  {
    id: "scn-fallback-001",
    title: "Customer API session control drift",
    description: "Customer-facing API requests may be processed with weak session boundaries when token lifecycle settings are unclear. This can increase exposure to unauthorized account actions if monitoring does not flag abnormal session reuse. The risk is elevated in fintech flows because customer actions map directly to funds movement and sensitive data access.",
    severity: "High",
    mitreId: "T1078",
    mitreTactic: "Valid Accounts",
    attackVector: "Customer API traffic relies on identity controls that may not fully enforce session revocation and token hygiene.",
    attackChain: [
      "Identity context is reused across customer requests",
      "Weak session controls allow extended access windows",
      "Sensitive account actions occur without timely challenge"
    ],
    playbook: [
      "Review token issuance and revocation settings",
      "Monitor repeated session reuse across devices",
      "Add alerts for abnormal account action patterns"
    ],
    businessImpact: "Unauthorized customer actions could trigger fraud losses, support workload, and regulatory scrutiny.",
    assumptions: [
      "Session revocation behavior is not fully documented",
      "Customer API handles sensitive account operations"
    ],
    evidence: [
      "Architecture references customer-facing API services",
      "Authentication control details are incomplete"
    ],
    confidence: 0.62,
    controlGaps: [
      "Session revocation policy not explicit",
      "Behavioral monitoring coverage not confirmed"
    ],
    ownerRole: "Security",
    likelihood: "Medium",
    impact: "High",
    riskScore: 6,
  },
  {
    id: "scn-fallback-002",
    title: "Payment workflow trust boundary mismatch",
    description: "Payment processing components may cross trust boundaries without enough verification between internal and external transaction states. When boundary validation is weak, inconsistent payment status or unauthorized transaction progression can occur. This creates both operational and financial risk in a regulated payment environment.",
    severity: "Critical",
    mitreId: "T1199",
    mitreTactic: "Trusted Relationship",
    attackVector: "Payment workflow dependencies span multiple services and trust boundaries that may not uniformly enforce validation.",
    attackChain: [
      "Transaction data crosses service boundaries",
      "Validation inconsistencies propagate downstream",
      "Incorrect payment state is accepted by dependent systems"
    ],
    playbook: [
      "Enforce signed state transitions between services",
      "Add reconciliation checks on payment state changes",
      "Alert on mismatched transaction confirmations"
    ],
    businessImpact: "Payment integrity issues could drive direct financial loss, reconciliation errors, and customer trust damage.",
    assumptions: [
      "Cross-service payment validation is not fully specified",
      "Multiple systems influence transaction state"
    ],
    evidence: [
      "Architecture describes payment-related processing flows",
      "Trust boundaries are material to transaction handling"
    ],
    confidence: 0.71,
    controlGaps: [
      "Inter-service verification requirements not explicit",
      "Reconciliation guardrails may be incomplete"
    ],
    ownerRole: "Platform",
    likelihood: "High",
    impact: "High",
    riskScore: 9,
  },
  {
    id: "scn-fallback-003",
    title: "Third-party integration overreach",
    description: "A connected vendor integration may retain broader access than required for its business purpose. If permissions and monitoring are not tightly scoped, a compromised partner path can affect customer or transaction data. This is a common concentration risk in modern fintech service ecosystems.",
    severity: "High",
    mitreId: "T1195",
    mitreTactic: "Supply Chain Compromise",
    attackVector: "Third-party integrations may hold persistent access into core business workflows without clearly bounded privileges.",
    attackChain: [
      "Vendor connection maintains ongoing trusted access",
      "Overbroad permissions expose sensitive workflows",
      "Partner-origin activity reaches regulated data paths"
    ],
    playbook: [
      "Review partner permissions against least privilege",
      "Limit access to narrowly scoped service accounts",
      "Monitor vendor-origin requests for anomalies"
    ],
    businessImpact: "Vendor overreach can expose regulated data, create incident response overhead, and trigger third-party risk findings.",
    assumptions: [
      "At least one external integration is connected to core workflows"
    ],
    evidence: [
      "Architecture includes third-party integrations",
      "Connected services participate in business-critical flows"
    ],
    confidence: 0.67,
    controlGaps: [
      "Least-privilege reviews may be inconsistent",
      "Vendor telemetry coverage may be incomplete"
    ],
    ownerRole: "Compliance",
    likelihood: "Medium",
    impact: "High",
    riskScore: 6,
  },
  {
    id: "scn-fallback-004",
    title: "Internal access scope creep",
    description: "Operational or support users may accumulate access beyond current job needs as systems evolve. Without regular recertification and activity review, internal access can expand into sensitive financial or customer operations. The resulting risk is amplified when responsibilities span multiple environments.",
    severity: "Medium",
    mitreId: "T1098",
    mitreTactic: "Account Manipulation",
    attackVector: "Internal roles may keep standing permissions that exceed present operational requirements.",
    attackChain: [
      "Privileges expand over time through operational changes",
      "Recertification gaps leave excess access in place",
      "Sensitive internal actions occur without strong review"
    ],
    playbook: [
      "Run periodic access recertification",
      "Reduce standing privileges for support roles",
      "Alert on unusual privileged internal actions"
    ],
    businessImpact: "Excess internal access can lead to data exposure, control failures, and audit findings.",
    assumptions: [
      "Internal operational roles interact with sensitive systems"
    ],
    evidence: [
      "Architecture implies administrative or support workflows"
    ],
    confidence: 0.54,
    controlGaps: [
      "Access reviews may not be frequent enough",
      "Privileged activity monitoring may be limited"
    ],
    ownerRole: "Product",
    likelihood: "Medium",
    impact: "Medium",
    riskScore: 4,
  },
  {
    id: "scn-fallback-005",
    title: "Sensitive data retention ambiguity",
    description: "Data stores and processing services may retain sensitive financial data longer than intended when retention rules are not explicit. This increases the blast radius of any control failure and can complicate privacy or regulatory obligations. The risk grows when multiple copies of the same data exist across operational systems.",
    severity: "Medium",
    mitreId: "T1537",
    mitreTactic: "Transfer Data to Cloud Account",
    attackVector: "Sensitive data may persist across multiple storage locations without clear lifecycle controls.",
    attackChain: [
      "Sensitive records are retained across systems",
      "Retention ambiguity expands the data footprint",
      "Operational access touches more data than necessary"
    ],
    playbook: [
      "Document retention requirements by data class",
      "Remove redundant copies from nonessential stores",
      "Monitor retention exceptions and backlog"
    ],
    businessImpact: "Retention drift can increase regulatory exposure, breach impact, and remediation costs.",
    assumptions: [
      "Retention policy enforcement is not fully visible",
      "Multiple data stores may hold overlapping records"
    ],
    evidence: [
      "Architecture references data storage and processing layers"
    ],
    confidence: 0.49,
    controlGaps: [
      "Retention enforcement not clearly defined",
      "Data minimization controls may be inconsistent"
    ],
    ownerRole: "Data",
    likelihood: "Medium",
    impact: "Medium",
    riskScore: 4,
  },
  {
    id: "scn-fallback-006",
    title: "Control visibility gap during service change",
    description: "When services change faster than monitoring coverage, material risk indicators may not be visible to responders. This can delay detection of policy drift, abuse, or control failures across production workflows. In a fintech environment, visibility lag increases operational and compliance risk even without a single exploit path.",
    severity: "High",
    mitreId: "T1562",
    mitreTactic: "Impair Defenses",
    attackVector: "Service changes can outpace logging and alert coverage across customer, payment, or data handling paths.",
    attackChain: [
      "Service changes alter control assumptions",
      "Monitoring coverage lags behind new behavior",
      "Risk signals are missed until customer or financial impact appears"
    ],
    playbook: [
      "Tie monitoring review to service release changes",
      "Track coverage for critical control signals",
      "Escalate gaps in detection for high-impact flows"
    ],
    businessImpact: "Delayed detection can increase fraud dwell time, outage impact, and audit exceptions.",
    assumptions: [
      "Monitoring coverage changes are not fully automated"
    ],
    evidence: [
      "Architecture indicates multiple evolving services and controls"
    ],
    confidence: 0.58,
    controlGaps: [
      "Release-to-monitoring linkage may be weak",
      "Coverage metrics may not exist for critical flows"
    ],
    ownerRole: "Unknown",
    likelihood: "High",
    impact: "Medium",
    riskScore: 6,
  },
];

// ─────────────────────────────────────────────────────────────
// Prompt definitions
// ─────────────────────────────────────────────────────────────

const EXTRACTOR_SYSTEM_PROMPT = `You are a security architecture analyst.

Extract a compact risk surface JSON object from the provided architecture text.

Return ONLY a valid JSON object with exactly these keys:
{
  "assets": string[],
  "trustBoundaries": string[],
  "entryPoints": string[],
  "controlsPresent": string[],
  "unknowns": string[]
}

STRICT RULES:
- No markdown, no code fences, no commentary.
- Each list must contain at most 6 short strings.
- Items must reference concrete architecture terms found in the input (service names, data stores, protocols, cloud resources, vendors).
- Do not add generic filler unless explicitly present in the architecture.
- Use empty arrays when the input does not support an item.
- "unknowns" must describe missing but security-relevant specifics (e.g., "Auth token TTL not specified").`;

const SYSTEM_PROMPT = `You are a senior security risk analyst producing a risk register for a fintech application.

You must generate EXACTLY 6 risk scenarios grounded in:
1) The provided architecture
2) The extracted risk surface JSON

Return ONLY a valid JSON array. No markdown. No commentary.

Each scenario MUST include:

- id
- title
- description
- severity (Critical | High | Medium | Low)
- mitreId
- mitreTactic
- attackVector
- attackChain
- playbook
- businessImpact
- assumptions (max 5)
- evidence (max 5, must reference concrete architecture components)
- confidence (0..1)
- controlGaps (max 5 actionable gaps)
- ownerRole (Security | Platform | Compliance | Product | Data | Unknown)
- likelihood (Low | Medium | High)
- impact (Low | Medium | High)
- riskScore (1..9)

SCORING RULES:
- riskScore MUST equal likelihood impact, where Low=1, Medium=2, High=3.
- confidence must be between 0 and 1.
- Higher confidence when evidence is explicit in architecture.
- Lower confidence when assumptions dominate.

SAFETY:
Do NOT provide step-by-step exploit instructions, payloads, or operational hacking guidance.
Focus on risk conditions, detection signals, and mitigation strategies.

CONTENT REQUIREMENTS:
- id must be a unique STRING like "scn-001", not a number.
- attackChain and playbook MUST be JSON arrays of strings, not a single string.
- Evidence must reference specific services, data stores, integrations, or protocols from the architecture or risk surface.
- Cover a mix of:
  - External attacker
  - Compromised third-party integration
  - Malicious insider`;

// ─────────────────────────────────────────────────────────────
// Field normalization helpers
// ─────────────────────────────────────────────────────────────

function trimArr(arr: string[], maxItems: number, maxLen: number): string[] {
  return arr.slice(0, maxItems).map((s) => s.trim().slice(0, maxLen));
}

function normalizeScenarioFields(s: RawScenario): RawScenario {
  return {
    ...s,
    assumptions: trimArr(s.assumptions, 5, 140),
    evidence: trimArr(s.evidence, 5, 140),
    controlGaps: trimArr(s.controlGaps, 5, 140),
    attackChain: trimArr(s.attackChain, 8, 180),
    playbook: trimArr(s.playbook, 8, 180),
  };
}

function trimRiskSurface(surface: RiskSurface): RiskSurface {
  return {
    assets: trimArr(surface.assets, 6, 120),
    trustBoundaries: trimArr(surface.trustBoundaries, 6, 120),
    entryPoints: trimArr(surface.entryPoints, 6, 120),
    controlsPresent: trimArr(surface.controlsPresent, 6, 120),
    unknowns: trimArr(surface.unknowns, 6, 120),
  };
}

// ─────────────────────────────────────────────────────────────
// JSON parsing and schema validation
// ─────────────────────────────────────────────────────────────

function cleanModelText(raw: string): string {
  return raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function extractJsonFragment(cleaned: string, expected: "array" | "object"): string {
  if (expected === "array") {
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("No JSON array found in model response");
    return match[0];
  }

  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON object found in model response");
  return match[0];
}

function parseJsonWithSchema<T>(
  raw: string,
  schema: z.ZodType<T>,
  expected: "array" | "object",
  label: string
): T {
  const cleaned = cleanModelText(raw);

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    parsed = JSON.parse(extractJsonFragment(cleaned, expected));
  }

  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      // keep original; schema will throw with a clear error
    }
  }

  if (expected === "array" && (!Array.isArray(parsed) || parsed.length === 0)) {
    throw new Error(`${label} response was empty or not an array`);
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new Error(
      `${label} validation failed: ${issue.message} (path: ${issue.path.join(".") || "root"})`
    );
  }

  return result.data;
}

function parseScenarios(raw: string): RawScenario[] {
  const parsed = parseJsonWithSchema(raw, RawScenarioArraySchema, "array", "Scenario");
  return parsed.map(normalizeScenarioFields);
}

function parseRiskSurface(raw: string): RiskSurface {
  const parsed = parseJsonWithSchema(raw, RiskSurfaceSchema, "object", "Risk surface");
  return trimRiskSurface(parsed);
}

// ─────────────────────────────────────────────────────────────
// Utility helpers
// ─────────────────────────────────────────────────────────────

const VALID_OWNER_ROLES = new Set<string>(OWNER_ROLES);

function toOwnerRole(raw: string | undefined): OwnerRole {
  if (!raw) return "Unknown";
  if (VALID_OWNER_ROLES.has(raw)) return raw as OwnerRole;
  return "Unknown";
}

function clampConfidence(v: number | undefined): number {
  if (typeof v !== "number" || isNaN(v)) return 0.5;
  return Math.min(1, Math.max(0, v));
}

function toRiskLevel(raw: string | undefined): RiskLevel | undefined {
  if (raw === "Low" || raw === "Medium" || raw === "High") return raw;
  return undefined;
}

function clampRiskScore(v: number | undefined): number | undefined {
  if (typeof v !== "number" || isNaN(v)) return undefined;
  return Math.min(9, Math.max(1, Math.round(v)));
}

function summarizeRiskSurface(surface: RiskSurface): string {
  return [
    `assets=${surface.assets.length}`,
    `boundaries=${surface.trustBoundaries.length}`,
    `entryPoints=${surface.entryPoints.length}`,
    `controls=${surface.controlsPresent.length}`,
    `unknowns=${surface.unknowns.length}`,
  ].join(", ");
}

// ─────────────────────────────────────────────────────────────
// Gemini generation with retry and correction
// ─────────────────────────────────────────────────────────────

async function generateValidatedJsonWithRetry<T>(
  model: ReturnType<typeof genAI.getGenerativeModel>,
  userPrompt: string,
  parseOutput: (raw: string) => T,
  correctionPrompt: string,
  label: string
): Promise<T> {
  let firstRawText: string | undefined;

  try {
    const result = await model.generateContent(userPrompt);
    firstRawText = result.response.text();
    console.log(`[Agent] ${label} raw response (first 500 chars):`, firstRawText.slice(0, 500));
    return parseOutput(firstRawText);
  } catch (firstErr) {
    console.warn(
      `[Agent] ${label} attempt 1 failed:`,
      firstErr instanceof Error ? firstErr.message : firstErr
    );
  }

  if (firstRawText === undefined) {
    const retryResult = await model.generateContent(userPrompt);
    const retryText = retryResult.response.text();
    console.log(`[Agent] ${label} retry raw response (first 500 chars):`, retryText.slice(0, 500));

    try {
      return parseOutput(retryText);
    } catch (retryErr) {
      throw new Error(
        `${label} failed after retry: ${retryErr instanceof Error ? retryErr.message : String(retryErr)}`
      );
    }
  }

  const chat = model.startChat({
    history: [
      { role: "user", parts: [{ text: userPrompt }] },
      { role: "model", parts: [{ text: firstRawText.slice(0, 4000) }] },
    ],
  });
  const corrected = await chat.sendMessage(correctionPrompt);
  const correctedText = corrected.response.text();
  console.log(`[Agent] ${label} correction raw response (first 500 chars):`, correctedText.slice(0, 500));

  try {
    return parseOutput(correctedText);
  } catch (correctionErr) {
    throw new Error(
      `${label} failed after correction: ${correctionErr instanceof Error ? correctionErr.message : String(correctionErr)
      }`
    );
  }
}

async function extractRiskSurface(
  model: ReturnType<typeof genAI.getGenerativeModel>,
  architecture: string
): Promise<RiskSurface> {
  const userPrompt = `Extract the risk surface for this fintech system architecture:\n\n${architecture}`;

  return generateValidatedJsonWithRetry(
    model,
    userPrompt,
    parseRiskSurface,
    "Your previous response was invalid.`nReturn ONLY the corrected JSON object with keys:`nassets, trustBoundaries, entryPoints, controlsPresent, unknowns.`nNo markdown. No extra keys.",
    "Risk surface extraction"
  );
}

async function generateScenariosWithSurface(
  model: ReturnType<typeof genAI.getGenerativeModel>,
  architecture: string,
  surface: RiskSurface
): Promise<RawScenario[]> {
  const userPrompt = [
    "Generate EXACTLY 6 risk scenarios for this fintech system architecture.",
    "",
    "Architecture:",
    architecture,
    "",
    "Extracted risk surface JSON:",
    JSON.stringify(surface, null, 2),
  ].join("\n");

  const SCENARIO_CORRECTION_PROMPT =
    "Your previous response was invalid.\n" +
    "Return ONLY a corrected JSON array of EXACTLY 6 scenario objects.\n" +
    "Each object MUST include ALL required keys including:\n" +
    "assumptions, evidence, confidence, controlGaps, ownerRole, likelihood, impact, riskScore.\n" +
    "No markdown. No commentary.";

  return generateValidatedJsonWithRetry(
    model,
    userPrompt,
    parseScenarios,
    SCENARIO_CORRECTION_PROMPT,
    "Scenario generation"
  );
}

// ─────────────────────────────────────────────────────────────
// Agent execution loop
// ─────────────────────────────────────────────────────────────

async function runAgentLoop(
  architecture: string,
  send: (event: SSEEvent) => Promise<void>
) {
  return runAgentLoopV2(architecture, send);
}

// ─────────────────────────────────────────────────────────────
// API route handler
// ─────────────────────────────────────────────────────────────

async function runAgentLoopV2(
  architecture: string,
  send: (event: SSEEvent) => Promise<void>
) {
  await send({ type: "agent_start" });

  const extractId = "extract-0";
  await send({
    type: "tool_call",
    tool: "extract_risk_surface",
    callId: extractId,
    label: "Extract risk surface",
    summary: "Identifying assets, trust boundaries, entry points, and controls...",
  });

  const extractorModel = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: EXTRACTOR_SYSTEM_PROMPT,
  });

  let surface: RiskSurface = {
    assets: [],
    trustBoundaries: [],
    entryPoints: [],
    controlsPresent: [],
    unknowns: [],
  };

  try {
    surface = await extractRiskSurface(extractorModel, architecture);
    await send({
      type: "tool_result",
      callId: extractId,
      summary: summarizeRiskSurface(surface),
    });
  } catch (err) {
    console.warn("[Agent] Risk surface extraction failed:", err instanceof Error ? err.message : err);
    await send({
      type: "tool_result",
      callId: extractId,
      summary: "Extraction failed, using empty risk surface",
    });
  }

  const generateId = "generate-0";
  await send({
    type: "tool_call",
    tool: "generate_scenarios",
    callId: generateId,
    label: "Generate Risk Register",
    summary: "Drafting 6 architecture-grounded risks with assumptions, evidence, and confidence...",
  });

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: SYSTEM_PROMPT,
  });

  let rawScenarios: RawScenario[];

  try {
    rawScenarios = await generateScenariosWithSurface(model, architecture, surface);
    console.log("[Agent] Parsed", rawScenarios.length, "scenarios");
    await send({
      type: "tool_result",
      callId: generateId,
      summary: `${rawScenarios.length} scenarios generated`,
    });
  } catch (err) {
    console.warn("[Agent] Scenario generation failed:", err instanceof Error ? err.message : err);
    rawScenarios = MOCK_SCENARIOS_FALLBACK;
    console.log("[Agent] Using fallback", rawScenarios.length, "scenarios");
    await send({
      type: "tool_result",
      callId: generateId,
      summary: "Validation failed, using fallback scenarios",
    });
  }

  for (const s of rawScenarios) {
    const chainId = `chain-${s.id}`;
    await send({
      type: "tool_call",
      tool: "create_attack_chain",
      callId: chainId,
      label: "Model Risk Progression",
      summary: `Mapping chain: "${s.title}"`,
    });
    await send({
      type: "tool_result",
      callId: chainId,
      summary: `${s.severity} severity, ${s.attackChain.length} steps`,
    });
  }

  for (const s of rawScenarios) {
    const playbookId = `playbook-${s.id}`;
    await send({
      type: "tool_call",
      tool: "generate_playbook",
      callId: playbookId,
      label: "Draft Mitigations & Detection Plan",
      summary: `Writing playbook: "${s.title}"`,
    });
    await send({
      type: "tool_result",
      callId: playbookId,
      summary: `${s.playbook.length} defense steps drafted`,
    });
  }

  const scenarios = rawScenarios.map((s) => ({
    id: s.id,
    title: s.title,
    attackVector: s.attackVector,
    severity: s.severity as Severity,
    description: s.description,
    mitreTactic: s.mitreTactic,
    mitreId: s.mitreId,
    estimatedImpact: s.businessImpact,
    attackChain: s.attackChain,
    defensePlaybook: s.playbook,
    assumptions: s.assumptions,
    evidence: s.evidence,
    confidence: clampConfidence(s.confidence),
    controlGaps: s.controlGaps,
    ownerRole: toOwnerRole(s.ownerRole),
    likelihood: toRiskLevel(s.likelihood),
    impact: toRiskLevel(s.impact),
    riskScore: clampRiskScore(s.riskScore),
  }));

  await send({ type: "complete", scenarios });
}

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