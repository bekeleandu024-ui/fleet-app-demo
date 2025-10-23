"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FleetSnapshot, FleetTruckMarker, FleetTruckStatus } from "@/types/fleet";

declare global {
  interface Window {
    maplibregl?: any;
  }
}

type FleetTrucksMapProps = {
  fleet?: FleetSnapshot | null;
};

type MapBounds = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

const EMPTY_SNAPSHOT: FleetSnapshot = {
  generatedAt: new Date(0).toISOString(),
  markerOrder: [],
  trucksById: {},
};

const MAPLIBRE_STYLE_URL = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const MAPLIBRE_SCRIPT_URL = "https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js";
const MAPLIBRE_CSS_URL = "https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css";

const DEFAULT_CENTER: [number, number] = [-79.4163, 43.7001];
const DEFAULT_ZOOM = 7;

function buildBounds(markers: FleetTruckMarker[]): MapBounds | null {
  if (!markers.length) return null;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  let minLng = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;

  for (const marker of markers) {
    if (!Number.isFinite(marker.lat) || !Number.isFinite(marker.lng)) {
      continue;
    }
    minLat = Math.min(minLat, marker.lat);
    maxLat = Math.max(maxLat, marker.lat);
    minLng = Math.min(minLng, marker.lng);
    maxLng = Math.max(maxLng, marker.lng);
  }

  if (
    !Number.isFinite(minLat) ||
    !Number.isFinite(maxLat) ||
    !Number.isFinite(minLng) ||
    !Number.isFinite(maxLng)
  ) {
    return null;
  }

  if (Math.abs(maxLat - minLat) < 0.001) {
    minLat -= 0.05;
    maxLat += 0.05;
  }
  if (Math.abs(maxLng - minLng) < 0.001) {
    minLng -= 0.05;
    maxLng += 0.05;
  }

  return { minLat, maxLat, minLng, maxLng };
}

function formatStatus(status: FleetTruckStatus) {
  switch (status) {
    case "available":
      return "Available";
    case "assigned":
      return "Assigned";
    case "in-transit":
      return "In transit";
    case "inactive":
      return "Inactive";
    default:
      return status;
  }
}

function badgeTone(status: FleetTruckStatus) {
  switch (status) {
    case "available":
      return "border-emerald-200 bg-emerald-100 text-emerald-700";
    case "assigned":
      return "border-amber-200 bg-amber-100 text-amber-700";
    case "in-transit":
      return "border-sky-200 bg-sky-100 text-sky-700";
    case "inactive":
      return "border-gray-200 bg-gray-100 text-gray-600";
    default:
      return "border-gray-200 bg-gray-100 text-gray-600";
  }
}

function listTone(status: FleetTruckStatus) {
  switch (status) {
    case "available":
      return "text-emerald-600";
    case "assigned":
      return "text-amber-600";
    case "in-transit":
      return "text-sky-600";
    case "inactive":
      return "text-gray-500";
    default:
      return "text-gray-600";
  }
}

function statusColor(status: FleetTruckStatus) {
  switch (status) {
    case "available":
      return "#10b981";
    case "assigned":
      return "#f59e0b";
    case "in-transit":
      return "#0ea5e9";
    case "inactive":
    default:
      return "#94a3b8";
  }
}

