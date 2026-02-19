"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { AiThinkingBar } from "@/components/ai-thinking-bar";
import { PatientVisual, type Patient } from "@/components/patient-visual";
import { CaseSummary } from "@/components/case-summary";
import { DecisionForm, type DecisionPayload } from "@/components/decision-form";
import { FeedbackCompare, type Grade } from "@/components/feedback-compare";
import { Stepper } from "@/components/stepper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type SessionResponse = {
  sessionId: string;
  step: number;
  totalSteps: number;
  patient: Patient;
  summary: { title: string; bullets: string[]; tags: string[]; stepPrompt?: string };
};

type MutationScenario = {
  patient: Patient;
  summary: { title: string; bullets: string[]; tags: string[] };
  stepPrompt: string;
  change: { label: string; before: string; after: string };
};

type FeedbackRound = {
  round: number;
  user: DecisionPayload;
  grade: Grade;
};

type VitalField = "a1c" | "egfr" | "bmi" | "cost";

const PRE_MUTATION_STEPS = 3;
const MUTATION_STEP = 4;
const COMPLETE_STEP = 5;

function buildMutationScenario(session: SessionResponse): MutationScenario {
  const nextPatient: Patient = {
    ...session.patient,
    risk: { ...(session.patient.risk ?? {}) }
  };

  let mutationLabel = "";
  let change = { label: "Clinical status", before: "", after: "" };
  if (nextPatient.egfr > 35) {
    const prev = nextPatient.egfr;
    nextPatient.egfr = Math.max(15, prev - 25);
    mutationLabel = `eGFR dropped from ${prev} to ${nextPatient.egfr}.`;
    change = { label: "eGFR", before: String(prev), after: String(nextPatient.egfr) };
  } else if (nextPatient.a1c < 10.5) {
    const prev = nextPatient.a1c;
    nextPatient.a1c = Number(Math.min(13, prev + 1.4).toFixed(1));
    mutationLabel = `A1C rose from ${prev}% to ${nextPatient.a1c}%.`;
    change = { label: "A1C", before: `${prev}%`, after: `${nextPatient.a1c}%` };
  } else if (nextPatient.cost !== "low") {
    const prev = nextPatient.cost;
    nextPatient.cost = "low";
    mutationLabel = `Coverage changed from ${prev} to low-cost formulary only.`;
    change = { label: "Cost", before: prev, after: "low" };
  } else {
    const hadHf = Boolean(nextPatient.risk?.hf);
    if (!hadHf) {
      nextPatient.risk = { ...(nextPatient.risk ?? {}), hf: true };
      mutationLabel = "New HF diagnosis is now present.";
      change = { label: "HF", before: "absent", after: "present" };
    } else {
      const prev = nextPatient.bmi;
      nextPatient.bmi = Math.min(50, prev + 3);
      mutationLabel = `BMI increased from ${prev} to ${nextPatient.bmi}.`;
      change = { label: "BMI", before: String(prev), after: String(nextPatient.bmi) };
    }
  }

  return {
    patient: nextPatient,
    summary: {
      title: `${session.summary.title} • Mutation`,
      bullets: [
        `Clinical update: ${mutationLabel}`,
        "Re-rank priorities after this single change.",
        "Choose the next therapy class with updated safety and benefit balance."
      ],
      tags: [...session.summary.tags.slice(0, 3), "Mutation step", "Re-prioritize"]
    },
    stepPrompt:
      "Case mutation applied. With this updated marker/status, what is the best next medication class now?",
    change
  };
}

function getStepRelease(currentStep: number): {
  hiddenFields: VitalField[];
  title: string;
  note: string;
} {
  if (currentStep <= 1) {
    return {
      hiddenFields: ["a1c", "egfr", "cost"],
      title: "Step 1 Release",
      note: "Initial triage view: age, sex, and BMI only."
    };
  }
  if (currentStep === 2) {
    return {
      hiddenFields: ["egfr", "cost"],
      title: "Step 2 Release",
      note: "Newly released: A1C. Re-evaluate your intervention."
    };
  }
  return {
    hiddenFields: [],
    title: "Step 3 Release",
    note: "Full baseline vitals released: A1C, eGFR, and cost."
  };
}

function buildSafeSummaryBullets({
  currentStep,
  patient,
  hiddenFields,
  sourceBullets
}: {
  currentStep: number;
  patient?: Patient;
  hiddenFields: VitalField[];
  sourceBullets: string[];
}) {
  const hidden = new Set(hiddenFields);
  const treatmentHint = /(sglt2|glp-?1|dpp-?4|insulin|sulfonylurea|metformin|pioglitazone|drug)/i;

  if (currentStep === 1) {
    return [
      "Initial triage with limited data; focus on safe first-pass intervention.",
      "Do not assume renal status or cost constraints yet.",
      "State key uncertainty and your immediate plan."
    ];
  }
  if (currentStep === 2) {
    return [
      `A1C now available${patient ? `: ${patient.a1c}%` : ""}.`,
      "Renal function and cost are still locked.",
      "Re-evaluate intervention based on glycemic severity."
    ];
  }
  if (currentStep === 3) {
    return [
      `A1C: ${patient?.a1c ?? "n/a"}%, eGFR: ${patient?.egfr ?? "n/a"}, cost: ${patient?.cost ?? "n/a"}.`,
      "All baseline vitals are now released.",
      "Choose intervention using benefit, safety, and access tradeoffs."
    ];
  }

  const masked = sourceBullets
    .map((b) => {
      let out = b;
      if (hidden.has("a1c")) out = out.replace(/\bA1C\b[^,.;)]+/gi, "A1C [locked]");
      if (hidden.has("egfr")) out = out.replace(/\beGFR\b[^,.;)]+/gi, "eGFR [locked]");
      if (hidden.has("cost")) out = out.replace(/\bcost\b[^,.;)]+/gi, "cost [locked]");
      return out;
    })
    .filter((b) => !treatmentHint.test(b));

  return masked.length
    ? masked.slice(0, 3)
    : ["Use the released data only and avoid assumptions from locked markers."];
}

