import { cn } from "@/lib/utils";

export function Stepper({
  current,
  total,
  className
}: {
  current: number;
  total: number;
  className?: string;
}) {
  const safeTotal = Math.max(1, total);
  const safeCurrent = Math.min(Math.max(1, current), safeTotal);
  const percent = Math.round((safeCurrent / safeTotal) * 100);

  return (
    <div className={cn("min-w-52 space-y-2", className)}>
      <div className="flex items-center gap-2">
        {Array.from({ length: safeTotal }).map((_, i) => {
          const done = i + 1 < safeCurrent;
          const active = i + 1 === safeCurrent;
          return (
            <div
              key={i}
              className={cn(
                "h-2 w-10 rounded-full border transition-colors",
                done && "border-primary/70 bg-primary",
                active && "border-primary bg-primary/70",
                !done && !active && "border-border bg-muted"
              )}
            />
          );
        })}
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="text-xs text-muted-foreground">
        Step {safeCurrent} of {safeTotal}
      </div>
    </div>
  );
}
