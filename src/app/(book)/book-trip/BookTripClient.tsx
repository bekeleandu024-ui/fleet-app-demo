"use client";

import * as React from "react";
import { AvailableOrdersPanel } from "./AvailableOrdersPanel";
import { AiAdvisorSheet } from "./AiAdvisorSheet";
import { BookTripForm, type BookTripFormHandle } from "./BookTripForm";
import type {
  AiRecommendation,
  AvailableOrderSummary,
  BookTripFormSnapshot,
  DriverOption,
  UnitOption,
} from "./types";

interface BookTripClientProps {
  orders: AvailableOrderSummary[];
  drivers: DriverOption[];
  units: UnitOption[];
  targetMargin: number;
}

export function BookTripClient({ orders, drivers, units, targetMargin }: BookTripClientProps) {
  const formRef = React.useRef<BookTripFormHandle>(null);
  const [aiOpen, setAiOpen] = React.useState(false);
  const [aiOrder, setAiOrder] = React.useState<AvailableOrderSummary | null>(null);
  const [aiSnapshot, setAiSnapshot] = React.useState<BookTripFormSnapshot | null>(null);

  const openSheet = React.useCallback(
    (order: AvailableOrderSummary | null, snapshot: BookTripFormSnapshot | null) => {
      setAiOrder(order);
      setAiSnapshot(snapshot);
      setAiOpen(true);
    },
    []
  );

  const handleUseOrder = (order: AvailableOrderSummary) => {
    formRef.current?.prefillFromOrder(order);
  };

  const handleAskAiFromPanel = (order: AvailableOrderSummary) => {
    const snapshot = formRef.current?.getSnapshot() ?? null;
    openSheet(order, snapshot);
  };

  const handleFormAskAi = ({ order, snapshot }: { order?: AvailableOrderSummary | null; snapshot: BookTripFormSnapshot }) => {
    openSheet(order ?? null, snapshot);
  };

  const applyRecommendation = (recommendation: AiRecommendation) => {
    formRef.current?.applyRecommendation(recommendation);
  };

  const handleBookNow = (recommendation: AiRecommendation) => {
    applyRecommendation(recommendation);
    formRef.current?.submit();
  };

  const handleSheetOpenChange = (open: boolean) => {
    setAiOpen(open);
    if (!open) {
      setAiOrder(null);
    }
  };

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,1fr)] xl:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]">
        <BookTripForm
          ref={formRef}
          drivers={drivers}
          units={units}
          availableOrders={orders}
          onAskAi={handleFormAskAi}
        />
        <AvailableOrdersPanel orders={orders} onUseOrder={handleUseOrder} onAskAi={handleAskAiFromPanel} />
      </div>
      <AiAdvisorSheet
        open={aiOpen}
        onOpenChange={handleSheetOpenChange}
        order={aiOrder ?? undefined}
        snapshot={aiSnapshot}
        drivers={drivers}
        units={units}
        targetMargin={targetMargin}
        onApply={applyRecommendation}
        onBookNow={handleBookNow}
      />
    </>
  );
}
