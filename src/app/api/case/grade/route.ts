import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { memory } from "@/lib/session/memory";
import { searchDataset } from "@/lib/dataset/search";

type Payload = {
  sessionId: string;
  step: number;
  profileContext?: {
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
  decision: {
    medicationClass: string;
    specificDrug?: string;
    justification: string;
  };
};

const CANONICAL_DOCS = [
  "diabetes-canada-2024.pdf",
  "aace-2023-algorithm.pdf",
  "ada-2026-hospital.pdf",
  "ada-2026-pharm.pdf",
  "ada-easd-2022.pdf",
  "ccs-2022-glp1-sglt2.pdf"
];

function normalize(s: string) {
  return s.toLowerCase().trim();
}

function refForChunk(c: any): string | null {
  const source = normalize(typeof c?.source === "string" ? c.source : "");
  const title = normalize(typeof c?.title === "string" ? c.title : "");
  for (let i = 0; i < CANONICAL_DOCS.length; i++) {
    const file = normalize(CANONICAL_DOCS[i]);
    if (source.includes(file) || title.includes(file)) {
      return `#${i + 1}`;
    }
  }
  return null;
}

function canonicalEvidenceSnippets(chunks: any[]) {
  const byRef = new Map<string, any>();
  for (const c of chunks ?? []) {
    const ref = refForChunk(c);
    if (!ref) continue;
    if (!byRef.has(ref)) byRef.set(ref, c);
  }

  return CANONICAL_DOCS.map((file, i) => {
    const ref = `#${i + 1}`;
    const hit = byRef.get(ref);
    if (!hit) return `[${ref} ${file}] (no relevant excerpt retrieved)`;
    return `[${ref} ${file}] ${String(hit.chunk ?? "")}`;
  }).join("\n\n");
}

async function retrieveEvidenceFromProfile(profile: NonNullable<Payload["profileContext"]>) {
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

  return searchDataset(q, 6);
}

function applyMutationToProfile(p: any) {
  const next = {
    ...p,
    comorbidities: { ...(p.comorbidities ?? {}) }
  };

  if (next.egfr > 35) {
    next.egfr = Math.max(15, next.egfr - 25);
    return next;
  }
  if (next.a1c < 10.5) {
    next.a1c = Number(Math.min(13, next.a1c + 1.4).toFixed(1));
    return next;
  }
  if (next.cost !== "low") {
    next.cost = "low";
    return next;
  }
  if (!next.comorbidities.hf) {
    next.comorbidities.hf = true;
    return next;
  }

  next.bmi = Math.min(50, next.bmi + 3);
  return next;
}

function buildStepContext(p: any, step: number) {
  const s = Math.max(1, Math.floor(step || 1));
  const data = s >= 4 ? applyMutationToProfile(p) : p;
  if (s <= 1) {
    return {
      visible: [
        `Age ${data.age}`,
        `Sex ${data.sex}`,
        `BMI ${data.bmi}`,
        `On metformin=${data.baseline.onMetformin}`
      ],
      hidden: ["A1C", "eGFR", "Cost", "ASCVD", "HF", "CKD"]
    };
  }
  if (s === 2) {
    return {
      visible: [
        `Age ${data.age}`,
        `Sex ${data.sex}`,
        `BMI ${data.bmi}`,
        `A1C ${data.a1c}`,
        `On metformin=${data.baseline.onMetformin}`
      ],
      hidden: ["eGFR", "Cost", "ASCVD", "HF", "CKD"]
    };
  }
  return {
    visible: [
      `Age ${data.age}`,
      `Sex ${data.sex}`,
      `BMI ${data.bmi}`,
      `A1C ${data.a1c}`,
      `eGFR ${data.egfr}`,
      `Cost ${data.cost}`,
      `On metformin=${data.baseline.onMetformin}`
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
    let session = memory.get(body.sessionId);
    if (!session) {
      if (!body.profileContext) {
        return NextResponse.json({ error: "Unknown session" }, { status: 404 });
      }

      const fallbackEvidence = await retrieveEvidenceFromProfile(body.profileContext);
      session = {
        profile: body.profileContext,
        step: Math.max(1, Number(body.step ?? 1)),
        totalSteps: 5,
        evidence: fallbackEvidence
      };
      memory.set(body.sessionId, session);
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

    const evidence = canonicalEvidenceSnippets(session.evidence ?? []);

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
  Prefer naming a concrete drug whenever evidence and released markers support one.
  Use "none" only when evidence is insufficient for a specific agent.
- expert.bullets: 3–6 bullets, each <= 18 words.
- Never reference hidden markers, hidden values, or conclusions that require hidden markers.
- Do not infer, assume, or mention comorbidity status unless explicitly visible.
- Use only the provided guideline evidence. If evidence is insufficient, state that explicitly.
- evidenceUsed must reference only the provided snippet IDs (#1..#6).
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
          evidenceUsed: {
            type: "array",
            items: { type: "string", enum: ["#1", "#2", "#3", "#4", "#5", "#6"] },
            minItems: 1,
            maxItems: 4
          },
          datasetNote: { type: "string" },
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
        required: ["expert", "takeaways", "evidenceUsed", "datasetNote", "rubric"]
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