function buildSafeSummaryTags({
  currentStep,
  hiddenFields,
  sourceTags
}: {
  currentStep: number;
  hiddenFields: VitalField[];
  sourceTags: string[];
}) {
  const hidden = new Set(hiddenFields);
  const answerHint =
    /(sglt2|glp-?1|dpp-?4|insulin|sulfonylurea|metformin|pioglitazone|drug|first[- ]line|preferred)/i;
  const leakedVital =
    (hidden.has("a1c") && /\ba1c\b/i) ||
    (hidden.has("egfr") && /\begfr\b|\bkidney\b/i) ||
    (hidden.has("cost") && /\bcost\b|\bformulary\b|\bcoverage\b/i);

  if (currentStep <= 1) return ["Triage", "Limited data", "Initial intervention"];
  if (currentStep === 2) return ["A1C released", "Partial data", "Re-evaluate"];
  if (currentStep === 3) return ["Full baseline", "Risk-benefit", "Access considerations"];

  const tags = sourceTags
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => !answerHint.test(t))
    .filter((t) => {
      if (hidden.has("a1c") && /\ba1c\b/i.test(t)) return false;
      if (hidden.has("egfr") && (/\begfr\b/i.test(t) || /\bkidney\b/i.test(t))) return false;
      if (
        hidden.has("cost") &&
        (/\bcost\b/i.test(t) || /\bformulary\b/i.test(t) || /\bcoverage\b/i.test(t))
      )
        return false;
      return true;
    });

  if (!tags.length || leakedVital) {
    return ["Step-focused", "Use released data", "Clinical reasoning"];
  }
  return tags.slice(0, 4);
}

