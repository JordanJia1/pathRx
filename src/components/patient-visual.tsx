import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export type Patient = {
  age: number;
  sex: "male" | "female";
  bmi: number;
  a1c: number;
  egfr: number;
  cost: "low" | "medium" | "high";
  onMetformin: boolean;
  risk?: { ascvd?: boolean; hf?: boolean; ckd?: boolean };
};

export function PatientVisual({ patient }: { patient?: Patient }) {
  if (!patient) {
    return (
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Patient</CardTitle>
          <p className="text-sm text-muted-foreground">Loading…</p>
        </CardHeader>
      </Card>
    );
  }

  const tags: string[] = [];
  if (patient.risk?.ascvd) tags.push("ASCVD");
  if (patient.risk?.hf) tags.push("HF");
  if (patient.risk?.ckd) tags.push("CKD");
  if (patient.onMetformin) tags.push("On metformin");

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-base">Patient snapshot</CardTitle>
        <p className="text-sm text-muted-foreground">Quick visual cues (script theory).</p>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="text-xs text-muted-foreground">Age</div>
            <div className="font-medium">{patient.age}</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="text-xs text-muted-foreground">Sex</div>
            <div className="font-medium">{patient.sex}</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="text-xs text-muted-foreground">A1C</div>
            <div className="font-medium">{patient.a1c}%</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="text-xs text-muted-foreground">eGFR</div>
            <div className="font-medium">{patient.egfr}</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="text-xs text-muted-foreground">BMI</div>
            <div className="font-medium">{patient.bmi}</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="text-xs text-muted-foreground">Cost</div>
            <div className="font-medium capitalize">{patient.cost}</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {tags.length ? tags.map((t) => <Badge key={t}>{t}</Badge>) : <Badge>General</Badge>}
        </div>
      </CardContent>
    </Card>
  );
}
