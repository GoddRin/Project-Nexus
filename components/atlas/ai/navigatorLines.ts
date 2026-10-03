/**
 * Context-aware line pool for the Atlas Navigator speech bubble.
 * Each line carries the body-language overlay that should accompany it.
 *
 * Personality: the navigator is a seasoned Sta. Clara field engineer, not a narrator.
 *  - "professional": straight information, no jokes.
 *  - "friendly" (default): warm, with the occasional light remark.
 *  - "playful": the full set, including engineering puns and running gags.
 * House rules for anything written here: the humour is about himself, the work and the map,
 * never about people, clients, money, delays, safety incidents or the weather hurting anyone,
 * and a joke never changes a fact or a number.
 *
 * Language: he is a Filipino engineer, so in "Taglish" (the default) Tagalog lines are mixed in
 * with the English ones, the way people talk on site. Only the neural voice can pronounce Tagalog
 * (the in-browser voice is American English and the browser has no Filipino voice), so a Tagalog
 * line is only chosen for SPEAKING once its neural clip exists; until then it can still appear as
 * bubble text. "English" leaves the Tagalog lines out altogether.
 */
export type OverlayId =
  | "wave" | "nod" | "surprise" | "tilt" | "shrug" | "salute" | "greet" | "point" | "shake"
  | "presentRight" | "presentLeft" | "bow";

export interface NavigatorLine {
  id: string;
  text: string;
  reaction: OverlayId;
}

export type NavigatorPersonality = "professional" | "friendly" | "playful";
export const PERSONALITY_ORDER: NavigatorPersonality[] = ["friendly", "playful", "professional"];
export const PERSONALITY_LABEL: Record<NavigatorPersonality, string> = {
  professional: "Professional",
  friendly: "Friendly",
  playful: "Playful",
};
const PERSONALITY_KEY = "atlas.navigator.personality";
const LANGUAGE_KEY = "atlas.navigator.language";

export type NavigatorLanguage = "taglish" | "english";
export const LANGUAGE_LABEL: Record<NavigatorLanguage, string> = { taglish: "Taglish", english: "English" };

export function getLanguage(): NavigatorLanguage {
  try {
    const v = typeof window !== "undefined" ? window.localStorage.getItem(LANGUAGE_KEY) : null;
    if (v === "english" || v === "taglish") return v;
  } catch {}
  return "taglish";
}

export function setLanguage(l: NavigatorLanguage): void {
  try {
    window.localStorage.setItem(LANGUAGE_KEY, l);
  } catch {}
}

/** Tagalog lines whose neural clip is ready (so they may be spoken, not only shown) */
const voicedFilipino = new Set<string>();
export function setVoicedFilipino(texts: string[]): void {
  voicedFilipino.clear();
  for (const t of texts) voicedFilipino.add(t);
}
const VISIT_KEY = "atlas.navigator.lastVisit";

export function getPersonality(): NavigatorPersonality {
  try {
    const v = typeof window !== "undefined" ? window.localStorage.getItem(PERSONALITY_KEY) : null;
    if (v === "professional" || v === "friendly" || v === "playful") return v;
  } catch {}
  return "friendly";
}

export function setPersonality(p: NavigatorPersonality): void {
  try {
    window.localStorage.setItem(PERSONALITY_KEY, p);
  } catch {}
}

/** 0 = professional, 1 = friendly, 2 = playful */
const level = (p: NavigatorPersonality) => (p === "playful" ? 2 : p === "friendly" ? 1 : 0);

/** A line plus the lowest personality level that may say it; `fil` marks a Tagalog line. */
type Tiered = NavigatorLine & { min?: 0 | 1 | 2; fil?: boolean };

export interface LineContext {
  hour: number;
  projectName?: string | null;
  /** Free-text sector / category of the selected project, used for sector-flavoured remarks */
  projectCategory?: string | null;
  /** The line is about to be spoken aloud (Tagalog lines then need their neural clip) */
  speak?: boolean;
  tapCount: number;
  returning?: boolean;
  personality?: NavigatorPersonality;
  /** 0 = Sunday … 6 = Saturday */
  day?: number;
}

