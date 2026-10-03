import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

/**
 * Thumbs up / down on the Atlas assistant's answers.
 *
 * Each rating is appended to .cache/atlas-feedback.jsonl with the question and the answer, so a
 * thumbs-down can be turned into a test case (`npx tsx scripts/atlas-conversation-check.ts
 * --feedback` replays them). Best effort: on a read-only host nothing is stored.
 */
const FILE = path.join(process.cwd(), ".cache", "atlas-feedback.jsonl");
const MAX_TEXT = 4000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rating = body?.rating === "up" || body?.rating === "down" ? body.rating : null;
    const question = typeof body?.question === "string" ? body.question.slice(0, MAX_TEXT) : "";
    const answer = typeof body?.answer === "string" ? body.answer.slice(0, MAX_TEXT) : "";
    if (!rating || !answer) {
      return NextResponse.json({ error: "Expected 'rating' (up or down) and 'answer'." }, { status: 400 });
    }
    const entry = {
      at: new Date().toISOString(),
      rating,
      question,
      answer,
      note: typeof body?.note === "string" ? body.note.slice(0, 1000) : undefined,
      messageId: typeof body?.messageId === "string" ? body.messageId.slice(0, 80) : undefined,
    };
    try {
      fs.mkdirSync(path.dirname(FILE), { recursive: true });
      fs.appendFileSync(FILE, JSON.stringify(entry) + "\n");
    } catch {
      // read-only filesystem: accepted but not kept
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}

export async function GET() {
  try {
    const lines = fs.existsSync(FILE) ? fs.readFileSync(FILE, "utf8").trim().split("\n").filter(Boolean) : [];
    const entries = lines.slice(-200).map((l) => JSON.parse(l));
    return NextResponse.json({
      total: lines.length,
      up: entries.filter((e) => e.rating === "up").length,
      down: entries.filter((e) => e.rating === "down").length,
      entries,
    });
  } catch {
    return NextResponse.json({ total: 0, up: 0, down: 0, entries: [] });
  }
}
