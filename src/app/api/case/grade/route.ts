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

function buildStepContext(p: any, step: number) {
  const s = Math.max(1, Math.floor(step || 1));
  if (s <= 1) {
    return {
      visible: [
        `Age ${p.age}`,
        `Sex ${p.sex}`,
        `BMI ${p.bmi}`,
        `On metformin=${p.baseline.onMetformin}`
      ],
      hidden: ["A1C", "eGFR", "Cost", "ASCVD", "HF", "CKD"]
    };
  }
  if (s === 2) {
    return {
      visible: [
        `Age ${p.age}`,
        `Sex ${p.sex}`,
        `BMI ${p.bmi}`,
        `A1C ${p.a1c}`,
        `On metformin=${p.baseline.onMetformin}`
      ],
      hidden: ["eGFR", "Cost", "ASCVD", "HF", "CKD"]
    };
  }
  return {
    visible: [
      `Age ${p.age}`,
      `Sex ${p.sex}`,
      `BMI ${p.bmi}`,
      `A1C ${p.a1c}`,
      `eGFR ${p.egfr}`,
      `Cost ${p.cost}`,
      `On metformin=${p.baseline.onMetformin}`
    ],
    hidden: ["ASCVD", "HF", "CKD"] as string[]
  };
}

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
    const expectedStep = Number(session.step ?? 1);
    const requestedStep = Number(body.step ?? expectedStep);
    if (requestedStep !== expectedStep) {
      return NextResponse.json(
        { error: `Step mismatch: expected ${expectedStep}, got ${requestedStep}` },
        { status: 409 }
      );
    }

    const p = session.profile;
    const stepContext = buildStepContext(p, requestedStep);

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
- Interleaving: compare options across released markers only

Patient truth data:
${stepContext.visible.map((v) => `- ${v}`).join("\n")}

Hidden at this step (do NOT use in reasoning or feedback):
${stepContext.hidden.length ? stepContext.hidden.map((h) => `- ${h}`).join("\n") : "- (none)"}

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
- Never reference hidden markers, hidden values, or conclusions that require hidden markers.
- Do not infer, assume, or mention comorbidity status unless explicitly visible.
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

    // Retry to absorb transient model/JSON-shape failures.
    for (let attempt = 1; attempt <= 3; attempt++) {
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
        if (attempt === 3) throw err;
      }
    }

    if (!parsed) {
      throw lastErr instanceof Error ? lastErr : new Error("Failed to parse grade response");
    }
    session.step = Math.min(expectedStep + 1, Number(session.totalSteps ?? 5));
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
