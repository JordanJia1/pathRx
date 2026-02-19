"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export type DecisionPayload = {
  medicationClass: string;
  specificDrug?: string;
  justification: string;
};

export function DecisionForm({
  stepPrompt,
  onSubmit,
  disabled
}: {
  stepPrompt: string;
  onSubmit: (decision: DecisionPayload) => void | Promise<void>;
  disabled?: boolean;
}) {
  const [medicationClass, setMedicationClass] = React.useState("");
  const [specificDrug, setSpecificDrug] = React.useState("");
  const [justification, setJustification] = React.useState("");

  const canSubmit =
    medicationClass.trim().length > 0 && justification.trim().length > 0 && !disabled;

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-base">Your decision</CardTitle>
        <p className="text-sm text-muted-foreground">{stepPrompt}</p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">Medication class</div>
          <Input
            placeholder="e.g., SGLT2 inhibitor, GLP-1 RA"
            value={medicationClass}
            onChange={(e) => setMedicationClass(e.target.value)}
            disabled={disabled}
          />
        </div>

        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">Justification</div>
          <Textarea
            rows={4}
            placeholder="2–4 bullets worth of reasoning: priorities, constraints, benefits/risks."
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            disabled={disabled}
          />
          <div className="text-xs text-muted-foreground">
            Tip: keep it short (cognitive load). Use only currently released markers.
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">Specific drug (optional)</div>
          <Input
            placeholder="e.g., empagliflozin"
            value={specificDrug}
            onChange={(e) => setSpecificDrug(e.target.value)}
            disabled={disabled}
          />
        </div>

        <div className="flex justify-end">
          <Button
            onClick={() =>
              onSubmit({
                medicationClass: medicationClass.trim(),
                specificDrug: specificDrug.trim() || undefined,
                justification: justification.trim()
              })
            }
            disabled={!canSubmit}
          >
            Submit
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
