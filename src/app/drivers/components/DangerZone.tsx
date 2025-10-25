"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { deleteDriverAction } from "../actions";

export const DRIVER_FORM_ID = "driver-editor-form";

type DangerZoneProps = {
  driverId?: string;
  driverName?: string;
  status: "Active" | "Inactive";
  onDeactivate?: (inactive: boolean) => void;
};

type Toast = { message: string; tone: "success" | "error" } | null;

export default function DangerZone({ driverId, driverName, status, onDeactivate }: DangerZoneProps) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [deactivate, setDeactivate] = useState(status === "Inactive");
  const [toast, setToast] = useState<Toast>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setDeactivate(status === "Inactive");
  }, [status]);

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timeout);
  }, [toast]);

  const closeModal = () => {
    setShowModal(false);
    setConfirmation("");
  };

  const handleDelete = () => {
    if (!driverId) return;
    startTransition(async () => {
      const result = await deleteDriverAction(driverId);
      if (result.ok) {
        setToast({ message: "Driver deleted", tone: "success" });
        closeModal();
        router.push("/drivers");
        router.refresh();
      } else {
        setToast({ message: result.error, tone: "error" });
      }
    });
  };

  const handleToggle = (value: boolean) => {
    setDeactivate(value);
    onDeactivate?.(value);
  };

  const disabled = !driverId || isPending;
  const confirmationMatches = confirmation.trim() === (driverName ?? "");

  return (
    <aside className="rounded-xl border border-border bg-card/60 p-4 shadow-sm">
      <div className="space-y-4">
        <header>
          <h2 className="text-lg font-semibold text-foreground">Danger zone</h2>
          <p className="text-sm text-muted-foreground">Delete or deactivate this driver.</p>
        </header>

        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
          <p className="text-sm font-medium text-destructive">Delete driver</p>
          <p className="mt-1 text-xs text-muted-foreground">
            This action permanently removes the driver record. Trips will remain.
          </p>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="mt-3 inline-flex items-center justify-center rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground shadow-sm transition hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2"
            disabled={disabled}
          >
            Delete driver
          </button>
        </div>

        <div className="rounded-lg border border-amber-400/50 bg-amber-100/40 p-4 dark:border-amber-500/40 dark:bg-amber-500/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100">Deactivate driver</p>
              <p className="text-xs text-amber-800/80 dark:text-amber-200/80">
                Toggle off to mark the driver inactive.
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={deactivate}
                onChange={(event) => handleToggle(event.target.checked)}
              />
              <span className="h-6 w-11 rounded-full bg-muted peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-amber-500 peer-checked:bg-amber-500"></span>
              <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-5" />
            </label>
          </div>

          {deactivate && (
            <div className="mt-4 space-y-3 text-sm">
              <div className="space-y-1">
                <label htmlFor="inactiveReasonPreview" className="text-xs font-medium text-amber-900 dark:text-amber-100">
                  Inactive reason
                </label>
                <textarea
                  id="inactiveReasonPreview"
                  className="min-h-[80px] w-full rounded-md border border-amber-500/50 bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  placeholder="Document why the driver is inactive in the form"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="inactiveAtPreview" className="text-xs font-medium text-amber-900 dark:text-amber-100">
                  Inactive date
                </label>
                <input
                  id="inactiveAtPreview"
                  type="date"
                  className="h-10 w-full rounded-md border border-amber-500/50 bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <h3 className="text-lg font-semibold">Confirm deletion</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Type <span className="font-semibold">{driverName ?? ""}</span> to confirm you want to delete this driver.
            </p>
            <input
              type="text"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              className="mt-4 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
              placeholder={driverName ?? "Driver name"}
            />
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-border"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!confirmationMatches || isPending}
                onClick={handleDelete}
                className="rounded-md bg-destructive px-3 py-1.5 text-sm font-semibold text-destructive-foreground shadow-sm transition hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-destructive"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 transform">
          <div
            className={`rounded-full px-4 py-2 text-sm font-medium shadow-lg ${
              toast.tone === "success"
                ? "bg-emerald-500 text-white"
                : "bg-destructive text-destructive-foreground"
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}
    </aside>
  );
}