// ── No-repeat picking: remember what was said recently so the same joke never lands twice in a row ──
const recent: string[] = [];
const RECENT_MAX = 10;
function pick<T extends { id: string }>(pool: T[], avoid?: string): T {
  let candidates = pool.filter((l) => l.id !== avoid && !recent.includes(l.id));
  if (candidates.length === 0) candidates = pool.filter((l) => l.id !== avoid);
  if (candidates.length === 0) candidates = pool;
  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  recent.push(chosen.id);
  if (recent.length > RECENT_MAX) recent.shift();
  return chosen;
}
const allowed = (pool: Tiered[], p: NavigatorPersonality, speak = false) => {
  const taglish = getLanguage() === "taglish";
  return pool.filter(
    (l) => (l.min ?? 0) <= level(p) && (!l.fil || (taglish && (!speak || voicedFilipino.has(l.text))))
  );
};
const strip = ({ id, text, reaction }: Tiered): NavigatorLine => ({ id, text, reaction });

// ── Greetings ────────────────────────────────────────────────────────────────
/** Whether this browser has been here before, and whether that was on an earlier day. */
export function noteVisit(): "first" | "same-day" | "earlier-day" {
  try {
    const prev = Number(window.localStorage.getItem(VISIT_KEY) || 0);
    const now = Date.now();
    window.localStorage.setItem(VISIT_KEY, String(now));
    if (!prev) return "first";
    return new Date(prev).toDateString() === new Date(now).toDateString() ? "same-day" : "earlier-day";
  } catch {
    return "first";
  }
}

function filipinoGreetings(hour: number): Tiered[] {
  const part = hour < 12 ? "Magandang umaga" : hour < 18 ? "Magandang hapon" : "Magandang gabi";
  const key = hour < 12 ? "umaga" : hour < 18 ? "hapon" : "gabi";
  return [
    { id: `greet-fil-${key}`, text: `${part}! Paano kita matutulungan sa mga proyekto ng Sta. Clara ngayon?`, reaction: "greet", fil: true },
    { id: `greet-fil2-${key}`, text: `${part}! Ano ang titingnan natin ngayon?`, reaction: "greet", fil: true },
    { id: "greet-mabuhay", text: "Mabuhay! Welcome sa Project Atlas ng Sta. Clara.", reaction: "greet", fil: true },
  ];
}

export function greetingLine(
  ctx: LineContext & { visit?: "first" | "same-day" | "earlier-day"; favourite?: string | null }
): NavigatorLine {
  const p = ctx.personality ?? "friendly";
  // On a new day, someone who keeps coming back to one project is offered it straight away
  if (ctx.favourite && ctx.visit === "earlier-day" && !ctx.returning && Math.random() < 0.7) {
    const part = ctx.hour < 12 ? "Good morning" : ctx.hour < 18 ? "Good afternoon" : "Good evening";
    return { id: "greet-favourite", text: `${part}! Welcome back. Shall we pick up at ${ctx.favourite} again?`, reaction: "greet" };
  }
  if (ctx.returning) {
    const pool: Tiered[] = [
      { id: "welcome-back", text: "Welcome back! Where shall we look next?", reaction: "greet" },
      { id: "welcome-back-fil", text: "Uy, nandito ka ulit! Tara, tingnan natin ang mga proyekto.", reaction: "greet", min: 1, fil: true },
      { id: "welcome-back-warm", text: "Welcome back! I kept the map warm for you.", reaction: "greet", min: 1 },
      { id: "welcome-back-watch", text: "There you are. Nothing moved while you were gone. I checked. Twice.", reaction: "greet", min: 2 },
    ];
    return strip(pick(allowed(pool, p, ctx.speak)));
  }
  // In Taglish about half of his greetings are in Tagalog
  const filipino = allowed(filipinoGreetings(ctx.hour), p, ctx.speak);
  if (filipino.length && Math.random() < 0.5) return strip(pick(filipino));
  const part = ctx.hour < 12 ? "Good morning" : ctx.hour < 18 ? "Good afternoon" : "Good evening";
  const plain: NavigatorLine = { id: "greet", text: `${part}! How can I help you today?`, reaction: "greet" };
  if (level(p) === 0) return plain;

  const special: Tiered[] = [];
  if (ctx.visit === "earlier-day") {
    special.push({ id: "greet-again", text: `${part}! Good to see you again. The dams asked about you.`, reaction: "greet", min: 1 });
  }
  if (ctx.day === 1 && ctx.hour < 12) {
    special.push({ id: "greet-monday", text: "Good morning! Fresh week, fresh concrete. What are we looking at?", reaction: "greet", min: 1 });
  }
  if (ctx.day === 5 && ctx.hour >= 13 && ctx.hour < 19) {
    special.push({ id: "greet-friday", text: "Happy Friday! Let’s wrap this up before the cement sets.", reaction: "greet", min: 1 });
  }
  if (ctx.hour >= 12 && ctx.hour < 13) {
    special.push({ id: "greet-lunch", text: "It’s lunchtime in Manila, so I’ll keep it quick. What do you need?", reaction: "greet", min: 1 });
  }
  if (ctx.hour >= 21 || ctx.hour < 5) {
    special.push({ id: "greet-late", text: "Burning the midnight oil? I’m on the night shift too. How can I help?", reaction: "greet", min: 1 });
  }
  const usable = allowed(special, p, ctx.speak);
  // The plain greeting still turns up most of the time: a quip every single visit would wear thin
  if (usable.length && Math.random() < (level(p) === 2 ? 0.85 : 0.55)) return strip(pick(usable));
  return plain;
}