function formatRelativeTimeFromNow(iso: string | null | undefined) {
  if (!iso) return null;
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return null;
  const diffInSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const thresholds: Array<{
    limit: number;
    divisor: number;
    unit: Intl.RelativeTimeFormatUnit;
  }> = [
    { limit: 60, divisor: 1, unit: "second" },
    { limit: 3600, divisor: 60, unit: "minute" },
    { limit: 86400, divisor: 3600, unit: "hour" },
    { limit: 604800, divisor: 86400, unit: "day" },
    { limit: 2629800, divisor: 604800, unit: "week" },
    { limit: 31557600, divisor: 2629800, unit: "month" },
  ];

  for (const { limit, divisor, unit } of thresholds) {
    if (Math.abs(diffInSeconds) < limit) {
      return rtf.format(Math.round(diffInSeconds / divisor), unit);
    }
  }

  return rtf.format(Math.round(diffInSeconds / 31557600), "year");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function createPopupHtml(truck: FleetTruckMarker) {
  const chunks: string[] = [];
  chunks.push(`<div class="truck-popup__title">${escapeHtml(truck.label)}</div>`);
  chunks.push(
    `<div class="truck-popup__status" data-status="${truck.status}">${escapeHtml(
      formatStatus(truck.status)
    )}</div>`
  );
  if (truck.city) {
    chunks.push(`<div class="truck-popup__meta">${escapeHtml(truck.city)}</div>`);
  }
  if (truck.driver) {
    chunks.push(`<div class="truck-popup__meta">Driver ${escapeHtml(truck.driver)}</div>`);
  }
  if (truck.notes) {
    chunks.push(`<div class="truck-popup__note">${escapeHtml(truck.notes)}</div>`);
  }
  if (truck.lastEvent) {
    const absolute = new Date(truck.lastEvent).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
    const relative = formatRelativeTimeFromNow(truck.lastEvent);
    const timestamp = relative ? `${escapeHtml(relative)} · ${escapeHtml(absolute)}` : escapeHtml(absolute);
    chunks.push(`<div class="truck-popup__timestamp">Updated ${timestamp}</div>`);
  }
  return `<div class="truck-popup">${chunks.join("")}</div>`;
}

function createMarkerElement(
  truck: FleetTruckMarker,
  isSelected: boolean,
  onSelect: () => void
) {
  const element = document.createElement("button");
  element.type = "button";
  element.className = "truck-map-marker";
  element.dataset.status = truck.status;
  if (isSelected) {
    element.classList.add("truck-map-marker--selected");
  }
  element.setAttribute("aria-label", `${truck.label} – ${formatStatus(truck.status)}`);
  element.title = `${truck.label} • ${formatStatus(truck.status)}`;
  element.innerHTML = (
    '<span class="truck-map-marker__pulse"></span><span class="truck-map-marker__dot"></span>'
  );

  const handleClick = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onSelect();
  };

  element.addEventListener("click", handleClick);

  return {
    element,
    cleanup() {
      element.removeEventListener("click", handleClick);
    },
  };
}

