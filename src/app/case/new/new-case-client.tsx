"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { AiThinkingBar } from "@/components/ai-thinking-bar";

type Difficulty = "easy" | "medium" | "hard";
type Cost = "low" | "medium" | "high";

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomProfile(difficulty: Difficulty) {
  const base =
    difficulty === "easy"
      ? { a1c: randInt(7, 9), egfr: randInt(60, 110) }
      : difficulty === "medium"
        ? { a1c: randInt(8, 11), egfr: randInt(30, 90) }
        : { a1c: randInt(9, 13), egfr: randInt(15, 75) };

  const ascvd = Math.random() < (difficulty === "hard" ? 0.55 : 0.35);
  const hf = Math.random() < (difficulty === "hard" ? 0.45 : 0.25);
  const ckd = Math.random() < (difficulty === "hard" ? 0.50 : 0.25);

  return {
    difficulty,
    age: randInt(35, 82),
    sex: Math.random() < 0.5 ? "male" : "female",
    bmi: randInt(22, 42),
    a1c: base.a1c,
    egfr: base.egfr,
    cost: (["low", "medium", "high"] as Cost[])[randInt(0, 2)],
    comorbidities: { ascvd, hf, ckd },
    baseline: { onMetformin: Math.random() < 0.65 }
  };
}

export default function NewCaseClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const initialMode = sp.get("mode") === "random" ? "random" : "guided";

  const [mode, setMode] = React.useState<"guided" | "random">(initialMode);
  const [difficulty, setDifficulty] = React.useState<Difficulty>("easy");
  const [busy, setBusy] = React.useState(false);

  async function generate() {
    setBusy(true);
    try {
      const profile = randomProfile(difficulty);

      const res = await fetch("/api/case/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile)
      });

      if (!res.ok) throw new Error(await res.text());

      const data = (await res.json()) as { sessionId: string };
      router.push(`/case/${data.sessionId}`);
    } catch (e: any) {
      alert(`Failed to generate case:\n\n${e?.message ?? String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-10 space-y-6">
        <div>
          <div className="text-sm text-muted-foreground">New case</div>
          <h1 className="text-2xl font-semibold tracking-tight">Generate a clinical case</h1>
        </div>

        <AiThinkingBar active={busy} label="Generating case…" />

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Options</CardTitle>
            <p className="text-sm text-muted-foreground">
              Keep it short, rotate concepts (interleaving), and build cue→pattern→action scripts.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant={mode === "guided" ? "default" : "outline"}
                onClick={() => setMode("guided")}
                disabled={busy}
              >
                Guided
              </Button>
              <Button
                variant={mode === "random" ? "default" : "outline"}
                onClick={() => setMode("random")}
                disabled={busy}
              >
                Random
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Difficulty</div>
                <Select
                  value={difficulty}
                  onValueChange={(v) => setDifficulty(v as Difficulty)}
                  disabled={busy}
                  options={[
                    { label: "Easy", value: "easy" },
                    { label: "Medium", value: "medium" },
                    { label: "Hard", value: "hard" }
                  ]}
                />
              </div>

              <div className="flex items-end justify-end">
                <Button onClick={generate} disabled={busy}>
                  Generate case
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
