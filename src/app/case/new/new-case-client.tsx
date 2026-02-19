"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AiThinkingBar } from "@/components/ai-thinking-bar";

type Difficulty = "easy" | "medium" | "hard";
type Cost = "low" | "medium" | "high";

type Profile = {
  difficulty: Difficulty;
  age: number;
  sex: "male" | "female";
  bmi: number;
  a1c: number;
  egfr: number;
  cost: Cost;
  comorbidities: { ascvd: boolean; hf: boolean; ckd: boolean };
  baseline: { onMetformin: boolean };
};

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomProfile(difficulty: Difficulty): Profile {
  const base =
    difficulty === "easy"
      ? { a1c: randInt(7, 9), egfr: randInt(60, 110) }
      : difficulty === "medium"
        ? { a1c: randInt(8, 11), egfr: randInt(30, 90) }
        : { a1c: randInt(9, 13), egfr: randInt(15, 75) };

  const ascvd = Math.random() < (difficulty === "hard" ? 0.55 : 0.35);
  const hf = Math.random() < (difficulty === "hard" ? 0.45 : 0.25);
  const ckd = Math.random() < (difficulty === "hard" ? 0.5 : 0.25);

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

  // Lock mode via URL so the Mode card disappears after selection
  const modeParam = sp.get("mode"); // "random" | "guided" | null
  const modeLocked = modeParam === "random" || modeParam === "guided";

  const initialMode =
    modeParam === "random" ? "random" : modeParam === "guided" ? "guided" : "guided";

  const [mode, setMode] = React.useState<"guided" | "random">(initialMode);
  const [difficulty, setDifficulty] = React.useState<Difficulty>("easy");
  const [busy, setBusy] = React.useState(false);

  // Keep state in sync if URL changes (e.g. router.replace)
  React.useEffect(() => {
    if (modeParam === "random" && mode !== "random") setMode("random");
    if (modeParam === "guided" && mode !== "guided") setMode("guided");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modeParam]);

  // Guided controls (kept minimal)
  const [cost, setCost] = React.useState<Cost>("medium");
  const [onMetformin, setOnMetformin] = React.useState(true);
  const [ascvd, setAscvd] = React.useState(false);
  const [hf, setHf] = React.useState(false);
  const [ckd, setCkd] = React.useState(false);

  // Optional numeric knobs (small UI, not text-heavy)
  const [age, setAge] = React.useState(58);
  const [a1c, setA1c] = React.useState(8.6);
  const [egfr, setEgfr] = React.useState(72);
  const [sex, setSex] = React.useState<"male" | "female">("male");
  const [bmi, setBmi] = React.useState(32);

  function buildGuidedProfile(): Profile {
    return {
      difficulty,
      age,
      sex,
      bmi,
      a1c,
      egfr,
      cost,
      comorbidities: { ascvd, hf, ckd },
      baseline: { onMetformin }
    };
  }

  async function generate() {
    setBusy(true);
    try {
      const profile = mode === "random" ? randomProfile(difficulty) : buildGuidedProfile();

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

  const modeBadge = mode === "random" ? "Random (interleaving)" : "Guided (script cues)";

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-10 space-y-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-sm text-muted-foreground">New case</div>
            <h1 className="text-2xl font-semibold tracking-tight">Generate a clinical case</h1>
          </div>
          <Badge>{modeBadge}</Badge>
        </div>

        <AiThinkingBar active={busy} label="Generating case…" />

      

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Difficulty</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
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
          </CardContent>
        </Card>

        {mode === "guided" ? (
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Guided knobs</CardTitle>
              <p className="text-sm text-muted-foreground">
                Pick the cues you want to practice (script theory).
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Cost constraint</div>
                  <Select
                    value={cost}
                    onValueChange={(v) => setCost(v as Cost)}
                    disabled={busy}
                    options={[
                      { label: "Low", value: "low" },
                      { label: "Medium", value: "medium" },
                      { label: "High", value: "high" }
                    ]}
                  />
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Sex</div>
                  <Select
                    value={sex}
                    onValueChange={(v) => setSex(v as "male" | "female")}
                    disabled={busy}
                    options={[
                      { label: "Male", value: "male" },
                      { label: "Female", value: "female" }
                    ]}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Age</div>
                  <Input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    disabled={busy}
                  />
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">A1C</div>
                  <Input
                    type="number"
                    step="0.1"
                    value={a1c}
                    onChange={(e) => setA1c(Number(e.target.value))}
                    disabled={busy}
                  />
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">eGFR</div>
                  <Input
                    type="number"
                    value={egfr}
                    onChange={(e) => setEgfr(Number(e.target.value))}
                    disabled={busy}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">BMI</div>
                  <Input
                    type="number"
                    value={bmi}
                    onChange={(e) => setBmi(Number(e.target.value))}
                    disabled={busy}
                  />
                </div>

                <Toggle
                  label="On metformin"
                  value={onMetformin}
                  onChange={setOnMetformin}
                  disabled={busy}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Toggle label="ASCVD" value={ascvd} onChange={setAscvd} disabled={busy} />
                <Toggle label="HF" value={hf} onChange={setHf} disabled={busy} />
                <Toggle label="CKD" value={ckd} onChange={setCkd} disabled={busy} />
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </main>
  );
}

function Toggle({
  label,
  value,
  onChange,
  disabled
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!value)}
      className={[
        "h-10 rounded-xl border px-3 text-sm text-left transition",
        "disabled:opacity-60",
        value ? "border-primary bg-primary/10" : "border-border bg-background hover:bg-muted"
      ].join(" ")}
    >
      <div className="flex items-center justify-between">
        <span>{label}</span>
        <span className="text-xs text-muted-foreground">{value ? "On" : "Off"}</span>
      </div>
    </button>
  );
}
