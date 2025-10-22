import { NextResponse } from "next/server";
import prisma from "@/src/server/prisma";

const encoder = new TextEncoder();

function formatCell(value: unknown): string {
  if (value == null) return "";
  const text = value instanceof Date ? value.toISOString() : value.toString();
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const weekParam = url.searchParams.get("week");

  let weekDate: Date | undefined;
  if (weekParam) {
    const parsed = new Date(weekParam);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json({ error: "Invalid week parameter" }, { status: 400 });
    }
    weekDate = parsed;
  }

  const trips = await prisma.trip.findMany({
    where: weekDate ? { weekStart: weekDate } : undefined,
    orderBy: { createdAt: "desc" },
  });

  const header = [
    "id",
    "driver",
    "unit",
    "miles",
    "revenue",
    "totalCost",
    "profit",
    "marginPct",
    "status",
    "tripStart",
    "tripEnd",
    "weekStart",
  ].join(",");

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(header + "\n"));
      for (const trip of trips) {
        const row = [
          trip.id,
          trip.driver,
          trip.unit,
          trip.miles?.toString(),
          trip.revenue?.toString(),
          trip.totalCost?.toString(),
          trip.profit?.toString(),
          trip.marginPct != null ? trip.marginPct.toString() : "",
          trip.status,
          trip.tripStart ? trip.tripStart.toISOString() : "",
          trip.tripEnd ? trip.tripEnd.toISOString() : "",
          trip.weekStart ? trip.weekStart.toISOString() : "",
        ]
          .map(formatCell)
          .join(",");
        controller.enqueue(encoder.encode(row + "\n"));
      }
      controller.close();
    },
  });

  const filename = weekDate
    ? `trips-${weekDate.toISOString().slice(0, 10)}.csv`
    : "trips.csv";

  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
