import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { memory } from "@/lib/session/memory";
import { searchDataset } from "@/lib/dataset/search";

type Profile = {
  difficulty: "easy" | "medium" | "hard";
  age: number;
  sex: "male" | "female";
  bmi: number;
  a1c: number;
  egfr: number;
  cost: "low" | "medium" | "high";
  comorbidities: { ascvd: boolean; hf: boolean; ckd: boolean };
  baseline: { onMetformin: boolean };
};

type RagChunk = { id: string; title: string; chunk: string; score?: number };

function newSessionId() {
  return Math.random().toString(36).slice(2, 10);
}

async function retrieve(profile: Profile): Promise<RagChunk[]> {
  const q = [
    "type 2 diabetes pharmacologic therapy",
    profile.baseline.onMetformin ? "metformin add-on" : "initial therapy",
    profile.comorbidities.ascvd ? "ASCVD" : "",
    profile.comorbidities.hf ? "heart failure" : "",
    profile.comorbidities.ckd ? "CKD albuminuria eGFR" : "",
    `A1C ${profile.a1c}`,
    `eGFR ${profile.egfr}`,
    `cost ${profile.cost}`
  ]
    .filter(Boolean)
    .join(" ");

  return await searchDataset(q, 6);
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY in .env.local" }, { status: 500 });
    }

    const profile = (await req.json()) as Profile;
    const sessionId = newSessionId();

    const chunks = await retrieve(profile);
    const evidence = chunks
      .slice(0, 6)
      .map((c, i) => `[#${i + 1} ${c.title}] ${c.chunk}`)
      .join("\n\n");

    const input = `
You are generating Step 1 of an adaptive clinical case for T2DM pharmacotherapy.

Hard constraints:
- Minimize cognitive load.
- Use bullets only (no paragraphs).
- Do NOT invent labs or history not provided.
- Ground choices in evidence snippets.

Patient truth data:
- Age: ${profile.age}
- Sex: ${profile.sex}
- BMI: ${profile.bmi}
- A1C: ${profile.a1c}
- eGFR: ${profile.egfr}
- Cost: ${profile.cost}
- Comorbidities: ASCVD=${profile.comorbidities.ascvd}, HF=${profile.comorbidities.hf}, CKD=${profile.comorbidities.ckd}
- On metformin: ${profile.baseline.onMetformin}

Guideline evidence snippets:
${evidence || "(none)"}

Return strict JSON:
- title: short title
- bullets: 3–6 bullets, each <= 18 words
- tags: 2–6 short tags
- stepPrompt: one sentence question (choose next medication class)
- patientVisualHints: 2–5 short script cues (Cue → Pattern)
`;

    const format = {
      type: "json_schema",
      name: "CaseStep1",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          bullets: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 6 },
          tags: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 6 },
          stepPrompt: { type: "string" },
          patientVisualHints: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 }
        },
        required: ["title", "bullets", "tags", "stepPrompt", "patientVisualHints"]
      }
    } as const;

    const resp = await openai.responses.create({
      model: "gpt-4.1-mini",
      input,
      text: { format }
    });

    const parsed = JSON.parse(resp.output_text);

    memory.set(sessionId, {
      profile,
      step: 1,
      totalSteps: 5,
      step1: parsed,
      evidence: chunks
    });

    return NextResponse.json({ sessionId });
  } catch (e: any) {
    console.error("case/generate error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Unknown error in /api/case/generate" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");
  if (!sessionId || !memory.has(sessionId)) {
    return NextResponse.json({ error: "Unknown session" }, { status: 404 });
  }

  const s = memory.get(sessionId) as any;
  const p = s.profile as Profile;

  return NextResponse.json({
    sessionId,
    step: s.step,
    totalSteps: s.totalSteps,
    patient: {
      age: p.age,
      sex: p.sex,
      bmi: p.bmi,
      a1c: p.a1c,
      egfr: p.egfr,
      cost: p.cost,
      onMetformin: p.baseline.onMetformin,
      risk: { ...p.comorbidities }
    },
    summary: {
      title: s.step1.title,
      bullets: s.step1.bullets,
      tags: s.step1.tags,
      stepPrompt: s.step1.stepPrompt
    }
  });
}
