export const FLEET_APP_OCR_MODEL_ID = "fleetappocr2" as const;

export type DocumentParagraph = {
  content?: string;
  role?: string;
  [key: string]: unknown;
};

export type DocumentLine = {
  content?: string;
  [key: string]: unknown;
};

export type DocumentPage = {
  pageNumber?: number;
  lines?: DocumentLine[];
  [key: string]: unknown;
};

export type DocumentIntelligenceAnalyzeResult = {
  content?: string;
  paragraphs?: DocumentParagraph[];
  pages?: DocumentPage[];
  documents?: Array<Record<string, unknown>>;
  tables?: Array<Record<string, unknown>>;
  keyValuePairs?: Array<Record<string, unknown>>;
  [key: string]: unknown;
};
