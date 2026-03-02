import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest } from "next/server";
import type { AttackScenario } from "@/types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface ChatRequestBody {
  scenario: Omit<AttackScenario, "status">;
  history: { role: "user" | "model"; content: string }[];
  message: string;
}

function buildSystemPrompt(scenario: Omit<AttackScenario, "status">): string {
  return `You are a senior penetration tester and red team lead conducting a deep-dive analysis of a specific attack scenario for a fintech application.

You have deep expertise in offensive security, threat modeling, MITRE ATT&CK, and defensive architecture. You are direct, technical, and specific — never generic.

## Scenario Under Analysis

**Title:** ${scenario.title}
**Severity:** ${scenario.severity}
**MITRE:** ${scenario.mitreId} — ${scenario.mitreTactic}

**Attack Vector:**
${scenario.attackVector}

**Description:**
${scenario.description}

**Attack Chain:**
${scenario.attackChain.map((step, i) => `${i + 1}. ${step}`).join("\n")}

**Estimated Business Impact:**
${scenario.estimatedImpact}

**Current Defense Playbook:**
${scenario.defensePlaybook.map((step, i) => `${i + 1}. ${step}`).join("\n")}

## Response Guidelines

- Answer ONLY in the context of this specific scenario — never give generic advice
- Reference exact components from the attack vector and chain when relevant
- Use bullet points for lists, be concise but thorough
- When discussing fixes, order by impact-to-effort ratio
- When discussing detection, name specific log sources, SIEM rules, or monitoring tools
- Bold key terms and risk indicators using **markdown**
- Keep responses under 400 words unless depth is explicitly needed`;
}

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequestBody = await req.json();
    const { scenario, history, message } = body;

    if (!message?.trim()) {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: buildSystemPrompt(scenario),
    });

    const chat = model.startChat({
      history: history.map((m) => ({
        role: m.role,
        parts: [{ text: m.content }],
      })),
    });

    const result = await chat.sendMessageStream(message.trim());

    const encoder = new TextEncoder();
    const stream = new TransformStream<Uint8Array, Uint8Array>();
    const writer = stream.writable.getWriter();

    (async () => {
      try {
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            await writer.write(
              encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
            );
          }
        }
        await writer.write(
          encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`)
        );
      } catch (err) {
        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({ error: err instanceof Error ? err.message : "Stream error" })}\n\n`
          )
        );
      } finally {
        await writer.close();
      }
    })();

    return new Response(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
