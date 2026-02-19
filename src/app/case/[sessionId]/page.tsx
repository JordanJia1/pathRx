"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
  round: 1 | 2;
  user: DecisionPayload;
  grade: Grade;
};

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

export default function CaseSessionPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [mutation, setMutation] = useState<MutationScenario | null>(null);
  const [feedbackRounds, setFeedbackRounds] = useState<FeedbackRound[]>([]);
  const [grading, setGrading] = useState(false);

  // fetch session payload
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

  useEffect(() => {
    if (session && session.step >= 2 && !mutation) {
      setMutation(buildMutationScenario(session));
    }
  }, [session, mutation]);

  const stepPrompt = useMemo(() => {
    if (mutation) return mutation.stepPrompt;
    return (
      session?.summary.stepPrompt ?? "What is the best next medication class to add?"
    );
  }, [mutation, session?.summary.stepPrompt]);

  const totalSteps = session?.totalSteps ?? 3;
  const currentStep = Math.min(
    totalSteps,
    Math.max(session?.step ?? 1, feedbackRounds.length + 1)
  );
  const isComplete = feedbackRounds.length >= 2 || currentStep >= totalSteps;
  const visiblePatient = mutation ? mutation.patient : session?.patient;
  const visibleSummary = mutation
    ? mutation.summary
    : session?.summary ?? { title: "", bullets: [], tags: [] };

  async function submitDecision(decision: DecisionPayload) {
    if (!session) return;
    if (feedbackRounds.length >= 2) return;
    const round = (feedbackRounds.length + 1) as 1 | 2;
    setGrading(true);

    try {
      const res = await fetch("/api/case/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, step: currentStep, decision })
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg);
      }

      const data = (await res.json()) as Grade;
      setFeedbackRounds((prev) => [...prev, { round, user: decision, grade: data }]);
      if (round === 1 && !mutation) {
        setMutation(buildMutationScenario(session));
      }

      // refresh session so Stepper updates
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
            <PatientVisual patient={visiblePatient} />
          </div>

          <div className="lg:col-span-8 space-y-6">
            <CaseSummary title={visibleSummary.title} bullets={visibleSummary.bullets} tags={visibleSummary.tags} />

            {mutation ? (
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
                key={mutation ? "round-2" : "round-1"}
                stepPrompt={stepPrompt}
                onSubmit={submitDecision}
                disabled={grading}
              />
            ) : (
              <Card className="rounded-2xl border-primary/30">
                <CardContent className="space-y-4 p-4">
                  <div className="text-sm text-muted-foreground">
                    Case complete. You finished both decision rounds.
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

            {feedbackRounds.length === 0 ? <FeedbackCompare user={null} grade={null} /> : null}
            {feedbackRounds.map((r) => (
              <div key={r.round} className="space-y-2">
                <div className="text-xs text-muted-foreground">Round {r.round} feedback</div>
                <FeedbackCompare user={r.user} grade={r.grade} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
