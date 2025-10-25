import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "sky" | "amber" | "red" | "green" | "muted";

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-slate-800 text-slate-100",
  sky: "bg-sky-500/15 text-sky-200 border border-sky-500/40",
  amber: "bg-amber-500/15 text-amber-200 border border-amber-400/50",
  red: "bg-red-500/15 text-red-200 border border-red-400/40",
  green: "bg-emerald-500/15 text-emerald-200 border border-emerald-400/40",
  muted: "bg-slate-800/80 text-slate-300 border border-slate-700",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
