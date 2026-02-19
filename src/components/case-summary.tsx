import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function CaseSummary({
  title,
  bullets,
  tags
}: {
  title?: string;
  bullets?: string[];
  tags?: string[];
}) {
  const safeBullets = Array.isArray(bullets) ? bullets : [];
  const safeTags = Array.isArray(tags) ? tags : [];

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-base">{title ?? "Case summary"}</CardTitle>
        <div className="flex flex-wrap gap-2 pt-1">
          {safeTags.length ? safeTags.map((t) => <Badge key={t}>{t}</Badge>) : <Badge>Loading</Badge>}
        </div>
      </CardHeader>

      <CardContent>
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
