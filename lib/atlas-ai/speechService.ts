import crypto from "crypto";

export interface VoiceProfile {
  id: string;
  name: string;
  trait: string;
  title: string;
  description: string;
  gender: "male" | "female";
  isDefault?: boolean;
}

export const ATLAS_VOICES: Record<string, VoiceProfile> = {
  Charon: {
    id: "Charon",
    name: "Charon",
    trait: "Informative",
    title: "Senior Field Engineer & GIS Director",
    description: "Deep, authoritative, grounded baritone with calm and disciplined technical delivery.",
    gender: "male",
    isDefault: true,
  },
  Sadaltager: {
    id: "Sadaltager",
    name: "Sadaltager",
    trait: "Knowledgeable",
    title: "Engineering Intelligence Specialist",
    description: "Analytical, intellectual, and steady cadence tailored for telemetry and multi-layer GIS analytics.",
    gender: "male",
  },
  Orus: {
    id: "Orus",
    name: "Orus",
    trait: "Firm",
    title: "Civil Operations Commander",
    description: "Direct, resolute, and decisive field operations manager tone.",
    gender: "male",
  },
};

export const DEFAULT_ATLAS_VOICE = "Charon";

// In-Memory LRU Audio Cache
interface CacheEntry {
  buffer: Buffer;
  mimeType: string;
  createdAt: number;
}

const LRU_MAX_ENTRIES = 200;
const memoryAudioCache = new Map<string, CacheEntry>();

function rememberInMemory(cacheKey: string, buffer: Buffer, mimeType: string): void {
  if (memoryAudioCache.size >= LRU_MAX_ENTRIES) {
    const oldestKey = memoryAudioCache.keys().next().value;
    if (oldestKey) memoryAudioCache.delete(oldestKey);
  }
  memoryAudioCache.set(cacheKey, { buffer, mimeType, createdAt: Date.now() });
}

function getCacheKey(voice: string, text: string): string {
  return crypto.createHash("sha256").update(`${voice}:::${text}`).digest("hex");
}

/**
 * Wraps raw linear PCM buffer in a standard 44-byte RIFF/WAVE header
 * for universal, cross-browser decoding in Web Audio API and HTML5 Audio.
 */
export function pcmToWav(
  pcmBuffer: Buffer,
  sampleRate = 24000,
  numChannels = 1,
  bitsPerSample = 16
): Buffer {
  const dataLength = pcmBuffer.length;
  const header = Buffer.alloc(44);

  // RIFF chunk descriptor
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataLength, 4);
  header.write("WAVE", 8);

  // "fmt " sub-chunk
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  header.writeUInt16LE(1, 20); // AudioFormat (1 = Linear PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28); // ByteRate
  header.writeUInt16LE(numChannels * (bitsPerSample / 8), 32); // BlockAlign
  header.writeUInt16LE(bitsPerSample, 34); // BitsPerSample

  // "data" sub-chunk
  header.write("data", 36);
  header.writeUInt32LE(dataLength, 40);

  return Buffer.from(Buffer.concat([header, pcmBuffer]));
}

/**
 * Strips markdown, code blocks, raw IDs, and formatting to produce clean, natural spoken prose.
 */
