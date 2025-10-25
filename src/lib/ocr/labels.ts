export const LABEL_SYNONYMS: Record<string, string[]> = {
  customer: ["customer", "client"],
  origin: ["origin", "pickup", "pick up", "pu origin", "shipper"],
  destination: ["destination", "consignee", "delivery", "del"],
  puWindowStart: ["pu window start", "pickup start", "pickup window", "pu start"],
  puWindowEnd: ["pu window end", "pickup end", "pu end"],
  delWindowStart: ["del window start", "delivery start", "delivery window", "del start"],
  delWindowEnd: ["del window end", "delivery end", "del end"],
  requiredTruck: ["required truck", "equipment", "trailer"],
  notes: ["notes", "instructions", "comments"],
};

export type CanonicalLabel = keyof typeof LABEL_SYNONYMS;

export function normalizeLabel(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function* labelEntries() {
  for (const [key, synonyms] of Object.entries(LABEL_SYNONYMS)) {
    yield [key as CanonicalLabel, synonyms] as const;
  }
}
