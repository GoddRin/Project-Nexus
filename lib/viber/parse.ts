import type { RawChatMessage } from "./types";

/**
 * Parses a Viber "Email chat history" export. Viber has shipped a few shapes over the years, so
 * this accepts the three seen in the wild and returns whatever it can read:
 *
 *   1. CSV with a header row:  Date,Time,Sender,Message   (extra columns such as Number are ignored)
 *   2. Bracketed text:         [12/10/2026, 8:15 AM] Juan Dela Cruz: message
 *   3. Dash text:              12/10/2026, 8:15 AM - Juan Dela Cruz: message
 *
 * Lines that do not start a new message are treated as the continuation of the previous one
 * (multi-line reports). Dates are read day-first (Philippines), so 12/10 is 12 October.
 */
export function parseViberExport(input: string): RawChatMessage[] {
  const text = input.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const firstLine = text.split("\n", 1)[0].toLowerCase();
  if (/(^|,)\s*"?date"?\s*,/.test(firstLine) && /message|text/.test(firstLine)) {
    return parseCsv(text);
  }
  return parseText(text);
}

const TEXT_START =
  /^\[?(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp]\.?[Mm]\.?)?\]?\s*(?:-\s*)?([^:\n]{1,60}):\s?(.*)$/;

function parseText(text: string): RawChatMessage[] {
  const out: RawChatMessage[] = [];
  for (const line of text.split("\n")) {
    const m = TEXT_START.exec(line);
    if (m) {
      const at = toDate(m[1], m[2], m[3], m[4], m[5], m[6]);
      if (at) {
        out.push({ at, sender: m[7].trim(), text: m[8] });
        continue;
      }
    }
    const last = out[out.length - 1];
    if (last && line.trim()) last.text += `\n${line}`;
  }
  return out;
}

function parseCsv(text: string): RawChatMessage[] {
  const rows = splitCsv(text);
  if (rows.length < 2) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idx = (re: RegExp) => header.findIndex((h) => re.test(h));
  const di = idx(/^date/);
  const ti = idx(/^time/);
  const si = idx(/sender|from|name/);
  const mi = idx(/message|text/);
  if (di < 0 || si < 0 || mi < 0) return [];
  const out: RawChatMessage[] = [];
  for (const row of rows.slice(1)) {
    const dateCell = row[di] ?? "";
    const timeCell = ti >= 0 ? (row[ti] ?? "") : "";
    const at = parseDateTimeCell(`${dateCell} ${timeCell}`.trim());
    if (!at) continue;
    out.push({ at, sender: (row[si] ?? "").trim(), text: row[mi] ?? "" });
  }
  return out;
}

function parseDateTimeCell(s: string): Date | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})[T\s]+(\d{1,2}):(\d{2})/.exec(s);
  if (iso) return toDate(iso[3], iso[2], iso[1], iso[4], iso[5], undefined);
  const dm = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})[,\s]+(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp]\.?[Mm]\.?)?/.exec(s);
  if (dm) return toDate(dm[1], dm[2], dm[3], dm[4], dm[5], dm[6]);
  return null;
}

/** Builds a Date at the Manila wall-clock time given (UTC+8, no DST). */
function toDate(d: string, mo: string, y: string, h: string, mi: string, ampm?: string): Date | null {
  let year = Number(y);
  if (year < 100) year += 2000;
  let hour = Number(h);
  if (ampm) {
    const pm = /p/i.test(ampm);
    if (pm && hour < 12) hour += 12;
    if (!pm && hour === 12) hour = 0;
  }
  const day = Number(d);
  const month = Number(mo);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23) return null;
  const ms = Date.UTC(year, month - 1, day, hour - 8, Number(mi));
  return Number.isNaN(ms) ? null : new Date(ms);
}

function splitCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}
