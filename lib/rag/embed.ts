import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";

const apiKey = process.env.GOOGLE_AI_API_KEY;
if (!apiKey) {
  console.warn("WARNING: GOOGLE_AI_API_KEY is not defined in environment variables.");
}

const genAI = new GoogleGenerativeAI(apiKey || "");

/**
 * Generates vector embeddings for a given text using Google Gemini text-embedding-004 model.
 * Handles rate limits with exponential backoff (up to 3 retries).
 */
export async function embedText(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: "gemini-embedding-2" });
  let retries = 3;
  let delay = 1000; // start with 1s delay

  while (retries > 0) {
    try {
      const result = await model.embedContent({
        content: { role: "user", parts: [{ text }] },
        taskType: TaskType.RETRIEVAL_DOCUMENT,
        // @ts-expect-error: outputDimensionality exists in newer SDKs/APIs but might not be fully typed here
        outputDimensionality: 768
      });
      if (result.embedding?.values) {
        return result.embedding.values;
      }
      throw new Error("Invalid response format from embedding model");
    } catch (error: unknown) {
      retries--;
      if (retries === 0) {
        console.error("Embedding failed after maximum retries:", error);
        throw error;
      }
      const errMsg = error instanceof Error ? error.message : String(error);
      console.warn(`Embedding failed, retrying in ${delay}ms... (Error: ${errMsg})`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2; // exponential backoff
    }
  }
  throw new Error("Failed to embed text");
}
