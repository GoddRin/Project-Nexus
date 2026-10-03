/**
 * Turning a written answer into something a person would SAY.
 *
 * A chat answer is written for the eye: markdown, tables, source tags, units as symbols. Read out
 * as it stands, a voice says "asterisk asterisk", walks through a table cell by cell and trips over
 * "11.3MW". Two things fix that:
 *
 *  1. The assistant is asked to add a short spoken version of its answer (`[[SAY: ...]]`, see
 *     lib/atlas-ai/identity.ts). It is taken off the written answer and spoken instead: what he
 *     would say to someone who can already see the details on screen.
 *  2. `toNarration` is the safety net and the cleaner: it rewrites any text (the spoken version, or
 *     the whole answer when no spoken version came back) into plain speakable sentences. Marks
 *     that guide the eye are never pronounced, tables are told as sentences, and units, money and
 *     abbreviations are written the way they are said.
 *
 * Plain module (no React, no server imports): used by the client and testable on its own.
 */

const SAY_RE = /\[\[SAY(-TL)?:\s*([\s\S]*?)\]\]/g;

/**
 * Separate the written answer from the spoken versions the assistant appended:
 * `[[SAY: ...]]` (English) and, in Taglish mode, `[[SAY-TL: ...]]` (Tagalog / Taglish).
 */