// ── Tap lines ────────────────────────────────────────────────────────────────
const TAP_LINES: Tiered[] = [
  { id: "tap-help", text: "How can I help you today? Ask about any project, region, or capacity.", reaction: "greet" },
  { id: "tap-tour", text: "Want a quick tour? Say ‘start tour’ and I’ll guide you across Luzon, Visayas, and Mindanao.", reaction: "nod" },
  { id: "tap-portfolio", text: "Sta. Clara runs more than 60 projects: hydropower, tunneling, and water utilities.", reaction: "point" },
  { id: "tap-try", text: "Try asking: ‘Show ongoing hydropower in Region II’.", reaction: "tilt" },
  { id: "tap-specs", text: "I can break down capacities, dam tunneling, river basins, or provincial contractors.", reaction: "nod" },
  { id: "tap-map", text: "Click any marker and I’ll take a look with you.", reaction: "point" },
  { id: "tap-ready", text: "Hard hat on, clipboard ready. Where to?", reaction: "salute", min: 1 },
  { id: "tap-tara", text: "Tara! Pick a region and I’ll walk you through it.", reaction: "greet", min: 1 },
  { id: "tap-landmark", text: "I’ve been standing here so long I almost qualify as a landmark. Give me something to do?", reaction: "shrug", min: 1 },
  { id: "tap-memorised", text: "Fun fact: I’ve memorised every project on this map. I am not as fun at parties as that sounds.", reaction: "tilt", min: 2 },
  { id: "tap-opinions", text: "Ask me about megawatts. I have opinions.", reaction: "point", min: 2 },
  { id: "tap-coffee", text: "I’d offer you coffee, but I’m made of polygons. Information, though, I have plenty of.", reaction: "shrug", min: 2 },
  { id: "tap-desk", text: "Dozens of project sites and not one of them is a desk. Where shall we go?", reaction: "point", min: 2 },
  { id: "tap-fil-ask", text: "Sige, ano ang gusto mong malaman? Proyekto, rehiyon, o kapasidad?", reaction: "nod", fil: true },
  { id: "tap-fil-marker", text: "Game! Pumili ka ng marker at sabay nating tingnan.", reaction: "point", min: 1, fil: true },
  { id: "tap-fil-kabisado", text: "Mula Luzon hanggang Mindanao, kabisado ko ang mga proyekto natin.", reaction: "point", min: 1, fil: true },
  { id: "tap-fil-safety", text: "Safety first palagi. Kaya naka-hard hat ako kahit nasa mapa lang.", reaction: "salute", min: 1, fil: true },
  { id: "tap-fil-libre", text: "Tanong lang nang tanong. Libre naman.", reaction: "shrug", min: 2, fil: true },
  { id: "tap-fil-kape", text: "Kape muna? Biro lang. Trabaho muna tayo.", reaction: "tilt", min: 2, fil: true },
];

