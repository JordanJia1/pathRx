"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { PatientVisual, type Patient } from "@/components/patient-visual";
import { CaseSummary } from "@/components/case-summary";
import { DecisionForm, type DecisionPayload } from "@/components/decision-form";
import { FeedbackCompare, type Grade } from "@/components/feedback-compare";
import { Stepper } from "@/components/stepper";
import { Card, CardContent } from "@/components/ui/card";

type SessionResponse = {
  sessionId: string;
  step: number;
  totalSteps: number;
  patient: Patient;
  summary: { title: string; bullets: string[]; tags: string[] };
};

export default function CaseSessionPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SessionResponse | null>(null);

  const [userDecision, setUserDecision] = useState<DecisionPayload | null>(null);
  const [grade, setGrade] = useState<Grade | null>(null);
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

  const stepPrompt = useMemo(() => {
    // If you later store stepPrompt in GET response, use it here.
    return "What is the best next medication class to add?";
  }, []);

  async function submitDecision(decision: DecisionPayload) {
    setUserDecision(decision);
    setGrade(null);
    setGrading(true);

    try {
      const res = await fetch("/api/case/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, step: session?.step ?? 1, decision })
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg);
      }

      const data = (await res.json()) as Grade;
      setGrade(data);
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
            <h1 className="text-2xl font-semibold tracking-tight">{session.summary.title}</h1>
          </div>
          <Stepper step={session.step} totalSteps={session.totalSteps} />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-4 space-y-6">
            <PatientVisual patient={session.patient} />
          </div>

          <div className="lg:col-span-8 space-y-6">
            <CaseSummary
              title={session.summary.title}
              bullets={session.summary.bullets}
              tags={session.summary.tags}
            />

            <DecisionForm
              stepPrompt={stepPrompt}
              onSubmit={submitDecision}
              disabled={grading}
            />

            <FeedbackCompare user={userDecision} grade={grade} />
          </div>
        </div>
      </div>
    </main>
  );
}
