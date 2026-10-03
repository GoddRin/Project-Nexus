/**
 * Self-review: before an answer with figures goes out, every number in it is looked for in what
 * the tools actually returned. If some cannot be found there, the answer is sent back once to be
 * corrected against the data. This costs one extra model request, and only on answers that need it.
 */
import { executeAICascade } from "@/lib/ai/core/providerHarness";
import { isUsableAnswer } from "@/lib/ai/core/providerHarness";

const NUMBER_RE = /\d[\d,]*(?:\.\d+)?/g;

/** Numbers a reader would take as facts: not list markers, not tiny ordinals, not part of a code */
function factNumbers(text: string): string[] {
  const written = text.split("[[SAY")[0];
  const out = new Set<string>();
  for (const m of written.matchAll(NUMBER_RE)) {
    const raw = m[0].replace(/,/g, "").replace(/\.$/, "");
    const before = written.slice(Math.max(0, (m.index ?? 0) - 1), m.index ?? 0);
    if (/[A-Za-z-]/.test(before)) continue; // part of a code such as SCIC-HEPP-01
    if (Number(raw) <= 3 && !raw.includes(".")) continue; // "one", "two of them": too common to check
    out.add(raw);
  }
  return [...out];
}

/** Every number that appears anywhere in the given material, in plain form */
function numbersIn(material: string): Set<string> {
  const set = new Set<string>();
  for (const m of material.matchAll(NUMBER_RE)) {
    const raw = m[0].replace(/,/g, "");
    set.add(raw);
    if (raw.includes(".")) set.add(String(Number(raw))); // 11.30 vs 11.3
  }
  return set;
}

export function unsupportedNumbers(answer: string, toolOutputs: unknown[], extraMaterial: string[]): string[] {
  const material = [JSON.stringify(toolOutputs), ...extraMaterial].join("\n");
  const known = numbersIn(material);
  return factNumbers(answer).filter((n) => !known.has(n) && !known.has(String(Number(n))));
}

export async function reviewAnswer(options: {
  question: string;
  draft: string;
  toolOutputs: unknown[];
  unsupported: string[];
}): Promise<string | null> {
  const data = JSON.stringify(options.toolOutputs).slice(0, 9000);
  const systemInstruction = `You check answers written by the Sta. Clara Atlas assistant before they are shown.
You receive the user's question, the draft answer, and the data the assistant's tools returned.
Some numbers in the draft do not appear in that data. For each one: keep it only if it is simple arithmetic on numbers that ARE in the data (a sum, a difference, a count of listed items) and the arithmetic is right; otherwise correct it from the data or remove the claim.
Return the corrected answer in full, in the same voice and format, including its [[SAY: ...]] line (and [[SAY-TL: ...]] line if the draft had one) at the very end, corrected the same way. Change nothing else. Do not mention that you checked anything.`;
  const message = `QUESTION:\n${options.question}\n\nDRAFT ANSWER:\n${options.draft}\n\nNUMBERS NOT FOUND IN THE DATA: ${options.unsupported.join(", ")}\n\nTOOL DATA:\n${data}`;
  try {
    const result = await executeAICascade(
      { systemInstruction, history: [], message, tools: [], temperature: 0 },
      "ATLAS"
    );
    return isUsableAnswer(result.text) ? result.text : null;
  } catch {
    return null;
  }
}
