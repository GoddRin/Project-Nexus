import { NextRequest, NextResponse } from "next/server";
import { synthesizeAtlasSpeechCached } from "@/lib/atlas-ai/speechDiskCache";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawText = body.text || body.query || body.message;
    const voice = body.voice;
    const stylePrompt = body.stylePrompt || body.style;

    if (!rawText || typeof rawText !== "string" || !rawText.trim()) {
      return NextResponse.json(
        { error: "Missing or invalid 'text' parameter." },
        { status: 400 }
      );
    }

    const { buffer, mimeType, cached, voice: usedVoice } = await synthesizeAtlasSpeechCached({
      text: rawText,
      voice,
      stylePrompt,
    });

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "X-Voice-Id": usedVoice,
        "X-Audio-Cached": String(cached),
      },
    });
  } catch (err: unknown) {
    console.error("[Atlas TTS Route Error]:", err);
    const msg = err instanceof Error ? err.message : "Internal TTS generation error";
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}
