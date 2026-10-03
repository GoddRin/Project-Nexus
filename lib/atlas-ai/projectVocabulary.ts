import projects from "@/lib/data/scicAtlasInitialProjects.json";

/**
 * The names speech recognition does not know: project names and the places they are in
 * (Maladugao, Kapangan, Tumauini, Kalilangan...). Used three ways:
 *  - as a hint list for the speech-to-text model, so it expects these words at all
 *    (app/api/atlas-ai/transcribe);
 *  - to put a misheard name right afterwards ("Mala Dugo" -> "Maladugao"), for the browser's own
 *    recognition too, which takes no hints (fixProjectNames, in correctTranscript);
 *  - on every question before the assistant sees it, so a typo still finds the project
 *    (lib/atlas-ai/service.ts).
 * Built from the project records, so a new project is covered without touching this file.
 */

type Rec = { name: string; province?: string | null; municipality?: string | null; region?: string | null };

// Ordinary words inside project names: never a target for correction (they are recognised fine,
// and "correcting" an ordinary word towards them would change what the user said)
const GENERIC = new Set(
  `hydroelectric power project plant wind water treatment bridge phase facility facilities expansion upper cascade
  mini north south east west railway extension complex industrial rehabilitation infrastructure membership shopping
  warehouse express cargo services discovery park marine corps mixed resort housing reserve logistics distribution
  manufacturing underground tailings management seismic resiliency enhancement reservoir storage battery energy system
  transmission line substation combined cycle steel rolling mill specialized flour offloading terminal freeport
  expressway capacity tunnel tunnels mountain package toll road roads access supply network modernization improvement
  river foundation trade highway corridor flood mitigation valley multipurpose interlink preliminary civil works small
  irrigation mining national headquarters plaza city hall redevelopment commuter hill removal agro agri pumped
  balance service center global corporation island general central viaduct mega works lower plants
  province region development philippine rural metro oriental norte mixed-use mini-hydroelectric north-south
  agri-industrial agro-industrial`.split(/\s+/)
);

// Little words a misheard name never starts with ("in Mindanao" must not become one word)
const LEADING_STOP = new Set("a an the is in on of at to and for me my our about from with by are was".split(" "));

function words(text: string): string[] {
  return text
    .replace(/\([^)]*\)/g, " ")
    .split(/[^A-Za-zÀ-ÿñÑ'-]+/)
    .map((w) => w.replace(/^['-]+|['-]+$/g, ""))
    .filter(Boolean);
}

/** Distinctive names, canonical spelling, longest first */
export const PROJECT_VOCABULARY: string[] = (() => {
  const seen = new Map<string, string>();
  for (const p of projects as Rec[]) {
    for (const source of [p.name, p.municipality, p.province]) {
      for (const w of words(source || "")) {
        const key = w.toLowerCase();
        if (w.length < 5 || GENERIC.has(key) || !/^[A-Z]/.test(w)) continue;
        if (!seen.has(key)) seen.set(key, w);
      }
    }
  }
  return [...seen.values()].sort((a, b) => b.length - a.length);
})();

/** Words from the project names alone (the speech model's hint list has room for these, not every place) */
export const PROJECT_NAME_WORDS: string[] = (() => {
  const set = new Set(PROJECT_VOCABULARY.map((w) => w.toLowerCase()));
  const out = new Set<string>();
  for (const p of projects as Rec[]) for (const w of words(p.name)) if (set.has(w.toLowerCase())) out.add(w);
  return [...out];
})();

/** Sound-alike key: spellings that sound the same compare equal (Mala Dugo / Maladugao, Kapang an / Kapangan) */
function soundKey(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z]/g, "")
    .replace(/ph/g, "f")
    .replace(/ck|c(?=[aou])|q/g, "k")
    .replace(/c/g, "s")
    .replace(/v/g, "b")
    .replace(/z/g, "s")
    .replace(/h/g, "")
    .replace(/[eiy]/g, "i")
    .replace(/[ou]/g, "o")
    .replace(/(.)\1+/g, "$1");
}

function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length];
}

const VOCAB_KEYS = PROJECT_VOCABULARY.map((w) => ({ word: w, key: soundKey(w) }));

/** The project name a (possibly misheard or mistyped) word or phrase stands for, or null */
export function closestProjectWord(phrase: string): string | null {
  const key = soundKey(phrase);
  if (key.length < 4) return null;
  let best: { word: string; score: number } | null = null;
  for (const v of VOCAB_KEYS) {
    if (Math.abs(v.key.length - key.length) > 2) continue;
    const score = 1 - editDistance(key, v.key) / Math.max(key.length, v.key.length);
    if (score >= 0.8 && (!best || score > best.score)) best = { word: v.word, score };
  }
  return best?.word ?? null;
}

/**
 * Put misheard project and place names right: looks at runs of one to three words ("Mala Dugo",
 * "Kapang an", "Tuma ini") and replaces a run that sounds like a known name with that name.
 * Ordinary words are left alone (a run must not already be a common word of a project name).
 */
export function fixProjectNames(text: string): string {
  if (!text) return text;
  const tokens = text.split(/(\s+)/); // keeps the spaces
  const wordIdx = tokens.map((t, i) => (/\S/.test(t) ? i : -1)).filter((i) => i >= 0);
  const out = [...tokens];
  let k = 0;
  while (k < wordIdx.length) {
    let replaced = false;
    for (let span = Math.min(3, wordIdx.length - k); span >= 1; span--) {
      const idx = wordIdx.slice(k, k + span);
      const raw = idx.map((i) => tokens[i]).join(" ");
      const lead = raw.match(/^[^A-Za-zÀ-ÿ]*/)?.[0] ?? "";
      const trail = raw.match(/[^A-Za-zÀ-ÿ]*$/)?.[0] ?? "";
      const core = raw.slice(lead.length, raw.length - trail.length);
      // a single plain word must look like a name to be touched (5+ letters, not a common word)
      if (!core || /[^A-Za-zÀ-ÿ' -]/.test(core)) continue;
      if (span === 1 && (core.length < 5 || GENERIC.has(core.toLowerCase()))) continue;
      if (span > 1 && idx.some((i) => GENERIC.has(tokens[i].toLowerCase().replace(/[^a-z]/g, "")))) continue;
      if (span > 1 && LEADING_STOP.has(tokens[idx[0]].toLowerCase().replace(/[^a-z]/g, ""))) continue;
      const hit = closestProjectWord(core);
      if (!hit) continue;
      if (hit.toLowerCase() === core.toLowerCase()) break; // already right
      out[idx[0]] = lead + hit + trail;
      for (let j = 1; j < idx.length; j++) {
        out[idx[j]] = "";
        out[idx[j] - 1] = ""; // the space before a merged word
      }
      k += span;
      replaced = true;
      break;
    }
    if (!replaced) k += 1;
  }
  return out.join("").replace(/\s{2,}/g, " ");
}
