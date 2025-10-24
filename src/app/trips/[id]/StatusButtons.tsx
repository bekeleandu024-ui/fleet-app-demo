"use client";

import { useCallback } from "react";

interface StatusButtonsProps {
  id: string;
  status: string;
}

export default function StatusButtons({ id, status }: StatusButtonsProps) {
  const setStatus = useCallback(
    async (s: string) => {
      const res = await fetch(`/api/trips/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: s }),
      });
      if (res.ok) {
        location.reload();
      } else {
        alert(await res.text());
      }
    },
    [id],
  );

  const Btn = (p: JSX.IntrinsicElements["button"]) => (
    <button type="button" className="px-3 py-2 rounded border" {...p} />
  );

  return (
    <div className="space-x-2">
      {status === "Created" && (
        <Btn onClick={() => setStatus("Dispatched")}>Dispatch</Btn>
      )}
      {status === "Dispatched" && (
        <Btn onClick={() => setStatus("InProgress")}>Start</Btn>
      )}
      {status === "InProgress" && (
        <Btn onClick={() => setStatus("Completed")}>Complete</Btn>
      )}
      {(status === "Created" || status === "Dispatched" || status === "InProgress") && (
        <Btn onClick={() => setStatus("Cancelled")}>Cancel</Btn>
      )}
    </div>
  );
}
