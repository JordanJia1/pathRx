import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { memory } from "@/lib/session/memory";

type Payload = {
  sessionId: string;
  step: number;
  decision: {
    medicationClass: string;
    specificDrug?: string;
    justification: string;
  };
};

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY in .env.local" },
        { status: 500 }
      );
    }

    const body = (await req.json()) as Payload;
    const session = memory.get(body.sessionId);
    if (!session) {
      return NextResponse.json({ error: "Unknown session" }, { status: 404 });
    }

    const p = session.profile;

    const evidence = (session.evidence ?? [])
      .slice(0, 6)
      .map((c: any, i: number) => `[#${i + 1} ${c.title}] ${c.chunk}`)
      .join("\n\n");

    const input = `
You are an expert diabetes pharmacotherapy educator.

GOAL:
Provide concise, high-yield expert feedback comparing learner answer vs guideline-aligned reasoning.
Minimize cognitive load: short bullets, no paragraphs.

Learning theory:
- Script theory: cue → pattern → action
- Interleaving: mention how comorbidities change choice

Patient truth data:
- Age ${p.age}
- Sex ${p.sex}
- BMI ${p.bmi}
- A1C ${p.a1c}
- eGFR ${p.egfr}
- Cost ${p.cost}
- ASCVD=${p.comorbidities.ascvd}
- HF=${p.comorbidities.hf}
- CKD=${p.comorbidities.ckd}
- On metformin=${p.baseline.onMetformin}

Learner decision:
- Class: ${body.decision.medicationClass}
- Drug: ${body.decision.specificDrug ?? "(none)"}
- Justification:
${body.decision.justification}

Guideline evidence:
${evidence || "(none)"}

Return STRICT JSON.

Rules:
- expert.specificDrug MUST always be present.
  If you don’t want to name a drug, set it to "none".
- expert.bullets: 3–6 bullets, each <= 18 words.
`;

    const format = {
      type: "json_schema",
      name: "GradeStep1",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          expert: {
            type: "object",
            additionalProperties: false,
            properties: {
              medicationClass: { type: "string" },
              specificDrug: { type: "string" }, // always present (can be "none")
              bullets: {
                type: "array",
                items: { type: "string" },
                minItems: 3,
                maxItems: 6
              }
            },
            required: ["medicationClass", "specificDrug", "bullets"]
          },
          takeaways: {
            type: "array",
            items: { type: "string" },
            minItems: 2,
            maxItems: 5
          },
          rubric: {
            type: "array",
            minItems: 3,
            maxItems: 5,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                label: { type: "string" },
                verdict: { type: "string", enum: ["met", "partial", "missed"] },
                note: { type: "string" }
              },
              required: ["label", "verdict", "note"]
            }
          }
        },
        required: ["expert", "takeaways", "rubric"]
      }
    } as const;

    let parsed: any = null;
    let lastErr: unknown = null;

    // Retry once to absorb transient model/JSON-shape failures.
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const resp = await openai.responses.create({
          model: "gpt-4.1-mini",
          input,
          text: { format }
        });

        parsed = JSON.parse(resp.output_text);
        break;
      } catch (err) {
        lastErr = err;
        if (attempt === 2) throw err;
      }
    }

    if (!parsed) {
      throw lastErr instanceof Error ? lastErr : new Error("Failed to parse grade response");
    }
    const current = Number(session.step ?? 1);
    session.step = Math.min(current + 1, Number(session.totalSteps ?? 3));
    memory.set(body.sessionId, session);
    return NextResponse.json(parsed);

  } catch (e: any) {
    console.error("case/grade error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Unknown error in /api/case/grade" },
      { status: 500 }
    );
  }
}
