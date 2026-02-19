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
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-emerald-500 transition-all duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="text-xs text-muted-foreground">
        Step {safeCurrent} of {safeTotal}
      </div>
    </div>
  );
}