/** Every fifth tap */
const TAP_EGGS: Tiered[] = [
  { id: "egg-1", text: "Ooh! Okay, I’m awake! What would you like to explore?", reaction: "surprise" },
  { id: "egg-2", text: "That tickles a little. Ask me something about the map?", reaction: "shrug" },
  { id: "egg-3", text: "Still here! Press Ctrl K to talk to me faster.", reaction: "salute" },
];

/** Several taps in a few seconds */
const POKE_LINES: Tiered[] = [
  { id: "poke-1", text: "Okay, okay, I’m up! What do you need?", reaction: "surprise" },
  { id: "poke-2", text: "Easy! This hard hat is rated for falling objects, not tickles.", reaction: "surprise", min: 1 },
  { id: "poke-3", text: "Safety first. It’s literally written on my vest.", reaction: "shake", min: 1 },
  { id: "poke-4", text: "You tap like a site inspector on a deadline. I respect that.", reaction: "salute", min: 2 },
  { id: "poke-5", text: "That’s a new site record for taps. No prize, sorry. Budget went into the dam.", reaction: "shrug", min: 2 },
  { id: "poke-fil-1", text: "Aray! Dahan-dahan lang.", reaction: "surprise", min: 1, fil: true },
  { id: "poke-fil-2", text: "Teka, teka! Isa-isa lang.", reaction: "shake", min: 1, fil: true },
];

const HOVER_HINTS: Tiered[] = [
  { id: "hover-1", text: "Hi there! Tap me, or press Ctrl K to ask anything.", reaction: "wave" },
  { id: "hover-2", text: "Need a hand? I can search, compare, and tour projects.", reaction: "tilt" },
  { id: "hover-3", text: "I don’t bite. Worst case, I recite capacity figures.", reaction: "wave", min: 2 },
  { id: "hover-fil", text: "Kumusta! I-tap mo ako kung may tanong ka.", reaction: "wave", fil: true },
];

// ── Project lines, with a sector flavour when we know it ─────────────────────
type Sector = "hydro" | "tunnel" | "road" | "water" | "wind" | "other";
function sectorOf(category?: string | null, name?: string | null): Sector {
  const s = `${category || ""} ${name || ""}`.toLowerCase();
  if (/tunnel/.test(s)) return "tunnel";
  if (/hydro|hepp|dam\b/.test(s)) return "hydro";
  if (/water|wtp|reservoir|irrigation|flood/.test(s)) return "water";
  if (/bridge|road|highway|expressway|flyover/.test(s)) return "road";
  if (/wind|solar/.test(s)) return "wind";
  return "other";
}

function projectLines(name: string, sector: Sector): Tiered[] {
  const base: Tiered[] = [
    { id: "proj-1", text: `Looking at ${name}. Tap me for its engineering specs.`, reaction: "nod" },
    { id: "proj-2", text: `${name}. Want a summary, a comparison, or the full profile?`, reaction: "point" },
    { id: "proj-3", text: `${name}. Good pick. What would you like to know?`, reaction: "nod", min: 1 },
  ];
  const flavour: Record<Sector, Tiered[]> = {
    hydro: [
      { id: "proj-hydro-1", text: `${name}. Water in, power out. I do love a simple business model.`, reaction: "point", min: 1 },
      { id: "proj-hydro-2", text: `${name}. The river does the hard work here; we just built it a very nice office.`, reaction: "tilt", min: 2 },
    ],
    tunnel: [
      { id: "proj-tunnel-1", text: `${name}. The light at the end of this tunnel is an actual project milestone.`, reaction: "point", min: 1 },
    ],
    road: [
      { id: "proj-road-1", text: `${name}. A bridge is just a shortcut that took a few years to build.`, reaction: "tilt", min: 2 },
      { id: "proj-road-2", text: `${name}. Fewer kilometres, fewer hours. That’s the whole pitch.`, reaction: "nod", min: 1 },
    ],
    water: [
      { id: "proj-water-1", text: `${name}. Somebody’s morning coffee depends on this one.`, reaction: "nod", min: 1 },
    ],
    wind: [
      { id: "proj-wind-1", text: `${name}. Free fuel, delivered daily. Weather permitting.`, reaction: "tilt", min: 1 },
    ],
    other: [],
  };
  return [...base, ...flavour[sector]];
}

