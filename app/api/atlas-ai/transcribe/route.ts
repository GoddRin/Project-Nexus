import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Speech to text for the voice input when the browser cannot do it itself (Brave and Firefox have
 * no working speech recognition: Brave reports "network"). The browser records a short clip and
 * sends it here; Groq's hosted Whisper (free tier) turns it into text in under a second.
 */
const MAX_BYTES = 8 * 1024 * 1024;
// Names Whisper should expect (it spells them right instead of guessing)
const PROMPT =
  "Sta. Clara International, SCIC, Project Atlas. Tour me on the Kapangan project. Luzon, Visayas, Mindanao, Benguet, Isabela, Bakun, Kalayaan, hydroelectric, megawatts.";

export async function POST(request: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Transcription is not configured." }, { status: 503 });

  try {
    const form = await request.formData();
    const audio = form.get("audio");
    if (!(audio instanceof Blob) || audio.size === 0) {
      return NextResponse.json({ error: "Missing audio." }, { status: 400 });
    }
    if (audio.size > MAX_BYTES) {
      return NextResponse.json({ error: "Recording too long." }, { status: 413 });
    }

    const upstream = new FormData();
    const type = audio.type || "audio/webm";
    const ext = type.includes("mp4") ? "mp4" : type.includes("ogg") ? "ogg" : type.includes("wav") ? "wav" : "webm";
    upstream.append("file", audio, `speech.${ext}`);
    upstream.append("model", "whisper-large-v3-turbo");
    upstream.append("language", typeof form.get("lang") === "string" && String(form.get("lang")).startsWith("tl") ? "tl" : "en");
    upstream.append("prompt", PROMPT);
    upstream.append("response_format", "json");
    upstream.append("temperature", "0");

    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: upstream,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.warn("[Atlas Transcribe] Groq HTTP", res.status, detail.slice(0, 200));
      return NextResponse.json({ error: res.status === 429 ? "Voice input is busy, try again in a moment." : "Transcription failed." }, { status: res.status === 429 ? 429 : 502 });
    }
    const json = (await res.json()) as { text?: string };
    return NextResponse.json({ text: (json.text || "").trim() });
  } catch (err: unknown) {
    console.error("[Atlas Transcribe Route Error]:", err);
    return NextResponse.json({ error: "Transcription failed." }, { status: 500 });
  }
}
