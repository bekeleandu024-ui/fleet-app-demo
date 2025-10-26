import { clsx } from "clsx";

type StatusPillProps = {
  active: boolean;
};

export function StatusPill({ active }: StatusPillProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        active
          ? "bg-emerald-500/10 text-emerald-300 ring-1 ring-inset ring-emerald-500/40"
          : "bg-rose-500/10 text-rose-300 ring-1 ring-inset ring-rose-500/40"
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {active ? "Active" : "Inactive"}
    </span>
  );
}
