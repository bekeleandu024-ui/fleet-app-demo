"use client";

import { useCallback, useEffect, useState } from "react";

export type ToastVariant = "default" | "destructive" | "success" | "warning";

export type ToastPayload = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
};

export type ToastMessage = ToastPayload & { id: number };

const EVENT_NAME = "app-toast";

export function useToast() {
  const toast = useCallback((payload: ToastPayload) => {
    if (typeof window === "undefined") return;
    const event = new CustomEvent<ToastPayload>(EVENT_NAME, { detail: payload });
    window.dispatchEvent(event);
  }, []);

  return { toast };
}

export function ToastViewport() {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<ToastPayload>).detail;
      if (!detail) return;
      setMessages(prev => {
        const next: ToastMessage = {
          id: Date.now() + Math.floor(Math.random() * 1000),
          ...detail,
        };
        return [...prev, next];
      });
    };
    window.addEventListener(EVENT_NAME, handler as EventListener);
    return () => window.removeEventListener(EVENT_NAME, handler as EventListener);
  }, []);

  useEffect(() => {
    if (!messages.length) return;
    const timers = messages.map(message =>
      window.setTimeout(() => {
        setMessages(prev => prev.filter(item => item.id !== message.id));
      }, message.duration ?? 4000),
    );
    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
    };
  }, [messages]);

  if (!messages.length) {
    return <div aria-live="polite" className="sr-only" />;
  }

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
      <div role="status" aria-live="polite" className="w-full max-w-sm space-y-2">
        {messages.map(message => (
          <div
            key={message.id}
            className={`rounded-md border px-4 py-3 shadow-lg backdrop-blur-sm ${
              message.variant === "destructive"
                ? "border-red-400 bg-red-100/90 text-red-900"
                : message.variant === "success"
                ? "border-emerald-400 bg-emerald-100/90 text-emerald-900"
                : message.variant === "warning"
                ? "border-amber-400 bg-amber-100/90 text-amber-900"
                : "border-slate-300 bg-white/90 text-slate-900"
            }`}
          >
            <p className="font-medium">{message.title}</p>
            {message.description ? <p className="text-sm text-slate-700">{message.description}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
