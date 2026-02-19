import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export type Decision = {
  medicationClass: string;
  specificDrug?: string;
  justification: string;
};

export type Grade = {
  expert: { medicationClass: string; specificDrug?: string; bullets: string[] };
  takeaways: string[];
  evidenceUsed?: string[];
  datasetNote?: string;
  rubric: { label: string; verdict: "met" | "partial" | "missed"; note: string }[];
};

export function FeedbackCompare({
  user,
  grade
}: {
  user?: Decision | null;
  grade?: Grade | null;
}) {
  if (!user || !grade) {
    return (
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Feedback</CardTitle>
          <p className="text-sm text-muted-foreground">Submit your decision to see expert feedback.</p>
        </CardHeader>
      </Card>
    );
  }

  const expert = grade.expert;

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-base">Side-by-side feedback</CardTitle>
        <p className="text-sm text-muted-foreground">Your answer vs expert (concise to reduce cognitive load).</p>
      </CardHeader>

      <CardContent className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Your answer</div>
            <Badge>{user.medicationClass}</Badge>
          </div>
          {user.specificDrug ? (
            <div className="text-xs text-muted-foreground">Drug: {user.specificDrug}</div>
          ) : null}
          <Separator className="my-3" />
          <div className="text-xs text-muted-foreground">Justification</div>
          <div className="mt-1 whitespace-pre-wrap text-sm">{user.justification}</div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Expert</div>
            <Badge>{expert.medicationClass}</Badge>
          </div>
          {expert.specificDrug ? (
            <div className="text-xs text-muted-foreground">Drug: {expert.specificDrug}</div>
          ) : null}
          <Separator className="my-3" />
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            {(expert.bullets ?? []).map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-2">
          <Separator className="my-2" />
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="text-sm font-semibold">Dataset grounding</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {(grade.evidenceUsed ?? []).length ? (
                (grade.evidenceUsed ?? []).map((r) => <Badge key={r}>{r}</Badge>)
              ) : (
                <Badge>No refs</Badge>
              )}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {grade.datasetNote ?? "Feedback constrained to provided dataset evidence only."}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="text-sm font-semibold">Script cues (Cue → Pattern → Action)</div>
              <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                {(grade.takeaways ?? []).map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="text-sm font-semibold">Rubric</div>
              <div className="mt-2 space-y-2">
                {(grade.rubric ?? []).map((r, i) => (
                  <div key={i} className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">{r.label}</div>
                      <div className="text-xs text-muted-foreground">{r.note}</div>
                    </div>
                    <Badge>{r.verdict}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
