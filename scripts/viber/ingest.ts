/**
 * Local Viber -> redacted site-report pipeline. Run it on the machine that holds the export, so raw chat
 * text never leaves that machine; only the redacted digest file it writes is uploaded.
 *
 *   npx tsx scripts/viber/ingest.ts <export.csv|txt> [--out digests.json] [--ai] [--upload https://your-site --project <projectId>]
 *
 * Env: VIBER_ALIAS_SALT (required, secret, keep out of git); GOOGLE_AI_API_KEY (only with --ai, free tier);
 *      VIBER_INGEST_TOKEN (only with --upload; must match the server's value).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { parseViberExport } from "../../lib/viber/parse";
import { redactMessages } from "../../lib/viber/redact";
import { groupByDay } from "../../lib/viber/digest";
import { structureDay, type Generate } from "../../lib/viber/structure";

async function makeGenerate(): Promise<Generate | undefined> {
  if (!process.argv.includes("--ai")) return undefined;
  const key = process.env.GOOGLE_AI_API_KEY;
  if (!key) throw new Error("--ai needs GOOGLE_AI_API_KEY (free key from Google AI Studio)");
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const model = new GoogleGenerativeAI(key).getGenerativeModel({
    model: process.env.VIBER_STRUCTURE_MODEL || "gemini-2.5-flash-lite",
    generationConfig: { responseMimeType: "application/json", temperature: 0 },
  });
  return async (prompt) => (await model.generateContent(prompt)).response.text();
}

async function main() {
  const file = process.argv[2];
  if (!file || file.startsWith("--")) throw new Error("usage: ingest.ts <export> [--out file] [--ai]");
  const salt = process.env.VIBER_ALIAS_SALT;
  if (!salt) throw new Error("Set VIBER_ALIAS_SALT to a long random secret first");
  const outIdx = process.argv.indexOf("--out");
  const out = outIdx > 0 ? process.argv[outIdx + 1] : "viber-digests.json";

  const raw = parseViberExport(readFileSync(file, "utf8"));
  const { messages, stats } = redactMessages(raw, { salt });
  const generate = await makeGenerate();
  const digests = [];
  for (const bucket of groupByDay(messages)) digests.push(await structureDay(bucket, generate));
  writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), digests }, null, 2));
  console.log(`parsed ${raw.length} lines; kept ${stats.kept} work lines (${stats.droppedChatter} chatter, ${stats.droppedEmpty} empty/stickers dropped, ${stats.safetyFlagged} safety-flagged)`);
  console.log(`wrote ${digests.length} daily digests to ${out}`);

  const upIdx = process.argv.indexOf("--upload");
  if (upIdx > 0) {
    const base = process.argv[upIdx + 1];
    const pIdx = process.argv.indexOf("--project");
    const projectId = pIdx > 0 ? process.argv[pIdx + 1] : undefined;
    const token = process.env.VIBER_INGEST_TOKEN;
    if (!base || !projectId || !token) throw new Error("--upload needs a site URL, --project <id>, and VIBER_INGEST_TOKEN");
    for (let i = 0; i < digests.length; i += 30) {
      const res = await fetch(`${base.replace(/\/$/, "")}/api/site-reports/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ projectId, digests: digests.slice(i, i + 30) }),
      });
      if (!res.ok) throw new Error(`upload failed: ${res.status} ${await res.text()}`);
      console.log(`uploaded days ${i + 1}-${Math.min(i + 30, digests.length)}`);
    }
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