export function splitSpoken(answer: string): { display: string; say: string | null; sayTl: string | null } {
  const text = answer || "";
  const first = text.search(/\[\[SAY/);
  if (first === -1) return { display: text.trim(), say: null, sayTl: null };
  const tail = text.slice(first);
  let say: string | null = null;
  let sayTl: string | null = null;
  for (const m of tail.matchAll(SAY_RE)) {
    if (m[1]) sayTl = m[2].trim() || null;
    else say = m[2].trim() || null;
  }
  if (!say && !sayTl) {
    // the closing brackets never arrived: take what there is
    const open = tail.match(/\[\[SAY:\s*([\s\S]*)$/);
    if (open) say = open[1].replace(/\]+\s*$/, "").trim() || null;
  }
  return { display: text.slice(0, first).trim(), say, sayTl };
}

/** While an answer is still arriving, keep the spoken versions (even half-arrived ones) off screen. */
export function hideSpokenMarker(partial: string): string {
  const text = partial || "";
  const at = text.search(/\[\[SAY/);
  if (at !== -1) return text.slice(0, at).trimEnd();
  // "[", "[[", "[[S", "[[SA" at the very end are the marker starting to arrive
  return text.replace(/\[(?:\[(?:S(?:A)?)?)?$/, "").trimEnd();
}

// ── Cues for the body: what to stress, and which project he is naming ────────

export interface ProjectMention {
  /** character position in the spoken text where the project is named */
  at: number;
  end: number;
  id: string;
  name: string;
}

const GENERIC_NAME_WORDS = /^(the|project|projects|power|plant|plants|hydro|hydroelectric|mini|wind|farm|water|supply|treatment|river|road|bridge|expressway|phase|package|section|new|city|sta|santa|san|bulk|improvement|flood|control|upper|lower|north|south|east|west|philippine|rural|development)$/i;

/** Where the spoken text names a project (so he can look and point at it as he says it). */
export function findProjectMentions(
  spoken: string,
  projects: Array<{ id: string; name: string; shortName?: string; province?: string; region?: string }>
): ProjectMention[] {
  const hay = spoken.toLowerCase();
  // a first word that is also a place ("Mindanao Railway", "Bohol PRDP") is not the project's own
  // name: "projects in Mindanao" must not be read as naming the Mindanao Railway
  const placeWords = new Set<string>(["luzon", "visayas", "mindanao", "philippines", "manila", "metro"]);
  for (const p of projects) {
    for (const place of [p.province, p.region]) {
      for (const w of (place || "").toLowerCase().split(/[^a-z]+/)) if (w.length >= 4) placeWords.add(w);
    }
  }
  // the distinctive first word of each name ("Tumauini", "Kiangan"), when only one project has it
  const firstWordCount = new Map<string, number>();
  const firstWord = (name: string) => {
    const w = name.replace(/\([^)]*\)/g, " ").trim().split(/[\s-]+/)[0] || "";
    return w.length >= 5 && !GENERIC_NAME_WORDS.test(w) && !placeWords.has(w.toLowerCase()) ? w.toLowerCase() : "";
  };
  for (const p of projects) {
    const w = firstWord(p.name);
    if (w) firstWordCount.set(w, (firstWordCount.get(w) ?? 0) + 1);
  }
  const found: ProjectMention[] = [];
  for (const p of projects) {
    const full = p.name.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
    const w = firstWord(p.name);
    const keys = [full, w && firstWordCount.get(w) === 1 ? w : ""].filter((k) => k.length >= 5);
    let best: ProjectMention | null = null;
    for (const key of keys) {
      const at = hay.indexOf(key);
      if (at !== -1 && (!best || at < best.at)) best = { at, end: at + key.length, id: p.id, name: p.name };
    }
    if (best) found.push(best);
  }
  found.sort((a, b) => a.at - b.at);
  // one project per place in the sentence
  return found.filter((m, k) => k === 0 || m.at >= found[k - 1].end).slice(0, 5);
}

/** The stretches of the spoken text that carry the weight: figures with their units, and project names. */
export function findEmphasis(spoken: string, mentions: ProjectMention[] = []): Array<[number, number]> {
  const out: Array<[number, number]> = mentions.map((m) => [m.at, m.end]);
  const re = /\b\d[\d,.]*(?:\s+(?:percent|megawatts?|kilowatts?|gigawatt hours|kilometers?|billion|million|thousand|pesos|hectares|meters?|liters|projects?|sites?|years?))*/gi;
  for (const m of spoken.matchAll(re)) {
    if (m.index === undefined || /^\d{4}$/.test(m[0])) continue; // a bare year is not stressed
    out.push([m.index, m.index + m[0].length]);
  }
  out.sort((a, b) => a[0] - b[0]);
  return out.slice(0, 10);
}

// ── Tables ───────────────────────────────────────────────────────────────────

const COUNT_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const countWord = (n: number) => COUNT_WORDS[n] ?? String(n);

const isBlank = (v: string) => !v || /^(-+|—+|–+|n\/?a|none|null|tbd|\?)$/i.test(v.trim());

function cells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => inline(c.trim()));
}

type Role = "name" | "skip" | "place" | "capacity" | "status" | "client" | "value" | "date" | "category" | "other";

function roleOf(header: string, index: number, hasName: boolean): Role {
  const h = header.toLowerCase();
  if (/\b(code|id|ref|slug)\b|^#$|^no\.?$/.test(h)) return "skip";
  if (!hasName && /\b(project|name|site|title|plant|facility)\b/.test(h)) return "name";
  // (whole words: "capacity" contains "city")
  if (/\b(capacity|output|megawatts?|mw|length|volume)\b/.test(h)) return "capacity";
  if (/\b(municipality|city|town|province|region|location|island|barangay|area)\b/.test(h)) return "place";
  if (/status|stage|phase/.test(h)) return "status";
  if (/client|owner|developer|proponent|agency/.test(h)) return "client";
  if (/value|cost|contract|amount|budget|price/.test(h)) return "value";
  if (/\bcod\b|completion|date|year|target|start|finish|turnover/.test(h)) return "date";
  if (/category|sector|type|kind/.test(h)) return "category";
  return index === 0 && !hasName ? "name" : "other";
}

/** One table row as a spoken clause: "Tumauini Hydroelectric Power Project, in Tumauini, Isabela, with a capacity of 11.3 megawatts". */
function rowClause(headers: string[], roles: Role[], row: string[], brief: boolean): string {
  let name = "";
  const places: string[] = [];
  const parts: string[] = [];
  let category = "";
  headers.forEach((header, i) => {
    const value = (row[i] ?? "").trim();
    if (isBlank(value)) return;
    switch (roles[i]) {
      case "skip":
        return;
      case "name":
        name = value;
        return;
      case "place":
        if (!places.includes(value)) places.push(value);
        return;
      case "category":
        category = value;
        return;
      case "capacity":
        parts.push(`with a capacity of ${value}`);
        return;
      case "status":
        if (!brief) parts.push(`currently ${value.toLowerCase()}`);
        return;
      case "client":
        if (!brief) parts.push(`for ${value}`);
        return;
      case "value":
        if (!brief) parts.push(`valued at ${value}`);
        return;
      case "date":
        if (!brief) parts.push(`${header.toLowerCase()} ${value}`);
        return;
      default:
        if (!brief) parts.push(`${header.toLowerCase()} ${value}`);
    }
  });
  const lead = [name || row.find((v) => !isBlank(v)) || "", !brief && category ? `a ${category.toLowerCase()} project` : ""].filter(Boolean).join(", ");
  const where = places.length ? `in ${places.join(", ")}` : "";
  return [lead, where, ...parts].filter(Boolean).join(", ");
}

/** A markdown table told the way a person would tell it. */
function narrateTable(lines: string[]): string {
  const rows = lines.filter((l) => !/^\s*\|?\s*:?-{2,}/.test(l)).map(cells);
  if (rows.length < 2) return rows.flat().filter((v) => !isBlank(v)).join(", ") + ".";
  const [headers, ...body] = rows;

  // Comparison table: the first column names the attribute, the other columns are the things compared
  if (/^(attribute|field|metric|item|aspect|parameter|detail|feature|criteria|criterion|)$/i.test(headers[0].trim()) && headers.length >= 3) {
    const out: string[] = [];
    for (const row of body) {
      const pairs = headers.slice(1).map((h, k) => (isBlank(row[k + 1] ?? "") ? "" : `${h}, ${row[k + 1]}`)).filter(Boolean);
      if (!isBlank(row[0]) && pairs.length) out.push(`${row[0]}: ${pairs.join("; ")}.`);
    }
    return out.join(" ");
  }

  let hasName = false;
  const roles = headers.map((h, i) => {
    const r = roleOf(h, i, hasName);
    if (r === "name") hasName = true;
    return r;
  });
  const n = body.length;
  if (n === 1) return `There is one: ${rowClause(headers, roles, body[0], false)}.`;
  if (n <= 4) {
    const openers = ["First,", "Then", "Next,", "And"];
    const told = body.map((row, i) => `${i === n - 1 ? "And" : openers[Math.min(i, 2)]} ${rowClause(headers, roles, row, false)}.`);
    return `There are ${countWord(n)}. ${told.join(" ")}`;
  }
  // A long table is not read out: say how many, name the first few, and leave the rest on screen
  const firstFew = body.slice(0, 3).map((row) => rowClause(headers, roles, row, true));
  return `There are ${countWord(n)} in the table. The first three are ${firstFew[0]}; ${firstFew[1]}; and ${firstFew[2]}. The rest are on your screen.`;
}

// ── Inline marks, symbols and units ──────────────────────────────────────────

/** Strip the marks that guide the eye, keeping the words they wrap. */
function inline(text: string): string {
  let t = text;
  t = t.replace(/!\[[^\]]*\]\([^)]*\)/g, " "); // images
  t = t.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1"); // links: keep the label
  t = t.replace(/https?:\/\/\S+/g, " ");
  t = t.replace(/`([^`]*)`/g, "$1"); // code chips: keep the words
  t = t.replace(/\*\*\*([^*]+)\*\*\*/g, "$1").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*\n]+)\*/g, "$1");
  t = t.replace(/(^|[\s(])__([^_]+)__(?=[\s).,;:!?]|$)/g, "$1$2").replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,;:!?]|$)/g, "$1$2");
  t = t.replace(/~~([^~]+)~~/g, "$1");
  t = t.replace(/<[^>]+>/g, " "); // html tags
  return t;
}

const ROMAN: Record<string, string> = {
  I: "One", II: "Two", III: "Three", IV: "Four", V: "Five", VI: "Six", VII: "Seven", VIII: "Eight",
  IX: "Nine", X: "Ten", XI: "Eleven", XII: "Twelve", XIII: "Thirteen",
};
const QUARTER = ["first", "second", "third", "fourth"];

/** Write units, money, symbols and abbreviations the way they are said. */
function sayIt(text: string): string {
  let t = text;
  // pictures and decorative marks are not words
  t = t.replace(/[\u{1F000}-\u{1FAFF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{2460}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu, (m) =>
    m === "→" || m === "➔" || m === "➜" ? " to " : " "
  );
  // an abbreviation given in brackets after the full name is not read out again: "(THEPP)"
  t = t.replace(/\s*\((?:[A-Z][A-Z0-9-]{1,9})\)/g, "");
  // money
  t = t.replace(/(?:₱|PHP\s?)\s?([\d][\d.,]*)\s*(billion|million|thousand|bn|b|m|k)?\b/gi, (_m, num: string, mag?: string) => {
    const g = (mag || "").toLowerCase();
    const word = !g ? "" : /^(bn|b|billion)$/.test(g) ? " billion" : /^(m|million)$/.test(g) ? " million" : " thousand";
    return `${num.replace(/[.,]$/, "")}${word} pesos`;
  });
  t = t.replace(/(?:US\$|\$)\s?([\d][\d.,]*)\s*(billion|million|b|m)?\b/gi, (_m, num: string, mag?: string) => {
    const g = (mag || "").toLowerCase();
    const word = !g ? "" : /^(b|billion)$/.test(g) ? " billion" : " million";
    return `${num.replace(/[.,]$/, "")}${word} dollars`;
  });
  // units (also when written straight after the number: "11.3MW")
  const unit = (re: RegExp, word: string) => {
    t = t.replace(re, `$1 ${word}`);
  };
  unit(/(\d)\s*GWh\b/g, "gigawatt hours");
  unit(/(\d)\s*MWh\b/g, "megawatt hours");
  unit(/(\d)\s*kWh\b/g, "kilowatt hours");
  unit(/(\d)\s*MW\b/g, "megawatts");
  unit(/(\d)\s*kW\b/g, "kilowatts");
  unit(/(\d)\s*kV\b/g, "kilovolts");
  unit(/(\d)\s*MLD\b/g, "million liters per day");
  unit(/(\d)\s*(?:km²|km2|sq\.?\s?km)(?![\w])/g, "square kilometers");
  // "a 2.8 km tunnel" is said "a 2.8 kilometer tunnel"
  unit(/(\d)\s*km\b(?=\s+(?:long\s+)?(?:tunnel|road|penstock|headrace|canal|viaduct|bridge|dike|pipeline|stretch|section|line|span|expressway|highway)\b)/g, "kilometer");
  unit(/(\d)\s*km\b/g, "kilometers");
  unit(/(\d)\s*(?:m³\/s|m3\/s|cms)(?![\w])/g, "cubic meters per second");
  unit(/(\d)\s*(?:m³|m3)(?![\w])/g, "cubic meters");
  unit(/(\d)\s*ha\b/g, "hectares");
  unit(/(\d)\s*%/g, "percent");
  t = t.replace(/\b1 (megawatts|kilowatts|kilometers|hectares)\b/g, (_m, w: string) => `1 ${w.slice(0, -1)}`);
  // dates and places
  t = t.replace(/\bQ([1-4])[\s-]+(\d{4})\b/g, (_m, q: string, y: string) => `the ${QUARTER[Number(q) - 1]} quarter of ${y}`);
  t = t.replace(/\b(\d{4})[\s-]+Q([1-4])\b/g, (_m, y: string, q: string) => `the ${QUARTER[Number(q) - 1]} quarter of ${y}`);
  t = t.replace(/\bRegion\s+(XIII|XII|XI|IX|X|VIII|VII|VI|IV|V|III|II|I)(?:-([AB]))?\b/g, (_m, r: string, s?: string) => `Region ${ROMAN[r]}${s ? ` ${s}` : ""}`);
  // abbreviations
  t = t.replace(/\be\.g\.,?/gi, "for example,").replace(/\bi\.e\.,?/gi, "that is,").replace(/\bvs\.?(?=\s)/gi, "versus");
  t = t.replace(/\bapprox\.?(?=\s)/gi, "approximately").replace(/\betc\.?/gi, "and so on");
  t = t.replace(/\bCOD\b/g, "commercial operations date").replace(/\bw\/(?=\s?\w)/g, "with ");
  // signs
  t = t.replace(/\s&\s/g, " and ").replace(/(\w)&(\w)/g, "$1 and $2");
  t = t.replace(/[~≈]\s?(?=\d)/g, "about ").replace(/≥\s?/g, "at least ").replace(/≤\s?/g, "at most ");
  t = t.replace(/(\d)\s?[–—-]\s?(\d)/g, "$1 to $2");
  t = t.replace(/(\w)\s\/\s(\w)/g, "$1 or $2");
  t = t.replace(/\s[–—]\s/g, ", ").replace(/[–—]/g, ", ");
  return t;
}

/** Anything left that is a mark rather than a word. */
function dropMarks(text: string): string {
  return text
    .replace(/[*#`|~^<>{}\\]/g, " ")
    .replace(/[\[\]]/g, " ")
    .replace(/(^|\s)_+|_+(?=\s|$)/g, "$1")
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/([.,;:!?]){2,}/g, "$1")
    .replace(/,\s*\./g, ".")
    .replace(/\(\s*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Rewrite written text (markdown answer or spoken version) as plain sentences to be said aloud. */
export function toNarration(input: string): string {
  if (!input) return "";
  let text = splitSpoken(input).display || input;
  text = text.replace(/\r\n?/g, "\n");
  text = text.replace(/```[\s\S]*?```/g, " "); // code blocks are for reading, not hearing
  // source tags and source lines are for the screen
  text = text.replace(/\[\s*Sources?\s*:[^\]]*\]/gi, " ").replace(/^\s*Sources?\s*:.*$/gim, " ");

  const lines = text.split("\n");
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // a table: consecutive lines that start with a pipe
    if (/^\s*\|/.test(line)) {
      const block: string[] = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) block.push(lines[i++]);
      i--;
      // "Here are the ongoing projects:" introduced it; the table then says how many there are
      if (out.length && /:$/.test(out[out.length - 1])) out[out.length - 1] = out[out.length - 1].replace(/:$/, ".");
      out.push(narrateTable(block));
      continue;
    }
    let l = line.trim();
    if (!l || /^[-*_=]{3,}$/.test(l)) continue; // blank lines and rules
    l = l.replace(/^#{1,6}\s+/, ""); // headings
    l = l.replace(/^>\s?/, ""); // quotes
    l = l.replace(/^(?:[-*+•]|\d+[.)])\s+/, ""); // list markers
    l = inline(l);
    // every line is its own sentence when spoken
    if (/[A-Za-z0-9)"’”]$/.test(l)) l += ".";
    out.push(l);
  }
  return dropMarks(sayIt(out.join(" ")));
}

/** True when the text carries marks that must not be read out (so it should go through `toNarration`). */
export function needsNarration(text: string): boolean {
  return /\*|`|\||\[\[|\[\s*Sources?\s*:|^\s*#{1,6}\s|\n\s*[-*+•]\s/m.test(text || "");
}
