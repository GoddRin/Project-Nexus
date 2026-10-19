/** One chat line after parsing, before any redaction. Never persisted in this raw form. */
export interface RawChatMessage {
  at: Date;
  sender: string;
  text: string;
}

/** A chat line that survived redaction and the work-only filter. `author` is a stable alias, never a real name or number. */
export interface CleanMessage {
  at: Date;
  author: string;
  text: string;
  /** Set when the text mentions an injury or a safety event, so it can be routed to SAFETY/PM only. */
  safety: boolean;
}

export type ReportCategory =
  | "PROGRESS"
  | "EQUIPMENT_ISSUE"
  | "MANPOWER"
  | "MATERIALS"
  | "WEATHER"
  | "SAFETY"
  | "QUALITY"
  | "BLOCKER"
  | "OTHER";

/** One structured fact pulled from a day's reports. */
export interface ReportItem {
  category: ReportCategory;
  area: string | null;
  summary: string;
  equipment: string | null;
  quantity: string | null;
  status: "DONE" | "ONGOING" | "BLOCKED" | "PLANNED" | "UNKNOWN";
}

export interface DailyDigest {
  /** ISO date (Asia/Manila) the reports describe. */
  date: string;
  items: ReportItem[];
  /** Redacted work lines, kept so answers can cite the actual wording. Contains no safety-event lines. */
  sourceText: string;
  /** Injury / safety-event lines of the day, structured by keyword rules only (never sent to an AI service). */
  safetyItems: ReportItem[];
  safetySourceText: string;
}
