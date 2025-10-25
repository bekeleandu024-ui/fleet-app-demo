import * as React from "react";
import { cn } from "@/lib/utils";

export function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-800">
      <table
        className={cn(
          "min-w-full divide-y divide-slate-800 bg-slate-950/60 text-sm text-slate-200",
          className
        )}
        {...props}
      />
    </div>
  );
}

export function TableHead(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400" {...props} />;
}

export function TableBody(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className="divide-y divide-slate-800" {...props} />;
}

export function TableRow(props: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className="focus-within:bg-slate-900/70 hover:bg-slate-900/60" {...props} />;
}

export function TableHeaderCell({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn("px-4 py-3 text-left font-medium", className)} {...props} />;
}

export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-4 py-3 align-top", className)} {...props} />;
}