export function nextTapLine(ctx: LineContext & { rapid?: boolean }, last?: string): NavigatorLine {
  const p = ctx.personality ?? "friendly";
  if (ctx.rapid) return strip(pick(allowed(POKE_LINES, p, ctx.speak), last));
  if (ctx.tapCount > 0 && ctx.tapCount % 5 === 0) return strip(pick(allowed(TAP_EGGS, p, ctx.speak), last));
  if (ctx.projectName && Math.random() < 0.5) {
    return strip(pick(allowed(projectLines(ctx.projectName, sectorOf(ctx.projectCategory, ctx.projectName)), p), last));
  }
  return strip(pick(allowed(TAP_LINES, p, ctx.speak), last));
}

/**
 * Every stock line this personality can say, most likely first, for generating the neural voice in
 * the background. The speech model allows about 30 new lines a day, so the list fills over a few
 * days of use: whatever is still missing is picked up the next time the page is opened.
 */
export function warmupLines(p: NavigatorPersonality, hour: number): string[] {
  const part = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const texts = (pool: Tiered[]) => allowed(pool, p).map((l) => l.text);
  const rest = allStockLines();
  const first = [
    ...(getLanguage() === "taglish" ? filipinoLines() : []),
    `${part}! How can I help you today?`,
    ...texts(TAP_LINES),
    ...texts(POKE_LINES),
    ...texts(TAP_EGGS),
    ...texts(HOVER_HINTS),
    ...texts(QUIPS.thinking),
    ...Object.values(QUIPS).flatMap(texts),
    ...PERSONALITY_ORDER.map((x) => personalityIntro(x).text),
    proactiveTip().text,
  ];
  // then anything else he could say (other times of day, other personalities)
  return [...new Set([...first, ...rest])];
}

/**
 * Every fixed line he can say, in every personality and time of day (for generating the neural
 * voice ahead of time: scripts/warm-atlas-voice.ts). Lines built around a project name are listed
 * separately by `projectStockLines`.
 */
export function allStockLines(): string[] {
  const out: string[] = [];
  for (const part of ["Good morning", "Good afternoon", "Good evening"]) {
    out.push(`${part}! How can I help you today?`);
    out.push(`${part}! Good to see you again. The dams asked about you.`);
  }
  for (const hour of [8, 14, 20]) for (const l of filipinoGreetings(hour)) out.push(l.text);
  out.push("Uy, nandito ka ulit! Tara, tingnan natin ang mga proyekto.");
  out.push(
    "Welcome back! Where shall we look next?",
    "Welcome back! I kept the map warm for you.",
    "There you are. Nothing moved while you were gone. I checked. Twice.",
    "Good morning! Fresh week, fresh concrete. What are we looking at?",
    "Happy Friday! Let’s wrap this up before the cement sets.",
    "It’s lunchtime in Manila, so I’ll keep it quick. What do you need?",
    "Burning the midnight oil? I’m on the night shift too. How can I help?"
  );
  for (const pool of [TAP_LINES, TAP_EGGS, POKE_LINES, HOVER_HINTS, ...Object.values(QUIPS)]) {
    for (const l of pool) out.push(l.text);
  }
  for (const p of PERSONALITY_ORDER) out.push(personalityIntro(p).text);
  out.push(proactiveTip().text, LISTENING_LINE.text, "Taglish mode. I'll mix in some Tagalog.", "English only. Understood.");
  return [...new Set(out)];
}

/** Every Tagalog line (they are generated first, and checked for a ready neural clip). */
export function filipinoLines(): string[] {
  const out: string[] = [];
  for (const hour of [8, 14, 20]) for (const l of filipinoGreetings(hour)) out.push(l.text);
  out.push("Uy, nandito ka ulit! Tara, tingnan natin ang mga proyekto.");
  for (const pool of [TAP_LINES, TAP_EGGS, POKE_LINES, HOVER_HINTS, ...Object.values(QUIPS)]) {
    for (const l of pool) if (l.fil) out.push(l.text);
  }
  return [...new Set(out)];
}

