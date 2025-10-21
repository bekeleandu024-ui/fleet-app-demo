"use client";

import { useState } from "react";

export default function AddEvent({ tripId }: { tripId: string }) {
  const [loading, setLoading] = useState<string | null>(null);

  async function post(type: string, extra?: { location?: string; notes?: string }) {
    setLoading(type);
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tripId,
        type,
        at: new Date().toISOString(),
        location: extra?.location ?? undefined,
        notes: extra?.notes ?? undefined,
      }),
    });
    setLoading(null);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j.error ?? "Failed to add event");
      return;
    }
    // refresh the server component to show the new event
    location.reload();
  }

  const btn = "px-3 py-1.5 border rounded text-sm";
  const disabled = (t: string) => loading === t;

  return (
    <div className="flex flex-wrap gap-2">
      <button className={btn} disabled={disabled("TripStarted")} onClick={() => post("TripStarted")}>
        {disabled("TripStarted") ? "…" : "Trip Started"}
      </button>
      <button className={btn} disabled={disabled("ArrivedPU")} onClick={() => post("ArrivedPU")}>
        {disabled("ArrivedPU") ? "…" : "Arrived PU"}
      </button>
      <button className={btn} disabled={disabled("LeftPU")} onClick={() => post("LeftPU")}>
        {disabled("LeftPU") ? "…" : "Left PU"}
      </button>
      <button className={btn} disabled={disabled("CrossedBorder")} onClick={() => post("CrossedBorder")}>
        {disabled("CrossedBorder") ? "…" : "Crossed Border"}
      </button>
      <button className={btn} disabled={disabled("ArrivedDEL")} onClick={() => post("ArrivedDEL")}>
        {disabled("ArrivedDEL") ? "…" : "Arrived DEL"}
      </button>
      <button className={btn} disabled={disabled("FinishedDEL")} onClick={() => post("FinishedDEL")}>
        {disabled("FinishedDEL") ? "…" : "Finished DEL"}
      </button>
    </div>
  );
}
