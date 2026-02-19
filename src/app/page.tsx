import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl border border-border bg-card shadow-sm">
              <span className="text-lg font-bold">Rx</span>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">PathRx</div>
              <div className="text-lg font-semibold">Adaptive Clinical Cases</div>
            </div>
          </div>
          <Badge className="hidden sm:inline-flex">T2D Pharmacotherapy • Step-based</Badge>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-12">
          <Card className="lg:col-span-7">
            <CardHeader>
              <CardTitle className="text-3xl tracking-tight">
                Train like rounds: one decision at a time.
              </CardTitle>
              <p className="mt-2 text-sm text-muted-foreground">
                Minimal text. High-yield bullets. Immediate feedback. Built for cognitive load,
                interleaving, and script formation.
              </p>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <Card className="p-4">
                  <div className="text-xs text-muted-foreground">Cognitive Load</div>
                  <div className="mt-1 text-sm font-medium">Chunked steps</div>
                  <div className="mt-1 text-xs text-muted-foreground">Only what you need, now.</div>
                </Card>
                <Card className="p-4">
                  <div className="text-xs text-muted-foreground">Interleaving</div>
                  <div className="mt-1 text-sm font-medium">Mixed scenarios</div>
                  <div className="mt-1 text-xs text-muted-foreground">Switch contexts to learn faster.</div>
                </Card>
                <Card className="p-4">
                  <div className="text-xs text-muted-foreground">Script Theory</div>
                  <div className="mt-1 text-sm font-medium">Clinical scripts</div>
                  <div className="mt-1 text-xs text-muted-foreground">Patterns → plan → action.</div>
                </Card>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link href="/case/new">
                  <Button className="rounded-xl">New Case</Button>
                </Link>
                <Link href="/case/new?mode=random">
                  <Button variant="outline" className="rounded-xl">
                    Random Case
                  </Button>
                </Link>
                <span className="text-xs text-muted-foreground">
                  Tip: choose “Hard” to practice edge cases and contraindications.
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-5">
            <CardHeader>
              <CardTitle className="text-lg">How it works</CardTitle>
              <p className="text-sm text-muted-foreground">
                A 2–4 step case. You answer. We grade and show expert reasoning side-by-side.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="text-xs text-muted-foreground">Step 1</div>
                <div className="text-sm font-medium">Pick next therapy class</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Based on comorbidities + A1C + kidney function.
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="text-xs text-muted-foreground">Step 2</div>
                <div className="text-sm font-medium">Dose / safety / monitoring</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Avoid common pitfalls (eGFR, hypoglycemia, cost).
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="text-xs text-muted-foreground">End</div>
                <div className="text-sm font-medium">Compare with expert</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Your rationale vs. expert bullets + key takeaways.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