export default function CaseSessionPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [mutation, setMutation] = useState<MutationScenario | null>(null);
  const [feedbackRounds, setFeedbackRounds] = useState<FeedbackRound[]>([]);
  const [grading, setGrading] = useState(false);
  const latestFeedbackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/case/generate?sessionId=${encodeURIComponent(sessionId)}`);
        if (!res.ok) {
          const msg = await res.text();
          throw new Error(msg);
        }
        const data = (await res.json()) as SessionResponse;
        if (!cancelled) setSession(data);
      } catch (e) {
        console.error(e);
        if (!cancelled) setSession(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const totalSteps = session?.totalSteps ?? COMPLETE_STEP;
  const currentStep = Math.min(
    totalSteps,
    Math.max(session?.step ?? 1, feedbackRounds.length + 1)
  );

  useEffect(() => {
    if (session && currentStep >= MUTATION_STEP && !mutation) {
      setMutation(buildMutationScenario(session));
    }
  }, [session, currentStep, mutation]);

  const stepPrompt = useMemo(() => {
    if (currentStep === 1) {
      return "Based on the initial triage vitals, what is your first intervention choice?";
    }
    if (currentStep === 2) {
      return "A1C is now available. Reassess and choose the next intervention.";
    }
    if (currentStep === 3) {
      return "Full baseline vitals are now available. What is your best intervention now?";
    }
    if (mutation) return mutation.stepPrompt;
    return session?.summary.stepPrompt ?? "What is the best next medication class to add?";
  }, [currentStep, mutation, session?.summary.stepPrompt]);

  const isComplete = currentStep >= COMPLETE_STEP;
  const isMutationPhase = currentStep >= MUTATION_STEP && !isComplete;

  const visiblePatient = mutation && isMutationPhase ? mutation.patient : session?.patient;
  const visibleSummary = mutation && isMutationPhase
    ? mutation.summary
    : session?.summary ?? { title: "", bullets: [], tags: [] };

  const release = getStepRelease(Math.min(currentStep, PRE_MUTATION_STEPS));
  const hiddenFields = isMutationPhase || isComplete ? [] : release.hiddenFields;
  const safeSummaryBullets = buildSafeSummaryBullets({
    currentStep,
    patient: visiblePatient,
    hiddenFields,
    sourceBullets: visibleSummary.bullets
  });
  const safeSummaryTags = buildSafeSummaryTags({
    currentStep,
    hiddenFields,
    sourceTags: visibleSummary.tags
  });
  const latestFeedback = feedbackRounds[feedbackRounds.length - 1];
  const earlierFeedback = feedbackRounds.slice(0, -1);

  useEffect(() => {
    if (!latestFeedback) return;
    latestFeedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [latestFeedback]);

  async function submitDecision(decision: DecisionPayload) {
    if (!session) return;
    if (isComplete) return;

    const round = currentStep;
    setGrading(true);

    try {
      let data: Grade | null = null;
      let lastErr: unknown = null;

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const res = await fetch("/api/case/grade", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId, step: currentStep, decision })
          });

          if (!res.ok) {
            const msg = await res.text();
            if (res.status >= 500 && attempt < 3) {
              lastErr = new Error(msg);
              await new Promise((resolve) => setTimeout(resolve, attempt * 200));
              continue;
            }
            throw new Error(msg);
          }

          data = (await res.json()) as Grade;
          break;
        } catch (err) {
          lastErr = err;
          if (attempt === 3) throw err;
          await new Promise((resolve) => setTimeout(resolve, attempt * 200));
        }
      }

      if (!data) {
        throw lastErr instanceof Error ? lastErr : new Error("Failed to grade decision");
      }
      setFeedbackRounds((prev) => [...prev, { round, user: decision, grade: data }]);

      if (round === PRE_MUTATION_STEPS && !mutation) {
        setMutation(buildMutationScenario(session));
      }

      const refreshed = await fetch(
        `/api/case/generate?sessionId=${encodeURIComponent(sessionId)}`
      );
      if (refreshed.ok) {
        const s = (await refreshed.json()) as SessionResponse;
        setSession(s);
      }

    } catch (e: any) {
      alert(`Failed to grade:\n\n${e?.message ?? String(e)}`);
    } finally {
      setGrading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <Card className="rounded-2xl">
            <CardContent className="p-6 text-sm text-muted-foreground">Loading case…</CardContent>
          </Card>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <Card className="rounded-2xl">
            <CardContent className="p-6">
              <div className="text-sm font-medium">Could not load case.</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Try generating a new case from <a className="underline" href="/case/new">/case/new</a>.
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-sm text-muted-foreground">Clinical case</div>
            <h1 className="text-2xl font-semibold tracking-tight">{visibleSummary.title}</h1>
          </div>
          <Stepper current={currentStep} total={totalSteps} />
        </div>

        <AiThinkingBar active={grading} label="Grading your decision…" />

        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-4 space-y-6">
            <PatientVisual patient={visiblePatient} hiddenFields={hiddenFields} />
          </div>

          <div className="lg:col-span-8 space-y-6">
            <CaseSummary title={visibleSummary.title} bullets={safeSummaryBullets} tags={safeSummaryTags} />

            <div ref={latestFeedbackRef} className="space-y-2">
              {latestFeedback ? (
                <>
                  <div className="text-xs text-muted-foreground">
                    Latest feedback (Step {latestFeedback.round})
                  </div>
                  <FeedbackCompare user={latestFeedback.user} grade={latestFeedback.grade} />
                </>
              ) : (
                <FeedbackCompare user={null} grade={null} />
              )}
            </div>

            {!isMutationPhase && !isComplete ? (
              <Card className="rounded-2xl border-sky-400/50 bg-sky-50">
                <CardContent className="space-y-1 p-4">
                  <div className="text-sm font-semibold text-sky-900">{release.title}</div>
                  <div className="text-sm text-sky-900">{release.note}</div>
                </CardContent>
              </Card>
            ) : null}

            {isMutationPhase && mutation ? (
              <Card className="rounded-2xl border-amber-500/60 bg-amber-50 shadow-sm ring-2 ring-amber-400/50">
                <CardContent className="space-y-3 p-4">
                  <div className="text-sm font-semibold text-amber-900">Mutation Applied</div>
                  <div className="text-sm text-amber-900">
                    One key marker changed. Re-evaluate your treatment decision.
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full border border-amber-700/30 bg-white px-2 py-1 font-medium text-amber-900">
                      {mutation.change.label}
                    </span>
                    <span className="rounded-full border border-amber-700/20 bg-white px-2 py-1 text-amber-900">
                      Before: {mutation.change.before}
                    </span>
                    <span className="rounded-full border border-amber-700/20 bg-amber-200/70 px-2 py-1 font-medium text-amber-950">
                      After: {mutation.change.after}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {!isComplete ? (
              <DecisionForm
                key={`round-${currentStep}`}
                stepPrompt={stepPrompt}
                onSubmit={submitDecision}
                disabled={grading}
              />
            ) : (
              <Card className="rounded-2xl border-primary/30">
                <CardContent className="space-y-4 p-4">
                  <div className="text-sm text-muted-foreground">
                    Case complete. You finished all intervention evaluations and mutation reassessment.
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link href="/">
                      <Button variant="outline">Home</Button>
                    </Link>
                    <Link href="/case/new">
                      <Button>Next case</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}

            {earlierFeedback.map((r) => (
              <div key={`${r.round}-${r.user.medicationClass}`} className="space-y-2">
                <div className="text-xs text-muted-foreground">Earlier feedback (Step {r.round})</div>
                <FeedbackCompare user={r.user} grade={r.grade} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
