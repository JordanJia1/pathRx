import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "secondary" | "destructive" | "outline";

export function Button({
  className,
  variant = "default",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium " +
    "transition-all select-none " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
    "disabled:pointer-events-none disabled:opacity-60 " +
    "active:translate-y-[1px] active:scale-[0.99]";

  const styles =
    variant === "secondary"
      ? "bg-muted text-foreground hover:bg-muted/80 shadow-sm"
      : variant === "destructive"
        ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm"
        : variant === "outline"
          ? "border border-border bg-background hover:bg-muted shadow-sm"
          : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm";

  return (
    <button className={cn(base, styles, className)} {...props} />
  );
}
