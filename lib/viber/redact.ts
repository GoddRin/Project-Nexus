import { createHash } from "node:crypto";
import type { CleanMessage, RawChatMessage } from "./types";

/**
 * Privacy pass over parsed chat lines. Runs locally, before anything is stored, indexed or sent
 * to an AI service:
 *   - senders become stable aliases ("Staff-3F9A") derived from a secret salt, never real names;
 *   - phone numbers, e-mail addresses and links are removed;
 *   - names of group members, and "Sir/Mang/Kuya + Name" forms, are replaced inside the text;
 *   - non-work chatter (greetings, stickers, reactions, emoji-only lines) is dropped;
 *   - injury and safety-event lines are kept but flagged, so they can be shown to SAFETY and
 *     management roles only.
 */

// +63 9xx xxx xxxx, 09xx xxx xxxx, 8xxx-xxxx landlines, and any other run of 9+ digits with separators.
const PHONE = /(?:\+?63|0)[\s.-]?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}|\b\d{3,4}[\s.-]\d{3,4}[\s.-]\d{3,4}\b|\+\d[\d\s().-]{8,}\d/g;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const URL = /\b(?:https?:\/\/|www\.|vb\.me\/|invite\.viber\.com\/)\S+/gi;
const TITLES = ["sir", "maam", "ma'am", "madam", "mr", "mrs", "ms", "engr", "eng", "foreman", "mang", "aling", "kuya", "ate", "kap", "tay", "nay", "bro"];
// Titles match in any case; the name after must start with a capital (the `i` flag would make \p{Lu} match everything).
const HONORIFIC_NAME = new RegExp(
  `\\b((?:${TITLES.map((t) => `[${t[0]}${t[0].toUpperCase()}]${t.slice(1)}`).join("|")})\\.?)\\s+(\\p{Lu}\\p{Ll}+(?:\\s+\\p{Lu}\\p{Ll}+)?)`,
  "gu",
);

const PLACEHOLDER = /^<?\s*(?:sticker|photo|image|video|gif|voice message|audio|file|location|contact|this message was deleted|message deleted|\[?(?:media|attachment)\]?)\s*>?\.?$/i;
const EMOJI_ONLY = /^[\p{Extended_Pictographic}\p{Emoji_Component}\s.!?+]*$/u;

