"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Opt = { id: string; name?: string | null; code?: string | null };

type Props = {
  orderId: string;
  drivers: Opt[];
  units: Opt[];
  types: string[];
  zones: string[];
};

export default function TripForm({ orderId, drivers, units, types, zones }: Props) {
  const r = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rateMatch, setRateMatch] = useState<{
    type: string | null;
    zone: string | null;
    found: boolean;
  } | null>(null);

  const [f, setF] = useState({
    driverId: "",
    unitId: "",
    miles: "",
    revenue: "",
    type: "",
    zone: "",
    fixedCPM: "",
    wageCPM: "",
    addOnsCPM: "",
    rollingCPM: "",
    tripStart: "",
    tripEnd: "",
    rateId: "",
  });

  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string | null>(null);
  const [voiceFeedback, setVoiceFeedback] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const listeningRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const anyWindow = window as typeof window & {
      webkitSpeechRecognition?: typeof SpeechRecognition;
      SpeechRecognition?: typeof SpeechRecognition;
    };
    const SpeechRecognitionCtor =
      anyWindow.SpeechRecognition || anyWindow.webkitSpeechRecognition;
    setVoiceSupported(Boolean(SpeechRecognitionCtor));
  }, []);

  useEffect(() => {
    return () => {
      listeningRef.current = false;
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, []);

  const stopListening = useCallback(() => {
    listeningRef.current = false;
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    try {
      recognition?.stop();
    } catch (error) {
      recognition?.abort?.();
    }
    setVoiceListening(false);
    setVoiceFeedback("Voice fill stopped.");
  }, []);

  const handleVoiceTranscript = useCallback(
    (transcript: string) => {
      const raw = transcript.trim();
      if (!raw) return;

      setVoiceTranscript(raw);

      const segments = raw
        .split(/(?:,|\.|;|\band\b|\bthen\b|\bnext\b)/i)
        .map((s) => s.trim())
        .filter(Boolean);

      if (!segments.length) {
        setVoiceFeedback(null);
        setVoiceError(
          `Didn't understand "${raw}". Try commands like "Driver Sam Lee" or "Miles 325".`
        );
        return;
      }

      const successes: string[] = [];
      const warnings: string[] = [];
      const fieldKeywords = [
        "driver",
        "unit",
        "miles",
        "mile",
        "revenue",
        "type",
        "zone",
        "fixed cpm",
        "fixed c p m",
        "wage cpm",
        "wage c p m",
        "add on cpm",
        "add-on cpm",
        "add ons cpm",
        "add ons c p m",
        "rolling cpm",
        "rolling c p m",
        "trip start",
        "start time",
        "pickup time",
        "pick up time",
        "trip end",
        "drop off time",
        "dropoff time",
        "end time",
      ];

      const matchList = (value: string, list: string[]) => {
        const lower = value.toLowerCase();
        const tokens = lower.split(/\s+/).filter(Boolean);
        const exact = list.find((item) => item.toLowerCase() === lower);
        if (exact) return exact;
        return (
          list.find((item) => {
            const itemLower = item.toLowerCase();
            return tokens.every((token) => itemLower.includes(token));
          }) ?? null
        );
      };

      const matchDriver = (value: string) => {
        const lowerTokens = value
          .toLowerCase()
          .split(/\s+/)
          .filter(Boolean);
        return (
          drivers.find((d) => {
            const nameLower = (d.name ?? "").toLowerCase();
            return lowerTokens.every((token) => nameLower.includes(token));
          }) ?? null
        );
      };

      const matchUnit = (value: string) => {
        const normalized = value.toLowerCase();
        const compact = normalized.replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");
        if (!compact) return null;

        const byCodeExact = units.find((u) =>
          (u.code ?? "")
            .toLowerCase()
            .replace(/\s+/g, "")
            .replace(/[^a-z0-9]/g, "") === compact
        );
        if (byCodeExact) return byCodeExact;

        const byCodePartial = units.find((u) =>
          (u.code ?? "")
            .toLowerCase()
            .replace(/\s+/g, "")
            .replace(/[^a-z0-9]/g, "")
            .includes(compact)
        );
        if (byCodePartial) return byCodePartial;

        const tokens = normalized
          .replace(/[^a-z0-9\s]/g, " ")
          .split(/\s+/)
          .filter(Boolean);
        if (!tokens.length) return null;

        return (
          units.find((u) => {
            const nameLower = (u.name ?? "").toLowerCase();
            if (!nameLower) return false;
            return tokens.every((token) => nameLower.includes(token));
          }) || null
        );
      };

      const numberFromValue = (value: string) => {
        let normalized = value.toLowerCase();
        normalized = normalized.replace(/point|dot/g, ".");
        normalized = normalized.replace(/[^0-9.]/g, "");
        normalized = normalized.replace(/(\.)(?=.*\.)/g, "");
        const trimmed = normalized.trim();
        if (!trimmed) return null;
        const num = Number(trimmed);
        if (Number.isNaN(num)) return null;
        return trimmed;
      };

      const formatDateLocal = (date: Date) => {
        const pad = (n: number) => String(n).padStart(2, "0");
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
          date.getDate()
        )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
      };

      const dateFromValue = (value: string) => {
        const trimmed = value.trim();
        if (!trimmed) return null;
        const lower = trimmed.toLowerCase();
        if (lower === "now" || lower === "right now") {
          return formatDateLocal(new Date());
        }

        const baseDate = new Date();

        if (lower.startsWith("today")) {
          const timePart = trimmed.replace(/today/i, "").trim();
          if (!timePart) {
            return formatDateLocal(baseDate);
          }
          const parsed = Date.parse(`${baseDate.toDateString()} ${timePart}`);
          if (!Number.isNaN(parsed)) {
            return formatDateLocal(new Date(parsed));
          }
        }

        if (lower.startsWith("tomorrow")) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const timePart = trimmed.replace(/tomorrow/i, "").trim();
          if (!timePart) {
            return formatDateLocal(tomorrow);
          }
          const parsed = Date.parse(`${tomorrow.toDateString()} ${timePart}`);
          if (!Number.isNaN(parsed)) {
            return formatDateLocal(new Date(parsed));
          }
        }

        const parsed = Date.parse(trimmed);
        if (!Number.isNaN(parsed)) {
          return formatDateLocal(new Date(parsed));
        }
        return null;
      };

      const extractValue = (
        segment: string,
        keywords: string[]
      ) => {
        const lowerSegment = segment.toLowerCase();
        for (const keyword of keywords) {
          const idx = lowerSegment.indexOf(keyword);
          if (idx === -1) continue;
          let valuePart = segment.slice(idx + keyword.length);
          valuePart = valuePart.replace(/^[\s:,-]+/, "");
          valuePart = valuePart.replace(/^(?:is|to|for|as|equals)\s+/i, "");
          valuePart = valuePart.replace(/\b(?:please|thanks|thank you)\b/gi, "");
          valuePart = valuePart.replace(/[.?!]+$/g, "");
          const lowerValue = valuePart.toLowerCase();
          let cutIndex = lowerValue.length;
          for (const other of fieldKeywords) {
            if (keywords.includes(other)) continue;
            const idxOther = lowerValue.indexOf(other);
            if (idxOther !== -1) {
              cutIndex = Math.min(cutIndex, idxOther);
            }
          }
          valuePart = valuePart.slice(0, cutIndex);
          valuePart = valuePart.trim();
          if (valuePart) return valuePart;
        }
        return null;
      };

      const processSegment = (segment: string) => {
        const lowerSegment = segment.toLowerCase();

        const stopPhrases = [
          "stop listening",
          "cancel voice",
          "stop voice",
          "exit voice",
        ];
        if (stopPhrases.some((phrase) => lowerSegment.startsWith(phrase))) {
          stopListening();
          successes.push("Voice fill stopped.");
          return true;
        }

        const driverValue = extractValue(segment, ["driver"]);
        if (driverValue) {
          const match = matchDriver(driverValue.replace(/^name\s+/i, ""));
          if (match) {
            set("driverId", match.id);
            successes.push(`Driver set to ${match.name}.`);
          } else {
            warnings.push(
              `Couldn't find a driver matching "${driverValue}".`
            );
          }
          return true;
        }

        const unitValue = extractValue(segment, ["unit"]);
        if (unitValue) {
          const cleaned = unitValue.replace(/^(number|no\.?)/i, "").trim();
          const match = matchUnit(cleaned);
          if (match) {
            set("unitId", match.id);
            successes.push(`Unit set to ${match.code}.`);
          } else {
            warnings.push(`Couldn't find a unit matching "${unitValue}".`);
          }
          return true;
        }

        const milesValue = extractValue(segment, ["miles", "mile"]);
        if (milesValue) {
          const num = numberFromValue(milesValue);
          if (num) {
            set("miles", num);
            successes.push(`Miles set to ${num}.`);
          } else {
            warnings.push(`Couldn't understand miles value "${milesValue}".`);
          }
          return true;
        }

        const revenueValue = extractValue(segment, ["revenue"]);
        if (revenueValue) {
          const num = numberFromValue(revenueValue);
          if (num) {
            set("revenue", num);
            successes.push(`Revenue set to ${num}.`);
          } else {
            warnings.push(
              `Couldn't understand revenue value "${revenueValue}".`
            );
          }
          return true;
        }

        const typeValue = extractValue(segment, ["type"]);
        if (typeValue) {
          const match = matchList(typeValue, types);
          if (match) {
            set("type", match);
            successes.push(`Type set to ${match}.`);
          } else {
            warnings.push(`Couldn't match type "${typeValue}".`);
          }
          return true;
        }

        const zoneValue = extractValue(segment, ["zone"]);
        if (zoneValue) {
          const match = matchList(zoneValue, zones);
          if (match) {
            set("zone", match);
            successes.push(`Zone set to ${match}.`);
          } else {
            warnings.push(`Couldn't match zone "${zoneValue}".`);
          }
          return true;
        }

        const fixedValue = extractValue(segment, ["fixed cpm", "fixed c p m"]);
        if (fixedValue) {
          const num = numberFromValue(fixedValue);
          if (num) {
            set("fixedCPM", num);
            successes.push(`Fixed CPM set to ${num}.`);
          } else {
            warnings.push(
              `Couldn't understand fixed CPM value "${fixedValue}".`
            );
          }
          return true;
        }

        const wageValue = extractValue(segment, ["wage cpm", "wage c p m"]);
        if (wageValue) {
          const num = numberFromValue(wageValue);
          if (num) {
            set("wageCPM", num);
            successes.push(`Wage CPM set to ${num}.`);
          } else {
            warnings.push(
              `Couldn't understand wage CPM value "${wageValue}".`
            );
          }
          return true;
        }

        const addOnValue = extractValue(segment, [
          "add on cpm",
          "add-on cpm",
          "add ons cpm",
          "add ons c p m",
        ]);
        if (addOnValue) {
          const num = numberFromValue(addOnValue);
          if (num) {
            set("addOnsCPM", num);
            successes.push(`Add-ons CPM set to ${num}.`);
          } else {
            warnings.push(
              `Couldn't understand add-ons CPM value "${addOnValue}".`
            );
          }
          return true;
        }

        const rollingValue = extractValue(segment, [
          "rolling cpm",
          "rolling c p m",
        ]);
        if (rollingValue) {
          const num = numberFromValue(rollingValue);
          if (num) {
            set("rollingCPM", num);
            successes.push(`Rolling CPM set to ${num}.`);
          } else {
            warnings.push(
              `Couldn't understand rolling CPM value "${rollingValue}".`
            );
          }
          return true;
        }

        const startValue = extractValue(segment, [
          "trip start",
          "start time",
          "pickup time",
          "pick up time",
        ]);
        if (startValue) {
          const formatted = dateFromValue(startValue);
          if (formatted) {
            set("tripStart", formatted);
            successes.push("Trip start updated.");
          } else {
            warnings.push(
              `Couldn't understand trip start time "${startValue}".`
            );
          }
          return true;
        }

        const endValue = extractValue(segment, [
          "trip end",
          "drop off time",
          "dropoff time",
          "end time",
        ]);
        if (endValue) {
          const formatted = dateFromValue(endValue);
          if (formatted) {
            set("tripEnd", formatted);
            successes.push("Trip end updated.");
          } else {
            warnings.push(
              `Couldn't understand trip end time "${endValue}".`
            );
          }
          return true;
        }

        return false;
      };

      let matchedAny = false;
      for (const segment of segments) {
        if (processSegment(segment)) {
          matchedAny = true;
        }
      }

      if (successes.length) {
        setVoiceFeedback(successes.join(" "));
      } else {
        setVoiceFeedback(null);
      }

      if (warnings.length) {
        setVoiceError(warnings.join(" "));
      } else if (!matchedAny) {
        setVoiceError(
          `Didn't understand "${raw}". Try commands like "Driver Sam Lee" or "Miles 325".`
        );
      } else {
        setVoiceError(null);
      }
    },
    [drivers, stopListening, types, units, zones]
  );

  const startListening = useCallback(() => {
    if (typeof window === "undefined") return;
    const anyWindow = window as typeof window & {
      webkitSpeechRecognition?: typeof SpeechRecognition;
      SpeechRecognition?: typeof SpeechRecognition;
    };
    const SpeechRecognitionCtor =
      anyWindow.SpeechRecognition || anyWindow.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setVoiceError(
        "Voice recognition is not supported in this browser. Try Chrome or Edge."
      );
      return;
    }

    if (voiceListening) {
      stopListening();
      return;
    }

    try {
      const recognition = new SpeechRecognitionCtor();
      recognition.lang = "en-US";
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const transcript = event.results[i][0]?.transcript;
          if (transcript) {
            handleVoiceTranscript(transcript);
          }
        }
      };
      recognition.onerror = (event) => {
        if (event.error === "no-speech") {
          setVoiceError("No speech detected. Please try again.");
          return;
        }
        if (event.error === "not-allowed") {
          setVoiceError(
            "Microphone access was blocked. Allow access in your browser settings."
          );
          stopListening();
          return;
        }
        setVoiceError(`Voice error: ${event.error}`);
      };
      recognition.onend = () => {
        recognitionRef.current = null;
        if (listeningRef.current) {
          listeningRef.current = false;
          setVoiceListening(false);
          setVoiceFeedback((prev) => prev ?? "Voice fill stopped.");
        }
      };

      recognitionRef.current = recognition;
      listeningRef.current = true;
      setVoiceListening(true);
      setVoiceTranscript(null);
      setVoiceFeedback("Listening…");
      setVoiceError(null);
      recognition.start();
    } catch (error) {
      console.error("Failed to start voice recognition", error);
      setVoiceError("Unable to start voice recognition. Please try again.");
    }
  }, [handleVoiceTranscript, stopListening, voiceListening]);

  const toggleVoice = useCallback(() => {
    if (voiceListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [startListening, stopListening, voiceListening]);

  function set<K extends keyof typeof f>(k: K, v: string) {
    setF((prev) => {
      const next = { ...prev, [k]: v };
      if (k === "driverId" || k === "unitId" || k === "type" || k === "zone") {
        next.rateId = "";
      }
      return next;
    });
  }

  const selectedDriverName = useMemo(
    () => drivers.find((d) => d.id === f.driverId)?.name ?? "",
    [drivers, f.driverId]
  );
  const selectedUnitCode = useMemo(
    () => units.find((u) => u.id === f.unitId)?.code ?? "",
    [units, f.unitId]
  );

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function fetchRates() {
      try {
        const payload: Record<string, string> = { orderId };
        if (selectedDriverName.trim()) payload.driver = selectedDriverName.trim();
        if (selectedUnitCode.trim()) payload.unit = selectedUnitCode.trim();
        if (f.type.trim()) payload.type = f.type.trim();
        if (f.zone.trim()) payload.zone = f.zone.trim();

        const res = await fetch("/api/rates/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (!res.ok) {
          if (!cancelled) {
            setRateMatch(null);
            setF((prev) => ({ ...prev, rateId: "" }));
          }
          return;
        }

        const data = await res.json();
        if (cancelled) return;

        const nextMatch = {
          type: typeof data.type === "string" ? data.type : null,
          zone: typeof data.zone === "string" ? data.zone : null,
          found: Boolean(data.found),
        } as const;
        setRateMatch(
          nextMatch.type || nextMatch.zone || nextMatch.found ? nextMatch : null
        );

        setF((prev) => {
          const next = { ...prev };

          if (!prev.type && typeof data.type === "string" && data.type) {
            next.type = data.type;
          }
          if (!prev.zone && typeof data.zone === "string" && data.zone) {
            next.zone = data.zone;
          }

          if (data.found) {
            next.fixedCPM = data.fixedCPM != null ? String(data.fixedCPM) : "";
            next.wageCPM = data.wageCPM != null ? String(data.wageCPM) : "";
            next.addOnsCPM = data.addOnsCPM != null ? String(data.addOnsCPM) : "";
            next.rollingCPM =
              data.rollingCPM != null ? String(data.rollingCPM) : "";
            next.rateId = typeof data.rateId === "string" ? data.rateId : "";
          } else {
            next.rateId = "";
          }

          return next;
        });
      } catch (error) {
        if ((error as DOMException)?.name === "AbortError") return;
        console.error("Failed to look up rate", error);
        if (!cancelled) {
          setRateMatch(null);
          setF((prev) => ({ ...prev, rateId: "" }));
        }
      }
    }

    fetchRates();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [orderId, selectedDriverName, selectedUnitCode, f.type, f.zone]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setErr(null);

    const driver = selectedDriverName;
    const unit = selectedUnitCode;

    const res = await fetch("/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId,
        driverId: f.driverId || undefined,
        unitId: f.unitId || undefined,
        driver, unit,
        miles: Number(f.miles),
        revenue: f.revenue ? Number(f.revenue) : undefined,
        type: f.type || undefined, zone: f.zone || undefined,
        fixedCPM: f.fixedCPM ? Number(f.fixedCPM) : undefined,
        wageCPM: f.wageCPM ? Number(f.wageCPM) : undefined,
        addOnsCPM: f.addOnsCPM ? Number(f.addOnsCPM) : undefined,
        rollingCPM: f.rollingCPM ? Number(f.rollingCPM) : undefined,
        tripStart: f.tripStart || undefined,
        tripEnd: f.tripEnd || undefined,
        rateId: f.rateId || undefined,
      }),
    });

    setLoading(false);
    if (res.ok) {
      const j = await res.json();
      r.push(`/trips/${j.tripId}`);
    } else {
      const j = await res.json().catch(() => ({}));
      setErr(j?.issues?.fieldErrors?.miles?.[0] ?? j?.error ?? "Failed to create trip");
    }
  }

  const input = "w-full border rounded p-2";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {err && <div className="p-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded">{err}</div>}

      <div className="rounded border border-gray-200 bg-white/60 p-3 text-sm shadow-sm dark:border-gray-700 dark:bg-gray-900/40">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="font-medium">Voice fill</p>
            <p className="text-xs text-gray-600 dark:text-gray-300">
              Say commands like “Driver Jamie”, “Miles 320”, or “Trip start now” to fill the form.
            </p>
          </div>
          <button
            type="button"
            onClick={toggleVoice}
            disabled={!voiceSupported && !voiceListening}
            aria-pressed={voiceListening}
            className={`inline-flex items-center rounded px-3 py-1.5 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-1 ${
              voiceListening
                ? "bg-red-600 text-white hover:bg-red-500"
                : "bg-gray-900 text-white hover:bg-gray-800"
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {voiceListening ? "Stop listening" : "Start voice fill"}
          </button>
        </div>
        {!voiceSupported && !voiceListening && (
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
            Voice recognition isn’t available in this browser. Try using the latest Chrome or Edge.
          </p>
        )}
        {voiceTranscript && (
          <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">
            Heard: <span className="italic">“{voiceTranscript}”</span>
          </p>
        )}
        {voiceFeedback && (
          <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">{voiceFeedback}</p>
        )}
        {voiceError && (
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{voiceError}</p>
        )}
        <p className="mt-3 text-[11px] text-gray-500 dark:text-gray-400">
          Supported keywords: Driver, Unit, Miles, Revenue, Type, Zone, Fixed/Wage/Add-ons/Rolling CPM, Trip Start, Trip End. Say “Stop listening” to turn voice fill off.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm">Driver *</label>
          <select className={input} value={f.driverId} onChange={e=>set("driverId", e.target.value)}>
            <option value="">Select driver</option>
            {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm">Unit *</label>
          <select className={input} value={f.unitId} onChange={e=>set("unitId", e.target.value)}>
            <option value="">Select unit</option>
            {units.map(u => (
              <option key={u.id} value={u.id}>
                {u.code}
                {u.name ? ` — ${u.name}` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm">Miles *</label>
          <input className={input} type="number" step="0.01" value={f.miles} onChange={e=>set("miles", e.target.value)} />
        </div>
        <div>
          <label className="block text-sm">Revenue (optional)</label>
          <input className={input} type="number" step="0.01" value={f.revenue} onChange={e=>set("revenue", e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm">Type</label>
          <select className={input} value={f.type} onChange={e=>set("type", e.target.value)}>
            <option value="">(none)</option>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm">Zone</label>
          <select className={input} value={f.zone} onChange={e=>set("zone", e.target.value)}>
            <option value="">(none)</option>
            {zones.map(z => <option key={z} value={z}>{z}</option>)}
          </select>
        </div>
      </div>

      <details className="border rounded p-3">
        <summary className="cursor-pointer">CPM components</summary>
        <div className="grid grid-cols-2 gap-4 mt-3">
          {(["fixedCPM","wageCPM","addOnsCPM","rollingCPM"] as const).map(k => (
            <div key={k}>
              <label className="block text-sm">{k}</label>
              <input className={input} type="number" step="0.0001" value={(f as any)[k]} onChange={e=>set(k as any, e.target.value)} />
            </div>
          ))}
        </div>
        {rateMatch && (
          <p
            className={`text-xs mt-2 ${
              rateMatch.found ? "text-gray-600" : "text-amber-600"
            }`}
          >
            {rateMatch.found
              ? `Using rate: Type = ${rateMatch.type ?? "(any)"} | Zone = ${
                  rateMatch.zone ?? "(any)"
                }`
              : `No matching rate found${
                  rateMatch.type || rateMatch.zone
                    ? ` (suggested Type = ${rateMatch.type ?? "(any)"}, Zone = ${
                        rateMatch.zone ?? "(any)"
                      })`
                    : ""
                }`}
          </p>
        )}
      </details>

      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm">Trip Start</label>
          <input className={input} type="datetime-local" value={f.tripStart} onChange={e=>set("tripStart", e.target.value)} /></div>
        <div><label className="block text-sm">Trip End</label>
          <input className={input} type="datetime-local" value={f.tripEnd} onChange={e=>set("tripEnd", e.target.value)} /></div>
      </div>

      <button disabled={loading} className="px-4 py-2 rounded bg-black text-white">
        {loading ? "Booking..." : "Create Trip"}
      </button>
    </form>
  );
}