/** The lines he can say about one project (every personality). */
export function projectStockLines(name: string, category?: string | null): string[] {
  return projectLines(name, sectorOf(category, name)).map((l) => l.text);
}

export function hoverHint(last?: string, p: NavigatorPersonality = "friendly", speak = false): NavigatorLine {
  return strip(pick(allowed(HOVER_HINTS, p, speak), last));
}

export function proactiveTip(): NavigatorLine {
  return {
    id: "tip",
    text: "Tip: every Sta. Clara project is on this map. Want me to give you a guided tour?",
    reaction: "wave",
  };
}

export function projectSelectedLine(
  name: string,
  last?: string,
  p: NavigatorPersonality = "friendly",
  category?: string | null
): NavigatorLine {
  return strip(pick(allowed(projectLines(name, sectorOf(category, name)), p), last));
}

export const LISTENING_LINE: NavigatorLine = { id: "listening", text: "I’m listening…", reaction: "tilt" };

// ── Reactions to what the user is doing (bubble text; spoken only when Talkative is on) ──
export type QuipKind =
  | "spin"          // dragged to turn him around
  | "map-frenzy"    // lots of pan / zoom in a few seconds
  | "theme-light"
  | "theme-dark"
  | "weather-on"
  | "national-view"
  | "idle"          // nothing has happened for a few minutes
  | "thinking";     // the assistant is working on an answer

const QUIPS: Record<QuipKind, Tiered[]> = {
  spin: [
    { id: "spin-1", text: "Whoa. I’m an engineer, not a turntable.", reaction: "surprise", min: 1 },
    { id: "spin-2", text: "Checking my back for a ‘kick me’ sign? All clear.", reaction: "shrug", min: 2 },
    { id: "spin-3", text: "A proper site walk-around usually takes longer than that.", reaction: "tilt", min: 1 },
    { id: "spin-fil", text: "Uy! Engineer ako, hindi turntable.", reaction: "surprise", min: 1, fil: true },
  ],
  "map-frenzy": [
    { id: "frenzy-1", text: "Easy on the scrolling, I’m getting map-sick.", reaction: "surprise", min: 1 },
    { id: "frenzy-2", text: "Three regions in two seconds. Even our haul trucks can’t do that.", reaction: "tilt", min: 2 },
    { id: "frenzy-3", text: "Looking for something? Tell me and I’ll take you straight there.", reaction: "point", min: 1 },
    { id: "frenzy-fil", text: "Dahan-dahan, nahihilo ako sa mapa.", reaction: "surprise", min: 1, fil: true },
  ],
  "theme-light": [
    { id: "light-1", text: "Ah, someone found the light switch.", reaction: "tilt", min: 1 },
    { id: "light-2", text: "Day shift. I’ll look more awake, promise.", reaction: "salute", min: 2 },
    { id: "light-fil", text: "Ayan, maliwanag na.", reaction: "tilt", min: 1, fil: true },
  ],
  "theme-dark": [
    { id: "dark-1", text: "Night shift it is. I’ll keep my voice down.", reaction: "nod", min: 1 },
    { id: "dark-2", text: "Dark mode. Very control-room. I approve.", reaction: "nod", min: 2 },
    { id: "dark-fil", text: "Night shift na tayo.", reaction: "nod", min: 1, fil: true },
  ],
  "weather-on": [
    { id: "wx-1", text: "Rain radar is on. Blue patches are rain moving through.", reaction: "point" },
    { id: "wx-2", text: "Rain radar is on. In hydropower we call that incoming inventory.", reaction: "point", min: 2 },
    { id: "wx-fil", text: "Naka-on ang rain radar. Ulan ang mga asul na bahagi.", reaction: "point", fil: true },
  ],
  "national-view": [
    { id: "nat-1", text: "Back to the big picture.", reaction: "nod", min: 1 },
    { id: "nat-2", text: "The whole archipelago again. All 7,641 islands, give or take the tide.", reaction: "presentLeft", min: 2 },
    { id: "nat-fil", text: "Balik tayo sa buong Pilipinas.", reaction: "nod", min: 1, fil: true },
  ],
  idle: [
    { id: "idle-1", text: "Still here. Just counting megawatts.", reaction: "tilt", min: 1 },
    { id: "idle-2", text: "Quiet shift. I checked: the rivers are still running.", reaction: "nod", min: 1 },
    { id: "idle-3", text: "If you’re on a coffee break, I approve. I’ll guard the map.", reaction: "salute", min: 2 },
    { id: "idle-fil", text: "Nandito lang ako. Tawagin mo lang ako kung kailangan.", reaction: "tilt", min: 1, fil: true },
  ],
  thinking: [
    { id: "think-1", text: "Let me check the records…", reaction: "tilt" },
    { id: "think-2", text: "One second, pulling that up.", reaction: "nod" },
    { id: "think-3", text: "Good question. Checking the database…", reaction: "tilt", min: 1 },
    { id: "think-4", text: "Hmm. Let me look at the drawings.", reaction: "tilt", min: 1 },
    { id: "think-5", text: "Give me a moment, I left that file under a dam somewhere.", reaction: "shrug", min: 2 },
    { id: "think-fil-1", text: "Sandali lang, hinahanap ko.", reaction: "nod", fil: true },
    { id: "think-fil-2", text: "Teka, tingnan ko sa records.", reaction: "tilt", min: 1, fil: true },
  ],
};

