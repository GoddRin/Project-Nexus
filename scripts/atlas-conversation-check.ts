/**
 * Conversation checks for the Atlas assistant, run against the live dev server.
 *
 *   npx tsx scripts/atlas-conversation-check.ts [rounds]
 *
 * Each case is a real question, often asked after earlier turns (the empty-answer bug only showed
 * up with conversation history). A case passes when the answer is not empty, contains the expected
 * fact, carries a spoken version ([[SAY: ...]]) and the spoken version has no screen marks in it.
 * Add a case here whenever the assistant gets something wrong.
 */
const BASE = process.env.ATLAS_URL || "http://localhost:3000";

type Turn = { role: "user" | "assistant"; content: string };
interface Case {
  name: string;
  history: Turn[];
  question: string;
  expect: RegExp;
}

const company: Turn[] = [
  { role: "user", content: "can you tell me about the company" },
  {
    role: "assistant",
    content:
      "Sta. Clara International Corporation (SCIC) is a leading Philippine engineering and construction firm, founded in 1976, led by Chairman and Managing Director Nicandro G. Linao. [Source: Sta. Clara company profile]",
  },
];
const mindanao: Turn[] = [
  ...company,
  { role: "user", content: "how many projects are there currently in mindanao" },
  { role: "assistant", content: "There are 11 projects in Mindanao. [Source: Project Atlas Database]" },
];

const CASES: Case[] = [
  { name: "Mindanao count after a company question", history: company, question: "how many projects are there currently in mindanao", expect: /\b11\b|eleven/i },
  { name: "Mindanao count, no history", history: [], question: "how many projects are there currently in mindanao", expect: /\b11\b|eleven/i },
  { name: "Follow-up: ongoing there", history: mindanao, question: "and how many of those are ongoing?", expect: /\b5\b|five/i },
  { name: "Chairman", history: [], question: "who is our chairman", expect: /Nicandro/i },
  { name: "Solar projects (on the map since 2026-10-03)", history: [], question: "i'd like to know more about our solar projects", expect: /Toledo/i },
  { name: "Solar count", history: [], question: "how many solar projects do we have?", expect: /2|two/i },
  { name: "Wind: the map does have wind farms", history: [], question: "which wind farms have we built?", expect: /Balaoi|Caunayan|Kalayaan 2|Libmanan|Quezon North/i },
  {
    name: "\"are there\" is not a follow-up (Cagayan Valley after a solar question)",
    history: [
      { role: "user", content: "how many solar projects do we have?" },
      { role: "assistant", content: "There are 2 Sta. Clara solar projects across the portfolio. [Source: Project Atlas Database]" },
    ],
    question: "how many projects are there in cagayan valley",
    expect: /3|three/i,
  },
  { name: "Misheard project name (voice)", history: [], question: "tell me about mala dugo project", expect: /Maladugao/i },
  { name: "Central office", history: company, question: "where is our central office located", expect: /Mandaluyong/i },
  { name: "Founding year", history: [], question: "when was the company founded?", expect: /1976/ },
  { name: "Ongoing hydro in Region II", history: company, question: "show ongoing hydropower in region II", expect: /Tumauini/i },
  { name: "Whole portfolio count", history: [], question: "how many projects do we have?", expect: /\b63\b/ },
  { name: "Ongoing hydro in Region II, count", history: [], question: "how many ongoing hydropower projects are in region II?", expect: /\b\d+\b/ },
  { name: "Province count", history: [], question: "how many projects are in Benguet", expect: /Benguet/ },
  { name: "Follow-up: completed ones", history: mindanao, question: "what about completed?", expect: /\b5\b|five/i },
  { name: "Persona: who are you", history: [], question: "who are you", expect: /Atlas/ },
  { name: "Persona: where are you", history: [], question: "where are you", expect: /map|atlas|right here/i },
  { name: "Persona: are you human", history: [], question: "are you a real person?", expect: /AI|not a (real )?person|guide/i },
  { name: "Capacity in Luzon", history: [], question: "how many megawatts do we have in Luzon", expect: /MW|megawatt/i },
  { name: "List in Bohol", history: [], question: "which projects are in Bohol", expect: /Loboc/i },
  { name: "Largest in Mindanao", history: [], question: "what is the biggest project in Mindanao", expect: /Manolo Fortich/i },
  { name: "Wind count", history: [], question: "how many wind projects do we have", expect: /\b5\b|five/i },
  { name: "Region with most projects", history: mindanao, question: "which region has the most projects?", expect: /region|ncr|car|calabarzon|luzon/i },
];

async function ask(c: Case) {
  const started = Date.now();
  const res = await fetch(`${BASE}/api/atlas-ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: c.question,
      history: c.history,
      context: { persona: "friendly", language: "english", pace: "normal", portfolioCount: 63 },
      stream: false,
    }),
  });
  const data = (await res.json()) as { answer?: string; metadata?: { provider?: string; executedTools?: string[] } };
  return { answer: data.answer || "", ms: Date.now() - started, provider: data.metadata?.provider, tools: data.metadata?.executedTools ?? [] };
}

/** --feedback: ask every question that got a thumbs-down again, and show old and new answers side by side */
async function replayFeedback() {
  const res = await fetch(`${BASE}/api/atlas-ai/feedback`);
  const data = (await res.json()) as { entries: Array<{ at: string; rating: string; question: string; answer: string }> };
  const downs = data.entries.filter((e) => e.rating === "down" && e.question);
  console.log(`${downs.length} answers rated down`);
  for (const e of downs) {
    const now = await ask({ name: "feedback", history: [], question: e.question, expect: /./ });
    console.log(`\nQ (${e.at}): ${e.question}\n  before: ${e.answer.split("[[SAY")[0].slice(0, 240).replace(/\n/g, " ")}\n  now:    ${now.answer.split("[[SAY")[0].slice(0, 240).replace(/\n/g, " ")}`);
    await new Promise((r) => setTimeout(r, Number(process.env.ATLAS_CHECK_GAP_MS || 14000)));
  }
  console.log("\nIf an answer is still wrong, add the question to CASES with what it should contain.");
}

async function main() {
  if (process.argv.includes("--feedback")) return replayFeedback();
  const rounds = Number(process.argv.find((a) => /^\d+$/.test(a)) || 1);
  let failed = 0;
  for (let r = 1; r <= rounds; r++) {
    console.log(`\nround ${r}`);
    for (const c of CASES) {
      const { answer, ms, provider, tools } = await ask(c);
      const written = answer.split("[[SAY")[0].trim();
      const say = answer.match(/\[\[SAY:\s*([\s\S]*?)\]\]/)?.[1] ?? "";
      const problems: string[] = [];
      if (!written) problems.push("empty written answer");
      if (!c.expect.test(answer)) problems.push(`missing ${c.expect}`);
      if (!say) problems.push("no spoken version");
      if (/[*|#`]|\[Source/i.test(say)) problems.push("marks in spoken version");
      if (/lost my train of thought/i.test(answer)) problems.push("fell back to the no-answer line");
      if (problems.length) failed++;
      console.log(`  ${problems.length ? "FAIL" : "ok  "} ${c.name} (${ms} ms, ${provider}, tools: ${tools.join(",") || "none"})${problems.length ? " - " + problems.join("; ") : ""}`);
      if (problems.length) console.log(`       ${JSON.stringify(answer.slice(0, 300))}`);
      // the free tiers allow a few requests a minute per model: keep a polite pace
      await new Promise((r) => setTimeout(r, Number(process.env.ATLAS_CHECK_GAP_MS || 14000)));
    }
  }
  console.log(`\n${failed ? `${failed} failed` : "all passed"}`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
