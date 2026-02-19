import { Suspense } from "react";
import NewCaseClient from "./new-case-client";
import { AiThinkingBar } from "@/components/ai-thinking-bar";

export default function NewCasePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-background">
          <div className="mx-auto max-w-4xl px-6 py-10">
            <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
              Loading…
            </div>
          </div>
        </main>
      }
    >
      <NewCaseClient />
    </Suspense>
  );
}
