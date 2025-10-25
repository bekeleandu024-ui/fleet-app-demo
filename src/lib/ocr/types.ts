export type BoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence?: number;
  text?: string;
  level: "word" | "line";
};

export type OCRWord = {
  text: string;
  confidence: number;
  bbox: BoundingBox;
};

export type OCRLine = {
  text: string;
  confidence: number;
  bbox: BoundingBox;
  words: OCRWord[];
};

export type OCRBoxes = {
  imageWidth: number;
  imageHeight: number;
  previewDataUrl?: string;
  words: OCRWord[];
  lines: OCRLine[];
};

export type OrderFields = {
  customer: string;
  origin: string;
  destination: string;
  puWindowStart: string | null;
  puWindowEnd: string | null;
  delWindowStart: string | null;
  delWindowEnd: string | null;
  requiredTruck: string | null;
  notes: string | null;
};

export type PartialOrderFields = Partial<OrderFields>;

export type FieldConfidenceMap = Partial<{ [K in keyof OrderFields]: number }>;

export type ParsedResult = {
  fields: PartialOrderFields;
  confidence: FieldConfidenceMap;
  warnings: string[];
};

export type OCRStructuredResult = {
  text: string;
  lines: OCRLine[];
};

export type OCREndpointResponse = {
  ok: true;
  fields: PartialOrderFields;
  confidence: FieldConfidenceMap;
  boxes?: OCRBoxes;
  warnings?: string[];
};

export type OCREndpointError = {
  ok: false;
  error: string;
};

export type OCREndpointResult = OCREndpointResponse | OCREndpointError;