export function cleanTextForSpeech(rawText: string): string {
  if (!rawText) return "";

  let text = rawText;

  // 1. Remove code blocks
  text = text.replace(/```[\s\S]*?```/g, " ");
  text = text.replace(/`([^`]+)`/g, "$1");

  // 2. Remove markdown links, keep label: [Label](url) -> Label
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // 3. Remove raw URLs
  text = text.replace(/https?:\/\/\S+/g, " ");

  // 4. Strip headings and bullet markers
  text = text.replace(/^#{1,6}\s+/gm, "");
  text = text.replace(/^[\s*•-]+\s+/gm, " ");

  // 5. Strip bold and italic markup
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
  text = text.replace(/\*([^*]+)\*/g, "$1");
  text = text.replace(/__([^_]+)__/g, "$1");
  text = text.replace(/_([^_]+)_/g, "$1");

  // 6. Strip system and database IDs (e.g. cmqvwzn750000r8w1zidk116i or uuid)
  text = text.replace(/\bcm[a-z0-9]{20,30}\b/gi, "");
  text = text.replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "");

  // 7. Simplify engineering units for natural pronunciation
  text = text.replace(/(\d+)\s*MW\b/gi, "$1 megawatts");
  text = text.replace(/(\d+)\s*kW\b/gi, "$1 kilowatts");
  text = text.replace(/(\d+)\s*MLD\b/gi, "$1 million liters per day");
  text = text.replace(/(\d+)\s*km\b/gi, "$1 kilometers");
  text = text.replace(/(\d+)\s*m\b/gi, "$1 meters");
  // 8. Strip any meta directive / prompt injection preambles
  text = text.replace(/^(director'?s?\s*note|system\s*note|note|tone|stage\s*direction)\s*:[^:]*?:/gi, "");
  text = text.replace(/^(director'?s?\s*note|system\s*note|note|tone|stage\s*direction)\s*:/gi, "");
  text = text.replace(/\((director'?s?\s*note|note|tone)[^)]*\)/gi, "");

  // 9. Collapse whitespace
  text = text.replace(/\s+/g, " ").trim();

  // 9. Keep within comfortable speech length (max 900 characters; the client pre-trims to 880
  //    at a sentence end so lip-sync/subtitles know exactly what was voiced)
  if (text.length > 900) {
    const periodIdx = text.lastIndexOf(".", 900);
    if (periodIdx > 400) {
      text = text.substring(0, periodIdx + 1);
    } else {
      text = text.substring(0, 897) + "...";
    }
  }

  return text;
}

export interface SynthesizeSpeechOptions {
  text: string;
  voice?: string;
  stylePrompt?: string;
}

/**
 * Synthesizes high-fidelity 24kHz speech with Google Gemini TTS using multi-model fallback & LRU cache.
 */
export async function synthesizeAtlasSpeech(
  options: SynthesizeSpeechOptions
): Promise<{ buffer: Buffer; mimeType: string; cached: boolean; voice: string }> {
  const rawText = options.text;
  const requestedVoice = (options.voice || "").trim().toLowerCase();
  const matchedVoiceKey = Object.keys(ATLAS_VOICES).find(
    (k) => k.toLowerCase() === requestedVoice
  );
  const voice = matchedVoiceKey ? ATLAS_VOICES[matchedVoiceKey].id : DEFAULT_ATLAS_VOICE;
  const cleanedText = cleanTextForSpeech(rawText);

  if (!cleanedText) {
    throw new Error("No speakable text provided.");
  }

  // 1. Check LRU Cache
  const cacheKey = getCacheKey(voice, cleanedText);
  const cached = memoryAudioCache.get(cacheKey);
  if (cached) {
    // Refresh LRU position
    memoryAudioCache.delete(cacheKey);
    memoryAudioCache.set(cacheKey, cached);
    return {
      buffer: cached.buffer,
      mimeType: cached.mimeType,
      cached: true,
      voice,
    };
  }

  const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing Google AI API key for Gemini speech synthesis.");
  }

  // 2. Strip any inadvertent directive prefixes from the prompt text
  // NOTE: Gemini TTS models directly synthesize whatever text is in `parts[0].text`.
  // Directives like "Director's Note:" must NEVER be prepended to the spoken text.
  const prompt = cleanedText;

  // Multi-model hierarchy for high availability and zero quota blocking
  const models = [
    "gemini-2.5-flash-preview-tts",
    "gemini-3.8-flash-lite-tts",
    "gemini-3.8-flash-tts",
    "gemini-2.5-pro-preview-tts",
  ];

  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload = {
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voice,
              },
            },
          },
        },
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const errMsg = errJson?.error?.message || `HTTP ${res.status} from ${model}`;
        // If rate limit (429), try next fallback model
        if (res.status === 429) {
          console.warn(`[Atlas TTS] ${model} hit rate quota. Falling back to next model...`);
          lastError = new Error(errMsg);
          continue;
        }
        throw new Error(errMsg);
      }

      const json = await res.json();
      const inlineData = json.candidates?.[0]?.content?.parts?.[0]?.inlineData;

      if (!inlineData?.data) {
        throw new Error(`Model ${model} did not return audio data.`);
      }

      let buffer: Buffer = Buffer.from(inlineData.data, "base64");
      let mimeType = inlineData.mimeType || "audio/wav";

      // If Gemini returned raw PCM without RIFF header, wrap it in a standard 44-byte WAV header
      if (
        mimeType.includes("pcm") ||
        mimeType.includes("L16") ||
        buffer.length < 4 ||
        buffer.toString("utf8", 0, 4) !== "RIFF"
      ) {
        buffer = Buffer.from(pcmToWav(buffer, 24000, 1, 16));
        mimeType = "audio/wav";
      }

      // Store in memory cache (the API route adds a disk cache on top: see speechDiskCache.ts)
      rememberInMemory(cacheKey, buffer, mimeType);

      return {
        buffer,
        mimeType,
        cached: false,
        voice,
      };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[Atlas TTS] Attempt with ${model} failed:`, lastError.message);
    }
  }

  throw lastError || new Error("All speech synthesis models exhausted.");
}