function formatCoordinate(lat: number, lng: number) {
  const latHemisphere = lat >= 0 ? "N" : "S";
  const lngHemisphere = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(3)}° ${latHemisphere}, ${Math.abs(lng).toFixed(3)}° ${lngHemisphere}`;
}

type LegendCounts = {
  available: number;
  assigned: number;
  inTransit: number;
  inactive: number;
  total: number;
};

function MapLegend({ counts }: { counts: LegendCounts }) {
  const activeUnits = counts.total - counts.inactive;
  const items: Array<{ label: string; status: FleetTruckStatus; count: number }> = [
    { label: "Available", status: "available", count: counts.available },
    { label: "Assigned", status: "assigned", count: counts.assigned },
    { label: "In transit", status: "in-transit", count: counts.inTransit },
    { label: "Inactive", status: "inactive", count: counts.inactive },
  ];

  return (
    <div className="pointer-events-none absolute left-4 top-4 flex flex-col gap-3 text-xs">
      <div className="rounded-2xl bg-white/90 p-3 shadow-lg backdrop-blur">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          Status legend
        </p>
        <dl className="mt-2 space-y-1.5">
          {items.map((item) => (
            <div key={item.status} className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-2 font-medium text-gray-700">
                <span
                  className="inline-flex h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: statusColor(item.status) }}
                />
                {item.label}
              </dt>
              <dd className="text-xs font-semibold text-gray-900">{item.count}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-3 flex items-center gap-3 text-[11px] font-medium text-gray-500">
          <span>Total {counts.total}</span>
          <span>Active {activeUnits}</span>
        </div>
      </div>
    </div>
  );
}

export default function FleetTrucksMap({ fleet }: FleetTrucksMapProps) {
  const safeFleet = fleet ?? EMPTY_SNAPSHOT;
  const markerOrder = safeFleet.markerOrder ?? [];
  const trucksById = safeFleet.trucksById ?? {};

  const markers = useMemo(
    () => markerOrder.map((id) => trucksById[id]).filter(Boolean) as FleetTruckMarker[],
    [markerOrder, trucksById]
  );

  const statusCounts = useMemo(() => {
    const counts = {
      available: 0,
      assigned: 0,
      inTransit: 0,
      inactive: 0,
    };
    for (const marker of markers) {
      if (marker.status === "available") counts.available += 1;
      else if (marker.status === "assigned") counts.assigned += 1;
      else if (marker.status === "in-transit") counts.inTransit += 1;
      else if (marker.status === "inactive") counts.inactive += 1;
    }
    return counts;
  }, [markers]);

  const [markerIdx, setMarkerIdx] = useState(() => (markers.length ? 0 : -1));

  useEffect(() => {
    if (markers.length === 0) {
      setMarkerIdx(-1);
      return;
    }
    setMarkerIdx((prev) => {
      if (prev === -1) return 0;
      if (prev >= markers.length) return markers.length - 1;
      return prev;
    });
  }, [markers.length]);

  const selectedMarkerId =
    markerIdx >= 0 && markerIdx < markers.length ? markers[markerIdx]?.id ?? null : null;
  const selectedTruck = selectedMarkerId ? trucksById[selectedMarkerId] ?? null : null;

  const bounds = useMemo(
    () => buildBounds(markers.filter((marker) => Number.isFinite(marker.lat) && Number.isFinite(marker.lng))),
    [markers]
  );

  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any | null>(null);
  const mapMarkersRef = useRef<Array<{ id: string; marker: any; cleanup: () => void }>>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!document.getElementById("maplibre-gl-css")) {
      const link = document.createElement("link");
      link.id = "maplibre-gl-css";
      link.rel = "stylesheet";
      link.href = MAPLIBRE_CSS_URL;
      document.head.appendChild(link);
    }

    if (window.maplibregl) {
      setMapReady(true);
      return;
    }

    const handleLoad = () => {
      if (window.maplibregl) {
        setMapReady(true);
      } else {
        setMapError("Map library loaded but was not initialised correctly.");
      }
    };
    const handleError = () => {
      setMapError("Unable to load the map library. Check your connection and refresh.");
    };

    let script = document.getElementById("maplibre-gl-script") as HTMLScriptElement | null;
    if (script) {
      script.addEventListener("load", handleLoad);
      script.addEventListener("error", handleError);
    } else {
      script = document.createElement("script");
      script.id = "maplibre-gl-script";
      script.async = true;
      script.src = MAPLIBRE_SCRIPT_URL;
      script.addEventListener("load", handleLoad);
      script.addEventListener("error", handleError);
      document.body.appendChild(script);
    }

    return () => {
      script?.removeEventListener("load", handleLoad);
      script?.removeEventListener("error", handleError);
    };
  }, []);

  useEffect(() => {
    if (!mapReady || mapRef.current || !mapContainerRef.current) return;
    if (typeof window === "undefined" || !window.maplibregl) return;

    try {
      const map = new window.maplibregl.Map({
        container: mapContainerRef.current,
        style: MAPLIBRE_STYLE_URL,
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        attributionControl: true,
        cooperativeGestures: true,
      });

      map.addControl(new window.maplibregl.NavigationControl({ visualizePitch: true }), "top-right");

      map.on("error", (event: any) => {
        if (!event?.error) return;
        const status = Number(event.error?.status ?? 0);
        if (status >= 400) {
          setMapError("We couldn't load the map tiles right now. Try reloading shortly.");
        }
      });

      mapRef.current = map;
    } catch {
      setMapError("Unable to initialise the live map.");
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      mapMarkersRef.current = [];
    };
  }, [mapReady]);

  const handleSelectMarker = useCallback(
    (index: number) => {
      setMarkerIdx(index);
    },
    []
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || typeof window === "undefined" || !window.maplibregl) return;

    const newMarkers: Array<{ id: string; marker: any; cleanup: () => void }> = [];

    markers.forEach((truck, index) => {
      if (!Number.isFinite(truck.lat) || !Number.isFinite(truck.lng)) {
        return;
      }

      const isSelected = selectedMarkerId === truck.id;
      const { element, cleanup } = createMarkerElement(truck, isSelected, () => handleSelectMarker(index));
      const popupHtml = createPopupHtml(truck);
      const popup = new window.maplibregl.Popup({ closeButton: false, offset: 32 }).setHTML(popupHtml);
      popup.addClassName("truck-map-popup");

      const marker = new window.maplibregl.Marker({ element, anchor: "bottom" })
        .setLngLat([truck.lng, truck.lat])
        .setPopup(popup)
        .addTo(map);

      if (isSelected) {
        marker.togglePopup();
      }

      newMarkers.push({ id: truck.id, marker, cleanup });
    });

    mapMarkersRef.current.forEach((entry) => {
      entry.marker.remove();
      entry.cleanup();
    });
    mapMarkersRef.current = newMarkers;

    return () => {
      newMarkers.forEach((entry) => {
        entry.marker.remove();
        entry.cleanup();
      });
      if (mapMarkersRef.current === newMarkers) {
        mapMarkersRef.current = [];
      }
    };
  }, [mapReady, markers, selectedMarkerId, handleSelectMarker]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || typeof window === "undefined" || !window.maplibregl) return;

    const applyBounds = () => {
      if (bounds) {
        const mapBounds = new window.maplibregl.LngLatBounds(
          [bounds.minLng, bounds.minLat],
          [bounds.maxLng, bounds.maxLat]
        );
        map.fitBounds(mapBounds, { padding: 80, duration: 0 });
      } else {
        map.jumpTo({ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM });
      }
    };

    if (map.isStyleLoaded && map.isStyleLoaded()) {
      applyBounds();
    } else {
      map.once("load", applyBounds);
    }
  }, [mapReady, bounds?.minLat, bounds?.minLng, bounds?.maxLat, bounds?.maxLng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || typeof window === "undefined" || !window.maplibregl) return;
    if (!selectedTruck) return;
    if (!Number.isFinite(selectedTruck.lat) || !Number.isFinite(selectedTruck.lng)) return;

    const target: [number, number] = [selectedTruck.lng, selectedTruck.lat];

    const flyTo = () => {
      map.easeTo({
        center: target,
        zoom: Math.max(map.getZoom(), 9),
        duration: 600,
        essential: true,
      });
    };

    if (map.isStyleLoaded && map.isStyleLoaded()) {
      flyTo();
    } else {
      map.once("load", flyTo);
    }
  }, [mapReady, selectedTruck?.id, selectedTruck?.lat, selectedTruck?.lng]);

  const snapshotRelative = formatRelativeTimeFromNow(safeFleet.generatedAt);
  const totalMarkers = markers.length;
  const cyclingDisabled = totalMarkers <= 1;

  const cyclePrev = useCallback(() => {
    setMarkerIdx((prev) => {
      if (totalMarkers === 0) return -1;
      if (prev === -1) return totalMarkers - 1;
      return (prev - 1 + totalMarkers) % totalMarkers;
    });
  }, [totalMarkers]);

  const cycleNext = useCallback(() => {
    setMarkerIdx((prev) => {
      if (totalMarkers === 0) return -1;
      if (prev === -1) return 0;
      return (prev + 1) % totalMarkers;
    });
  }, [totalMarkers]);

  const legendCounts: LegendCounts = {
    available: statusCounts.available,
    assigned: statusCounts.assigned,
    inTransit: statusCounts.inTransit,
    inactive: statusCounts.inactive,
    total: totalMarkers,
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
      <section className="space-y-4">
        <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-gray-200 bg-white/60 p-4 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-gray-900">Fleet map</h2>
            <p className="text-xs text-gray-500">
              {safeFleet.generatedAt
                ? `Last updated ${new Date(safeFleet.generatedAt).toLocaleString()}${snapshotRelative ? ` · ${snapshotRelative}` : ""}`
                : "Live snapshot"}
            </p>
          </div>
          <div className="flex flex-col items-end gap-3 sm:flex-row sm:items-center sm:gap-4">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-gray-600 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
              <div className="flex items-center gap-1">
                <dt className="font-medium text-gray-800">Units</dt>
                <dd>{totalMarkers}</dd>
              </div>
              <div className="flex items-center gap-1">
                <dt className="font-medium text-emerald-600">Available</dt>
                <dd>{statusCounts.available}</dd>
              </div>
              <div className="flex items-center gap-1">
                <dt className="font-medium text-amber-600">Assigned</dt>
                <dd>{statusCounts.assigned}</dd>
              </div>
              <div className="flex items-center gap-1">
                <dt className="font-medium text-sky-600">In transit</dt>
                <dd>{statusCounts.inTransit}</dd>
              </div>
              <div className="flex items-center gap-1">
                <dt className="font-medium text-gray-500">Inactive</dt>
                <dd>{statusCounts.inactive}</dd>
              </div>
            </dl>
            {totalMarkers > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={cyclePrev}
                  disabled={cyclingDisabled}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${
                    cyclingDisabled
                      ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                      : "border-gray-300 bg-white text-gray-700 hover:border-emerald-300 hover:text-emerald-600"
                  }`}
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={cycleNext}
                  disabled={cyclingDisabled}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${
                    cyclingDisabled
                      ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                      : "border-emerald-300 bg-emerald-50 text-emerald-700 hover:border-emerald-400 hover:bg-emerald-100"
                  }`}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="relative h-[440px] overflow-hidden rounded-2xl border border-gray-200 bg-slate-100 shadow-inner">
          <div ref={mapContainerRef} className="fleet-map-container h-full w-full" />

          {!mapReady && !mapError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-gray-500">
              <span className="animate-pulse rounded-full border border-gray-300 px-3 py-1 text-xs uppercase tracking-wide text-gray-400">
                Loading live map…
              </span>
              <span>Fetching basemap tiles and truck markers.</span>
            </div>
          )}

          {mapError && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/85 p-6 text-center text-sm text-amber-700">
              {mapError}
            </div>
          )}

          {mapReady && !mapError && totalMarkers === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/75 p-6 text-center text-sm text-gray-500">
              No active units to plot yet. Add units to the fleet to start monitoring live positions.
            </div>
          )}

          {mapReady && !mapError && totalMarkers > 0 && <MapLegend counts={legendCounts} />}
        </div>
      </section>

      <aside className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-900">Truck details</h3>
          {totalMarkers > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cyclePrev}
                disabled={cyclingDisabled}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${
                  cyclingDisabled
                    ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                    : "border-gray-300 bg-white text-gray-700 hover:border-emerald-300 hover:text-emerald-600"
                }`}
              >
                Prev
              </button>
              <button
                type="button"
                onClick={cycleNext}
                disabled={cyclingDisabled}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${
                  cyclingDisabled
                    ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                    : "border-emerald-300 bg-emerald-50 text-emerald-700 hover:border-emerald-400 hover:bg-emerald-100"
                }`}
              >
                Next
              </button>
            </div>
          )}
        </div>

        {selectedTruck ? (
          <div className="space-y-4 text-sm text-gray-700">
            <dl className="space-y-3">
              <div>
                <dt className="text-xs uppercase tracking-wide text-gray-500">Unit</dt>
                <dd className="flex flex-wrap items-center justify-between gap-3">
                  <span className="font-semibold text-gray-900">{selectedTruck.label}</span>
                  <span className="text-xs text-gray-400">Code {selectedTruck.code}</span>
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-gray-500">Status</dt>
                <dd className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeTone(
                      selectedTruck.status
                    )}`}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: statusColor(selectedTruck.status) }}
                    />
                    {formatStatus(selectedTruck.status)}
                  </span>
                  {selectedTruck.driver && (
                    <span className="text-xs text-gray-500">Driver {selectedTruck.driver}</span>
                  )}
                </dd>
              </div>
            </dl>

            <div className="grid gap-3 text-sm">
              <div className="rounded-xl bg-gray-50/80 p-3">
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Location</h4>
                <div className="mt-2 space-y-1">
                  <p className="font-medium text-gray-900">
                    {selectedTruck.city ? selectedTruck.city : "No home base on record"}
                  </p>
                  {Number.isFinite(selectedTruck.lat) && Number.isFinite(selectedTruck.lng) && (
                    <p className="text-xs text-gray-500">
                      {formatCoordinate(selectedTruck.lat, selectedTruck.lng)}
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-inner">
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Assignment</h4>
                <p className="mt-1 text-sm text-gray-700">
                  {selectedTruck.notes ? selectedTruck.notes : "No active assignment"}
                </p>
              </div>

              {selectedTruck.lastEvent && (
                <div className="rounded-xl border border-dashed border-gray-200 p-3">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Last update
                  </h4>
                  <p className="mt-1 text-sm text-gray-700">
                    {new Date(selectedTruck.lastEvent).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                  {formatRelativeTimeFromNow(selectedTruck.lastEvent) && (
                    <p className="text-xs text-gray-500">
                      {formatRelativeTimeFromNow(selectedTruck.lastEvent)}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : totalMarkers === 0 ? (
          <p className="text-sm text-gray-500">
            There are no tracked units yet. Add units to the fleet to start monitoring live positions.
          </p>
        ) : (
          <p className="text-sm text-gray-500">Select a marker to view the unit details.</p>
        )}

        {totalMarkers > 0 && (
          <div className="border-t pt-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">All units</h4>
            <ul className="mt-2 space-y-2 text-sm">
              {markers.map((truck, index) => {
                const isSelected = selectedMarkerId === truck.id;
                const tone = listTone(truck.status);
                return (
                  <li key={truck.id}>
                    <button
                      type="button"
                      onClick={() => setMarkerIdx(index)}
                      className={`flex w-full items-start justify-between rounded-xl border px-3 py-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${
                        isSelected
                          ? "border-emerald-400 bg-emerald-50/80 text-emerald-800 shadow-inner"
                          : "border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/40"
                      }`}
                    >
                      <div className="space-y-1 pr-3">
                        <span className="font-semibold text-gray-900">{truck.label}</span>
                        <span className="text-xs text-gray-500">
                          {truck.city ? truck.city : "No home base on record"}
                        </span>
                        {truck.notes && (
                          <span className="block text-xs text-gray-400">{truck.notes}</span>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 text-right">
                        <span className={`inline-flex items-center gap-2 text-xs font-semibold ${tone}`}>
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: statusColor(truck.status) }}
                          />
                          {formatStatus(truck.status)}
                        </span>
                        {truck.driver && (
                          <span className="text-[11px] text-gray-500">Driver {truck.driver}</span>
                        )}
                        {truck.lastEvent && (
                          <span className="text-[11px] text-gray-400">
                            {formatRelativeTimeFromNow(truck.lastEvent) ??
                              new Date(truck.lastEvent).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}
