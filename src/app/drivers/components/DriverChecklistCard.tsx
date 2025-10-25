"use client";

import Link from "next/link";
import { useMemo } from "react";

type PlainDriver = {
  id?: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  homeBase?: string | null;
  licenseNumber: string;
  licenseJurisdiction: string;
  licenseClass: string;
  licenseEndorsements: string[];
  licenseExpiresAt: string;
  medicalExpiresAt?: string | null;
  drugTestDate?: string | null;
  mvrDate?: string | null;
  payType?: "Hourly" | "CPM" | null;
  rate?: number | null;
  cpm?: number | null;
  deductionsProfileId?: string | null;
  status: "Active" | "Inactive";
  inactiveReason?: string | null;
  inactiveAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type ChecklistItem = {
  key: string;
  level: "pass" | "warn" | "fail";
  message: string;
  anchor?: string;
};

type DriverChecklistCardProps = {
  driver: PlainDriver | null;
  violations: ChecklistItem[];
};

const LEVEL_STYLES: Record<ChecklistItem["level"], { icon: JSX.Element; badge: string }> = {
  pass: {
    icon: (
      <svg aria-hidden className="h-5 w-5 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.286 4.52-1.78-1.78a.75.75 0 10-1.06 1.06l2.4 2.4a.75.75 0 001.153-.098l3.787-5.22z"
          clipRule="evenodd"
        />
      </svg>
    ),
    badge: "text-emerald-600",
  },
  warn: {
    icon: (
      <svg aria-hidden className="h-5 w-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 2a1 1 0 01.894.553l7 14A1 1 0 0117 18H3a1 1 0 01-.894-1.447l7-14A1 1 0 0110 2zm0 4a.75.75 0 00-.75.75v4.5a.75.75 0 001.5 0v-4.5A.75.75 0 0010 6zm0 8a1 1 0 100 2 1 1 0 000-2z" />
      </svg>
    ),
    badge: "text-amber-600",
  },
  fail: {
    icon: (
      <svg aria-hidden className="h-5 w-5 text-rose-500" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.536-10.95a.75.75 0 10-1.06-1.06L10 8.464 7.525 6a.75.75 0 10-1.06 1.06L8.94 9.525 6.464 12a.75.75 0 101.06 1.06L10 10.586l2.475 2.475a.75.75 0 101.06-1.06L11.06 9.525z"
          clipRule="evenodd"
        />
      </svg>
    ),
    badge: "text-rose-600",
  },
};

export default function DriverChecklistCard({ driver, violations }: DriverChecklistCardProps) {
  const items = useMemo(() => violations.slice(0, 5), [violations]);

  return (
    <aside className="rounded-xl border border-border bg-card/60 p-4 shadow-sm">
      <header className="mb-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Compliance</p>
        <h2 className="text-lg font-semibold">{driver ? driver.name : "No driver selected"}</h2>
        {driver?.status === "Inactive" && (
          <span className="mt-1 inline-block rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-600">
            Inactive
          </span>
        )}
      </header>

      <ol className="space-y-3">
        {items.map((item) => {
          const style = LEVEL_STYLES[item.level];
          return (
            <li key={item.key} className="flex items-start gap-3 text-sm">
              <span className="mt-0.5">{style.icon}</span>
              <div className="flex-1">
                <p className={`font-medium ${style.badge}`}>{item.message}</p>
                {item.anchor && (
                  <Link
                    href={`#${item.anchor}`}
                    className="mt-1 inline-flex text-xs font-medium text-primary underline-offset-2 hover:underline"
                  >
                    Fix
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
