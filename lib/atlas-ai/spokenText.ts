/**
 * The text that is actually voiced for a displayed line (abbreviations read out in full), and the
 * map from each spoken character back to the displayed word. Plain module: used by the app and by
 * scripts/warm-atlas-voice.ts, which must ask the speech model for exactly the same text.
 */
/** Keep in step with the server limit in lib/atlas-ai/speechService.ts (cleanTextForSpeech). */
export const MAX_SPOKEN_CHARS = 880;

/** Trim to a whole sentence within the limit so the voiced text is known exactly. */
export function limitSpokenText(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = Math.max(text.lastIndexOf(". ", max), text.lastIndexOf("! ", max), text.lastIndexOf("? ", max));
  return cut > max * 0.4 ? text.slice(0, cut + 1) : text.slice(0, max);
}

export interface AlignedSpokenResult {
  displayWords: string[];
  spokenText: string;
  spokenTokens: {
    spokenWord: string;
    start: number;
    end: number;
    length: number;
    displayIndex: number;
  }[];
}

/**
 * Phonetically aligns speech synthesis with display subtitle narration:
 * - Pronounces "MW" as "Megawatts"
 * - Pronounces "Sta." / "Sta" as "Santa"
 * - Pronounces "SCIC" as "Santa Clara" (Sta. Clara)
 * - Pronounces "SCIC's" as "Santa Clara's"
 * - Pronounces "km" as "kilometers"
 * - Pronounces "MLD" as "million liters per day"
 * - Pronounces "HEPP" as "Hydroelectric Project"
 * - Pronounces "WTP" as "Water Treatment Plant"
 *
 * Maps every spoken audio character index to the exact 1-based display word index
 * so that subtitle highlights and physical sound waves remain in 100% lockstep.
 */
export function buildSpokenAlignment(displayText: string): AlignedSpokenResult {
  if (!displayText) {
    return { displayWords: [], spokenText: "", spokenTokens: [] };
  }

  const displayWords = displayText.trim().split(/\s+/).filter(Boolean);
  const spokenTokens: AlignedSpokenResult["spokenTokens"] = [];
  let spokenText = "";

  for (let i = 0; i < displayWords.length; i++) {
    const rawWord = displayWords[i];
    const displayIndex = i + 1; // 1-based index matching visibleWordCount

    // Separate leading/trailing punctuation (e.g. "(11.3", "MW)", "Sta.", "SCIC's")
    const match = rawWord.match(/^([(\[{"']*)(.*?)([)\]}",;:!?]*)$/);
    const prefix = match ? match[1] : "";
    const cleanWord = match ? match[2] : rawWord;
    const suffix = match ? match[3] : "";

    let spokenParts: string[] = [];

    if (cleanWord === "MW") {
      spokenParts = [prefix + "Megawatts" + suffix];
    } else if (cleanWord === "Sta." || cleanWord === "Sta") {
      spokenParts = [prefix + "Santa" + suffix.replace(/^\./, "")];
    } else if (cleanWord === "SCIC") {
      spokenParts = [prefix + "Santa", "Clara" + suffix];
    } else if (cleanWord === "SCIC's") {
      spokenParts = [prefix + "Santa", "Clara's" + suffix];
    } else if (cleanWord === "HEPP") {
      spokenParts = [prefix + "Hydroelectric", "Project" + suffix];
    } else if (cleanWord === "WTP") {
      spokenParts = [prefix + "Water", "Treatment", "Plant" + suffix];
    } else if (cleanWord === "km") {
      spokenParts = [prefix + "kilometers" + suffix];
    } else if (cleanWord === "MLD") {
      spokenParts = [prefix + "million", "liters", "per", "day" + suffix];
    } else {
      spokenParts = [rawWord];
    }

    for (const part of spokenParts) {
      if (spokenText.length > 0) spokenText += " ";
      const start = spokenText.length;
      spokenText += part;
      const end = spokenText.length;
      spokenTokens.push({
        spokenWord: part,
        start,
        end,
        length: end - start,
        displayIndex,
      });
    }
  }

  return { displayWords, spokenText, spokenTokens };
}
