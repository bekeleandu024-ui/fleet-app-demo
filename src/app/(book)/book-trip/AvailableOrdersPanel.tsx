"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { formatCPM, formatCurrency, formatDateTimeRange, formatMiles, formatPercent } from "@/lib/utils";
import type { AvailableOrderSummary } from "./types";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "today", label: "Today" },
  { value: "48h", label: "48h" },
  { value: "week", label: "7 days" },
] as const;

type FilterValue = (typeof FILTERS)[number]["value"];

interface AvailableOrdersPanelProps {
  orders: AvailableOrderSummary[];
  onUseOrder: (order: AvailableOrderSummary) => void;
  onAskAi: (order: AvailableOrderSummary) => void;
}

function matchesFilter(order: AvailableOrderSummary, filter: FilterValue) {
  if (filter === "all") return true;
  if (!order.puWindowStart) return false;
  const pickup = new Date(order.puWindowStart);
  const now = new Date();
  const hours = (pickup.getTime() - now.getTime()) / 36e5;
  switch (filter) {
    case "today":
      return pickup.toDateString() === now.toDateString();
    case "48h":
      return hours <= 48;
    case "week":
      return hours <= 24 * 7;
    default:
      return true;
  }
}

function urgencyVariant(label: string) {
  switch (label) {
    case "NOW":
      return "red" as const;
    case "HIGH":
      return "amber" as const;
    case "MEDIUM":
      return "sky" as const;
    default:
      return "muted" as const;
  }
}

export function AvailableOrdersPanel({ orders, onUseOrder, onAskAi }: AvailableOrdersPanelProps) {
  const [filter, setFilter] = React.useState<FilterValue>("all");

  const visibleOrders = React.useMemo(() => {
    return [...orders]
      .filter((order) => matchesFilter(order, filter))
      .sort((a, b) => b.urgency.score - a.urgency.score);
  }, [orders, filter]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Available Orders</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => {
            const isActive = filter === item.value;
            return (
              <Button
                key={item.value}
                type="button"
                size="sm"
                variant={isActive ? "default" : "outline"}
                onClick={() => setFilter(item.value)}
                aria-pressed={isActive}
              >
                {item.label}
              </Button>
            );
          })}
        </div>
        {visibleOrders.length === 0 ? (
          <p className="text-sm text-slate-400">No orders match the selected window.</p>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Customer</TableHeaderCell>
                <TableHeaderCell>Lane</TableHeaderCell>
                <TableHeaderCell>Pickup window</TableHeaderCell>
                <TableHeaderCell>Delivery window</TableHeaderCell>
                <TableHeaderCell>Urgency</TableHeaderCell>
                <TableHeaderCell>Miles</TableHeaderCell>
                <TableHeaderCell>Breakeven CPM</TableHeaderCell>
                <TableHeaderCell>Suggested rate</TableHeaderCell>
                <TableHeaderCell>Margin</TableHeaderCell>
                <TableHeaderCell className="sr-only">Actions</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleOrders.map((order) => {
                const pickupRange = formatDateTimeRange(
                  order.puWindowStart ? new Date(order.puWindowStart) : undefined,
                  order.puWindowEnd ? new Date(order.puWindowEnd) : undefined
                );
                const deliveryRange = formatDateTimeRange(
                  order.delWindowStart ? new Date(order.delWindowStart) : undefined,
                  order.delWindowEnd ? new Date(order.delWindowEnd) : undefined
                );
                return (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-100">{order.customer}</span>
                        <span className="text-xs text-slate-400">Created {new Date(order.createdAt).toLocaleDateString()}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-slate-300">
                        {order.origin} → {order.destination}
                      </div>
                      {order.requiredTruck && (
                        <p className="text-xs text-slate-500">Req: {order.requiredTruck}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-slate-300">{pickupRange}</TableCell>
                    <TableCell className="text-sm text-slate-300">{deliveryRange}</TableCell>
                    <TableCell>
                      <Badge variant={urgencyVariant(order.urgency.label)}>{order.urgency.label}</Badge>
                    </TableCell>
                    <TableCell>{order.milesEstimate != null ? formatMiles(order.milesEstimate) : "—"}</TableCell>
                    <TableCell>{order.breakevenCPM != null ? formatCPM(order.breakevenCPM) : "—"}</TableCell>
                    <TableCell>
                      {order.suggestedTotal != null ? (
                        <div className="flex flex-col text-sm">
                          <span>{formatCurrency(order.suggestedTotal)}</span>
                          {order.suggestedCPM != null && (
                            <span className="text-xs text-slate-400">{formatCPM(order.suggestedCPM)} CPM</span>
                          )}
                        </div>
                      ) : order.suggestedCPM != null ? (
                        <span className="text-sm text-slate-300">{formatCPM(order.suggestedCPM)} CPM</span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {order.marginAtSuggested != null ? (
                        <span className="text-sm text-slate-300">{formatPercent(order.marginAtSuggested)}</span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-2 text-sm">
                        <Button type="button" size="sm" onClick={() => onUseOrder(order)}>
                          Use for Booking
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => onAskAi(order)}>
                          Ask AI
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