/** A reaction line for something the user just did, or null when this personality stays quiet about it. */
export function eventQuip(kind: QuipKind, p: NavigatorPersonality, last?: string, speak = false): NavigatorLine | null {
  const pool = allowed(QUIPS[kind], p, speak);
  return pool.length ? strip(pick(pool, last)) : null;
}

export function personalityIntro(p: NavigatorPersonality): NavigatorLine {
  if (p === "playful") return { id: "pers-playful", text: "Playful it is. I’ll keep the puns structurally sound.", reaction: "salute" };
  if (p === "professional") return { id: "pers-professional", text: "Professional mode. Facts and figures only.", reaction: "nod" };
  return { id: "pers-friendly", text: "Friendly mode. Just the occasional remark, I promise.", reaction: "greet" };
}

// ── Guided tours: a guide's asides between the facts ─────────────────────────
const TOUR_ASIDES: Array<{ text: string; min: 1 | 2 }> = [
  { text: "If you’re taking notes, this is a good one to underline.", min: 1 },
  { text: "This one is a personal favourite, and I’m not supposed to have favourites.", min: 1 },
  { text: "That is a lot of concrete. Yes, I counted.", min: 2 },
  { text: "No hard hat required for this part of the tour.", min: 2 },
  { text: "I’d say it’s all downhill from here, but in hydropower that’s the whole idea.", min: 2 },
];
const TOUR_SIGNOFFS: Array<{ text: string; min: 1 | 2 }> = [
  { text: "And that’s the tour. Thanks for walking it with me.", min: 1 },
  { text: "And that’s the tour. Tips are welcome, but megawatts are better.", min: 2 },
];

const hash = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

/**
 * Adds an occasional aside to tour narration. Deterministic per stop (so the same stop always says
 * the same thing and its generated voice stays cached), never on the opening stop, roughly one
 * stop in three, plus a sign-off on the last. Professional mode returns the steps untouched.
 */
export function withTourAsides<T extends { id?: string; title?: string; narration: string }>(
  steps: T[],
  p: NavigatorPersonality = getPersonality()
): T[] {
  const lv = level(p);
  if (lv === 0 || steps.length < 2) return steps;
  const asides = TOUR_ASIDES.filter((a) => a.min <= lv);
  const signoffs = TOUR_SIGNOFFS.filter((a) => a.min <= lv);
  return steps.map((step, i) => {
    const key = hash(step.id || step.title || String(i));
    const isLast = i === steps.length - 1;
    let extra = "";
    if (isLast && signoffs.length) extra = signoffs[key % signoffs.length].text;
    else if (i > 0 && asides.length && key % 3 === 0) extra = asides[key % asides.length].text;
    if (!extra || step.narration.includes(extra)) return step;
    return { ...step, narration: `${step.narration.trim()} ${extra}` };
  });
}
