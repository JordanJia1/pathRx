"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Difficulty = "easy" | "medium" | "hard";
type Sex = "male" | "female";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function NewCasePage() {
  const router = useRouter();
  const sp = useSearchParams();
  const mode = sp.get("mode"); // "random" optional

  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [age, setAge] = useState(55);
  const [sex, setSex] = useState<Sex>("male");
  const [bmi, setBmi] = useState(32);
  const [a1c, setA1c] = useState(8.5);
  const [egfr, setEgfr] = useState(75);
  const [cost, setCost] = useState<"low" | "medium" | "high">("medium");

  const [ascvd, setAscvd] = useState(false);
  const [hf, setHf] = useState(false);
  const [ckd, setCkd] = useState(false);
  const [onMetformin, setOnMetformin] = useState(true);

  // randomize based on difficulty (simple + effective)
  function randomize(d: Difficulty) {
    const hard = d === "hard";
    const easy = d === "easy";

    setAge(clamp(Math.round(40 + Math.random() * (hard ? 45 : 30)), 18, 90));
    setSex(Math.random() < 0.5 ? "male" : "female");
    setBmi(clamp(Number((24 + Math.random() * (hard ? 18 : 12)).toFixed(1)), 18, 50));
    setA1c(clamp(Number((7.2 + Math.random() * (hard ? 4.0 : 2.0)).toFixed(1)), 6.5, 12.5));
    setEgfr(clamp(Math.round(30 + Math.random() * (hard ? 55 : 65)), 10, 120));
    setCost((["low", "medium", "high"] as const)[Math.floor(Math.random() * 3)]);

    // difficulty bumps comorbids
    setAscvd(hard ? Math.random() < 0.55 : Math.random() < 0.25);
    setHf(hard ? Math.random() < 0.35 : Math.random() < 0.15);
    setCkd(hard ? Math.random() < 0.45 : Math.random() < 0.2);
    setOnMetformin(easy ? true : Math.random() < 0.8);
  }

  useEffect(() => {
    if (mode === "random") randomize(difficulty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const profile = useMemo(
    () => ({
      difficulty,
      age,
      sex,
      bmi,
      a1c,
      egfr,
      cost,
      comorbidities: { ascvd, hf, ckd },
      baseline: { onMetformin }
    }),
    [difficulty, age, sex, bmi, a1c, egfr, cost, ascvd, hf, ckd, onMetformin]
  );

  async function generate() {
    const res = await fetch("/api/case/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile)
    });
    if (!res.ok) {
      alert("Failed to generate case.");
      return;
    }
    const data = await res.json();
    // expected: { sessionId: string }
    router.push(`/case/${data.sessionId}`);
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm text-muted-foreground">New clinical case</div>
            <h1 className="text-2xl font-semibold tracking-tight">Configure the patient</h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge>Low text mode</Badge>
            <Badge>Step-based feedback</Badge>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          <Card className="lg:col-span-8">
            <CardHeader>
              <CardTitle className="text-lg">Patient profile</CardTitle>
              <p className="text-sm text-muted-foreground">
                Keep it simple: only the variables that meaningfully change therapy choice.
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1">
                  <div className="text-xs text-muted-foreground">Difficulty</div>
                  <select
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                  >
                    <option value="easy">Easy (core patterns)</option>
                    <option value="medium">Medium (realistic)</option>
                    <option value="hard">Hard (edge cases)</option>
                  </select>
                </label>

                <label className="space-y-1">
                  <div className="text-xs text-muted-foreground">Cost constraint</div>
                  <select
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
                    value={cost}
                    onChange={(e) => setCost(e.target.value as any)}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </label>

                <label className="space-y-1">
                  <div className="text-xs text-muted-foreground">Age</div>
                  <input
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
                    type="number"
                    value={age}
                    onChange={(e) => setAge(clamp(Number(e.target.value), 18, 90))}
                  />
                </label>

                <label className="space-y-1">
                  <div className="text-xs text-muted-foreground">Sex</div>
                  <select
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
                    value={sex}
                    onChange={(e) => setSex(e.target.value as Sex)}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </label>

                <label className="space-y-1">
                  <div className="text-xs text-muted-foreground">BMI (kg/m²)</div>
                  <input
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
                    type="number"
                    step="0.1"
                    value={bmi}
                    onChange={(e) => setBmi(clamp(Number(e.target.value), 18, 60))}
                  />
                </label>

                <label className="space-y-1">
                  <div className="text-xs text-muted-foreground">A1C (%)</div>
                  <input
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
                    type="number"
                    step="0.1"
                    value={a1c}
                    onChange={(e) => setA1c(clamp(Number(e.target.value), 6.0, 14.0))}
                  />
                </label>

                <label className="space-y-1 sm:col-span-2">
                  <div className="text-xs text-muted-foreground">eGFR (mL/min/1.73m²)</div>
                  <input
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
                    type="number"
                    value={egfr}
                    onChange={(e) => setEgfr(clamp(Number(e.target.value), 5, 140))}
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                  <input type="checkbox" checked={ascvd} onChange={(e) => setAscvd(e.target.checked)} />
                  <div>
                    <div className="text-sm font-medium">ASCVD history</div>
                    <div className="text-xs text-muted-foreground">Prior MI/stroke/PAD</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                  <input type="checkbox" checked={hf} onChange={(e) => setHf(e.target.checked)} />
                  <div>
                    <div className="text-sm font-medium">Heart failure</div>
                    <div className="text-xs text-muted-foreground">HFrEF or HFpEF</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                  <input type="checkbox" checked={ckd} onChange={(e) => setCkd(e.target.checked)} />
                  <div>
                    <div className="text-sm font-medium">CKD / albuminuria</div>
                    <div className="text-xs text-muted-foreground">UACR &gt; 30 mg/g</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                  <input
                    type="checkbox"
                    checked={onMetformin}
                    onChange={(e) => setOnMetformin(e.target.checked)}
                  />
                  <div>
                    <div className="text-sm font-medium">On metformin</div>
                    <div className="text-xs text-muted-foreground">Baseline therapy</div>
                  </div>
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button onClick={generate} className="rounded-xl">
                  Generate Case
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => randomize(difficulty)}
                >
                  Randomize
                </Button>
                <span className="text-xs text-muted-foreground">
                  Cognitive load tip: fewer variables → better pattern recognition.
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-4">
            <CardHeader>
              <CardTitle className="text-lg">Learning mode</CardTitle>
              <p className="text-sm text-muted-foreground">
                This app is designed to reinforce clinical scripts through interleaving.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="text-xs text-muted-foreground">Cognitive Load</div>
                <div className="mt-1 text-sm font-medium">Short, bullet summaries</div>
                <div className="mt-1 text-xs text-muted-foreground">Avoids walls of text.</div>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="text-xs text-muted-foreground">Interleaving</div>
                <div className="mt-1 text-sm font-medium">Mixed comorbidity cases</div>
                <div className="mt-1 text-xs text-muted-foreground">Prevents “one-path” memorization.</div>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="text-xs text-muted-foreground">Script Theory</div>
                <div className="mt-1 text-sm font-medium">Cue → pattern → action</div>
                <div className="mt-1 text-xs text-muted-foreground">Builds fast recognition.</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
