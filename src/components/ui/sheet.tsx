"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type SheetContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const SheetContext = React.createContext<SheetContextValue | null>(null);

export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function Sheet({ open, onOpenChange, children }: SheetProps) {
  const context = React.useMemo<SheetContextValue>(
    () => ({ open, setOpen: onOpenChange }),
    [open, onOpenChange]
  );

  return <SheetContext.Provider value={context}>{children}</SheetContext.Provider>;
}

export interface SheetContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: "right" | "left" | "bottom" | "top";
}

export function SheetContent({ side = "right", className, children, ...props }: SheetContentProps) {
  const ctx = React.useContext(SheetContext);
  const [mounted, setMounted] = React.useState(false);
  const contentRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!ctx?.open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        ctx.setOpen(false);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [ctx]);

  React.useEffect(() => {
    if (!ctx?.open || !contentRef.current) return;
    contentRef.current.focus({ preventScroll: true });
  }, [ctx?.open]);

  if (!ctx?.open || !mounted) return null;

  const positionClasses: Record<Required<SheetContentProps>["side"], string> = {
    right: "inset-y-0 right-0 w-full max-w-xl",
    left: "inset-y-0 left-0 w-full max-w-xl",
    bottom: "inset-x-0 bottom-0 w-full max-h-[90vh]",
    top: "inset-x-0 top-0 w-full max-h-[90vh]",
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex">
      <div
        role="presentation"
        className="absolute inset-0 bg-black/60"
        onClick={() => ctx.setOpen(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        ref={contentRef}
        className={cn(
          "relative ml-auto flex w-full flex-col overflow-y-auto bg-slate-950/95 text-slate-100 shadow-2xl outline-none",
          positionClasses[side],
          className
        )}
        {...props}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

export function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("border-b border-slate-800 p-6", className)} {...props} />;
}

export function SheetTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-lg font-semibold", className)} {...props} />;
}

export function SheetDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-slate-400", className)} {...props} />;
}

export function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("border-t border-slate-800 p-6", className)} {...props} />;
}