const CHATTER =
  /^(?:good\s*(?:morning|am|afternoon|evening|pm|day|night)|gm|gn|ge|happy\s+\w+|thanks?(?:\s*you)?|thank\s*you|salamat(?:\s*po)?|ok(?:ay)?|okey|sige(?:\s*po)?|noted|copy|roger|received|yes|yep|opo|oo|hehe|haha|lol|amen|congrats|congratulations|birthday|bday|hbd|welcome|pls|please)\b[\s\p{P}\p{Extended_Pictographic}]*(?:sir|maam|ma'am|po|team|all|everyone|guys)?[\s\p{P}\p{Extended_Pictographic}]*$/iu;

/** Words that mark a line as site work even when it is short. English, Tagalog and Ilocano site slang. */
const WORK =
  /\b(?:concrete|concreting|pour(?:ed|ing)?|rebar|formwork|scaffold\w*|excavat\w*|backfill\w*|tunnel|adit|penstock|intake|weir|tailrace|powerhouse|switchyard|surge|turbine|generator|transformer|cable|conduit|grout\w*|shotcrete|blast\w*|drill\w*|weld\w*|crane|excavator|backhoe|loader|dump\s*truck|truck|compressor|pump|batching|mixer|slump|cylinder|rebar|bar\s*bending|survey|elevation|stationing|sta\.?\s*\d|chainage|culvert|access\s*road|slope|riprap|gabion|soil|rock|bolt\w*|support|lining|manpower|pax|workers?|crew|shift|overtime|ot\b|delivery|delivered|cement|sand|gravel|steel|diesel|fuel|material\w*|equipment|breakdown|nasira|sira|sirang|tagas|tumagas|leak\w*|baha|flood\w*|ulan|rain\w*|typhoon|bagyo|signal\s*#?\d|water\s*level|ptw|permit|toolbox|inspection|inspect\w*|ncr|qa|qc|test\w*|%|percent|accomplish\w*|progress|target|plan|schedule|delay\w*|hold|standby|stand-by|blocked|waiting|repair\w*|ayos|gawa|tapos|natapos|ongoing|nagpa?pa?tuloy|nag-?\w+ng|sinimulan|started|completed|finished|done|cm\b|mm\b|m3|cu\.?m|kg|tons?|meters?|metres?)\b/i;

const SAFETY =
  /\b(?:injur\w*|nasugatan|sugat|accident\w*|aksidente|near[-\s]?miss|hospital|ospital|ambulance|first\s*aid|fell|nahulog|nadulas|collaps\w*|gumuho|landslide|sunog|fire|burn\w*|nasunog|electrocut\w*|nakuryente|kuryente|heat\s*stroke|unconscious|nawalan\s*ng\s*malay|fatal\w*|namatay|died|casualt\w*|trapped|na-?trap|rescue|lost\s*time|lti|ppe\s*violation|unsafe)\b/i;

export interface RedactOptions {
  /** Secret salt for sender aliases; keep it out of git. Changing it re-labels everyone. */
  salt: string;
  /** Drop lines with no work signal. Default true. */
  workOnly?: boolean;
}

export interface RedactResult {
  messages: CleanMessage[];
  stats: { in: number; kept: number; droppedChatter: number; droppedEmpty: number; safetyFlagged: number };
}

export function aliasFor(sender: string, salt: string): string {
  const h = createHash("sha256").update(`${salt}:${sender.trim().toLowerCase()}`).digest("hex");
  return `Staff-${h.slice(0, 4).toUpperCase()}`;
}

export function redactMessages(raw: RawChatMessage[], opts: RedactOptions): RedactResult {
  const { salt, workOnly = true } = opts;
  const aliasBySender = new Map<string, string>();
  const nameTokens = new Map<string, string>(); // lowercase name word -> alias
  for (const m of raw) {
    const s = m.sender.trim();
    if (!s || aliasBySender.has(s)) continue;
    const alias = aliasFor(s, salt);
    aliasBySender.set(s, alias);
    for (const w of s.split(/\s+/)) {
      if (w.length >= 3 && /^[\p{L}'-]+$/u.test(w)) nameTokens.set(w.toLowerCase(), alias);
    }
  }

  const stats = { in: raw.length, kept: 0, droppedChatter: 0, droppedEmpty: 0, safetyFlagged: 0 };
  const messages: CleanMessage[] = [];

  for (const m of raw) {
    const original = m.text.trim();
    if (!original || PLACEHOLDER.test(original) || EMOJI_ONLY.test(original)) {
      stats.droppedEmpty++;
      continue;
    }
    let text = scrub(original, nameTokens);
    text = text.replace(/\s+\n/g, "\n").replace(/[ \t]{2,}/g, " ").trim();
    if (!text) {
      stats.droppedEmpty++;
      continue;
    }
    const safety = SAFETY.test(original);
    const isWork = WORK.test(original) || safety || /\d/.test(original);
    if (workOnly && (!isWork || (CHATTER.test(text) && !safety))) {
      stats.droppedChatter++;
      continue;
    }
    messages.push({
      at: m.at,
      author: aliasBySender.get(m.sender.trim()) ?? aliasFor(m.sender || "unknown", salt),
      text,
      safety,
    });
    if (safety) stats.safetyFlagged++;
    stats.kept++;
  }
  return { messages, stats };
}

function scrub(text: string, nameTokens: Map<string, string>): string {
  let t = text.replace(URL, "[link]").replace(EMAIL, "[email]").replace(PHONE, "[number]");
  t = t.replace(HONORIFIC_NAME, (_m, title: string) => `${title} [name]`);
  if (nameTokens.size) {
    t = t.replace(/[\p{L}'-]{3,}/gu, (w) => nameTokens.get(w.toLowerCase()) ?? w);
  }
  return t;
}
