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
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {Array.from({ length: total }).map((_, i) => {
        const active = i + 1 <= current;
        return (
          <div
            key={i}
            className={cn(
              "h-2 w-12 rounded-full border border-border",
              active ? "bg-primary" : "bg-muted"
            )}
          />
        );
      })}
      <div className="ml-2 text-xs text-muted-foreground">
        Step {current} of {total}
      </div>
    </div>
  );
}
