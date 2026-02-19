import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function CaseSummary({
  title,
  bullets,
  tags,
  presentingComplaints,
  managementGoals
}: {
  title?: string;
  bullets?: string[];
  tags?: string[];
  presentingComplaints?: string[];
  managementGoals?: string[];
}) {
  const safeBullets = Array.isArray(bullets) ? bullets : [];
  const safeTags = Array.isArray(tags) ? tags : [];
  const safeComplaints = Array.isArray(presentingComplaints) ? presentingComplaints : [];
  const safeGoals = Array.isArray(managementGoals) ? managementGoals : [];

  return (
    <Card className="rounded-2xl border-indigo-400/60 bg-gradient-to-br from-indigo-50 to-background shadow-md ring-1 ring-indigo-300/40">
      <CardHeader>
        <CardTitle className="text-base">{title ?? "Case summary"}</CardTitle>
        <div className="flex flex-wrap gap-2 pt-1">
          {safeTags.length ? safeTags.map((t) => <Badge key={t}>{t}</Badge>) : <Badge>Loading</Badge>}
        </div>
      </CardHeader>

      <CardContent>
        {(safeComplaints.length || safeGoals.length) ? (
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-indigo-300/40 bg-white p-3 shadow-sm">
              <div className="text-xs font-medium text-muted-foreground">Presenting Complaints</div>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                {(safeComplaints.length ? safeComplaints : ["Not specified"]).map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-indigo-300/40 bg-white p-3 shadow-sm">
              <div className="text-xs font-medium text-muted-foreground">Long-Term Goals</div>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                {(safeGoals.length ? safeGoals : ["Not specified"]).map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}

        {safeBullets.length ? (
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            {safeBullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        ) : (
          <div className="text-sm text-muted-foreground">Loading…</div>
        )}
      </CardContent>
    </Card>
  );
}
