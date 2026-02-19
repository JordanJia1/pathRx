"use client";

import * as React from "react";
import { Progress } from "@/components/ui/progress";

export function AiThinkingBar({ active, label }: { active: boolean; label?: string }) {
  const [v, setV] = React.useState(0);

  React.useEffect(() => {
    if (!active) {
      setV(0);
      return;
    }

    setV(8);
    const id = setInterval(() => {
      setV((prev) => {
        if (prev >= 92) return prev;
        const bump = prev < 40 ? 6 : prev < 70 ? 3 : 1;
        return Math.min(92, prev + bump);
      });
    }, 250);

    return () => clearInterval(id);
  }, [active]);

  if (!active) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-medium">{label ?? "AI is thinking…"}</div>
        <div className="text-xs text-muted-foreground">{v}%</div>
      </div>
      <Progress value={v} />
      <div className="mt-2 text-xs text-muted-foreground">
        Retrieving guideline evidence → generating concise output → validating JSON.
      </div>
    </div>
  );
}
