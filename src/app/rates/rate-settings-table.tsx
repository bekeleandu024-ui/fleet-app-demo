"use client";

import { useMemo, useState } from "react";

export type RateSettingItem = {
  id: string;
  rateKey: string;
  category: string;
  unit: string;
  value: number;
  note: string | null;
  updatedAt: string;
};

type DraftRow = {
  rateKey: string;
  category: string;
  unit: string;
  value: string;
  note: string;
};

type Props = {
  items: RateSettingItem[];
};

export default function RateSettingsTable({ items }: Props) {
  const [rows, setRows] = useState(() =>
    items.map<RateSettingItem & { editing: boolean; draft: DraftRow | null }>((item) => ({
      ...item,
      editing: false,
      draft: null,
    }))
  );
  const [savingId, setSavingId] = useState<string | null>(null);

  const lastUpdated = useMemo(() => {
    if (!rows.length) return null;
    const max = rows.reduce((latest, row) => {
      const time = new Date(row.updatedAt).getTime();
      return time > latest ? time : latest;
    }, 0);
    return max ? new Date(max) : null;
  }, [rows]);

  function startEditing(id: string) {
    setRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              editing: true,
              draft: {
                rateKey: row.rateKey,
                category: row.category,
                unit: row.unit,
                value: row.value.toString(),
                note: row.note ?? "",
              },
            }
          : row
      )
    );
  }

  function cancelEditing(id: string) {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, editing: false, draft: null } : row))
    );
  }

  function updateDraft(id: string, updater: (row: DraftRow) => DraftRow) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        if (!row.draft) return row;
        const next = updater(row.draft);
        return { ...row, draft: next };
      })
    );
  }

  async function saveRow(id: string) {
    const current = rows.find((row) => row.id === id);
    if (!current || !current.draft) return;

    const valueText = current.draft.value.trim();
    const parsedValue = Number(valueText);

    const payload = {
      rateKey: current.draft.rateKey.trim(),
      category: current.draft.category.trim(),
      unit: current.draft.unit.trim(),
      note: current.draft.note.trim().length ? current.draft.note.trim() : undefined,
      value: parsedValue,
    };

    if (!payload.rateKey || !payload.category || !payload.unit) {
      alert("Key, category, and unit are required.");
      return;
    }

    if (!valueText || !Number.isFinite(parsedValue)) {
      alert("Value must be a valid number.");
      return;
    }

    setSavingId(id);
    try {
      const res = await fetch(`/api/rate-settings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => null);
        throw new Error(error?.error ?? "Failed to update rate entry");
      }

      const updated = (await res.json()) as RateSettingItem;
      setRows((prev) =>
        prev.map((row) =>
          row.id === id
            ? { ...row, ...updated, editing: false, draft: null }
            : row
        )
      );
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to update rate entry");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Key</th>
            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Category</th>
            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Rate</th>
            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Unit</th>
            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Note</th>
            <th className="px-4 py-2 text-right text-sm font-semibold text-gray-700">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {rows.map((row) => (
            <tr key={row.id} className={row.editing ? "bg-amber-50" : undefined}>
                <td className="px-4 py-2 align-top">
                  {row.editing ? (
                    <input
                      className="w-full rounded border px-2 py-1 text-sm"
                      value={row.draft?.rateKey ?? ""}
                      onChange={(event) =>
                        updateDraft(row.id, (current) => ({ ...current, rateKey: event.target.value }))
                      }
                    />
                  ) : (
                    <span className="font-medium">{row.rateKey}</span>
                  )}
                </td>
                <td className="px-4 py-2 align-top">
                  {row.editing ? (
                    <input
                      className="w-full rounded border px-2 py-1 text-sm"
                      value={row.draft?.category ?? ""}
                      onChange={(event) =>
                        updateDraft(row.id, (current) => ({ ...current, category: event.target.value }))
                      }
                    />
                  ) : (
                    row.category
                  )}
                </td>
                <td className="px-4 py-2 align-top">
                  {row.editing ? (
                    <input
                      type="number"
                      step="0.01"
                      className="w-28 rounded border px-2 py-1 text-sm"
                      value={row.draft?.value ?? ""}
                      onChange={(event) =>
                        updateDraft(row.id, (current) => ({ ...current, value: event.target.value }))
                      }
                    />
                  ) : (
                    row.value.toFixed(2)
                  )}
                </td>
                <td className="px-4 py-2 align-top">
                  {row.editing ? (
                    <input
                      className="w-full rounded border px-2 py-1 text-sm"
                      value={row.draft?.unit ?? ""}
                      onChange={(event) =>
                        updateDraft(row.id, (current) => ({ ...current, unit: event.target.value }))
                      }
                    />
                  ) : (
                    row.unit
                  )}
                </td>
                <td className="px-4 py-2 align-top">
                  {row.editing ? (
                    <input
                      className="w-full rounded border px-2 py-1 text-sm"
                      value={row.draft?.note ?? ""}
                      onChange={(event) =>
                        updateDraft(row.id, (current) => ({ ...current, note: event.target.value }))
                      }
                    />
                  ) : row.note ? (
                    row.note
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-2 text-right align-top">
                  {row.editing ? (
                    <div className="flex justify-end gap-2 text-sm">
                      <button
                        type="button"
                        className="rounded border px-3 py-1"
                        onClick={() => cancelEditing(row.id)}
                        disabled={savingId === row.id}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="rounded bg-black px-3 py-1 text-white disabled:opacity-60"
                        onClick={() => saveRow(row.id)}
                        disabled={savingId === row.id}
                      >
                        {savingId === row.id ? "Saving..." : "Save"}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="rounded border px-3 py-1 text-sm"
                      onClick={() => startEditing(row.id)}
                    >
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
      {lastUpdated && (
        <div className="border-t px-4 py-2 text-right text-xs text-gray-500">
          Last updated {lastUpdated.toLocaleString()}
        </div>
      )}
    </div>
  );
}
