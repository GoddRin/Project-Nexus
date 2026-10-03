import { NextRequest, NextResponse } from "next/server";
import { isSpeechCached } from "@/lib/atlas-ai/speechDiskCache";

export const dynamic = "force-dynamic";

/**
 * Which of these lines are already generated in the neural voice?
 * The client uses it to pick ONE voice for a whole tour before it starts: the neural voice only
 * when every stop is ready, otherwise the in-browser voice throughout.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const texts: unknown = body?.texts;
    if (!Array.isArray(texts) || texts.length > 60) {
      return NextResponse.json({ error: "Expected 'texts' (up to 60 strings)." }, { status: 400 });
    }
    const cached = texts.map((t) => typeof t === "string" && isSpeechCached(t, body?.voice));
    return NextResponse.json({ cached });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
