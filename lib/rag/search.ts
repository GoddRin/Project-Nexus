import { prisma } from "@/lib/db/prisma";
import { embedText } from "./embed";
import { ChunkSourceType } from "@prisma/client";

export interface SearchResultChunk {
  id: string;
  projectId: string;
  sourceType: ChunkSourceType;
  sourceId: string;
  sourceName: string;
  chunkIndex: number;
  content: string;
  createdAt: Date;
  similarity: number;
}

/**
 * Searches the indexed document chunks for the given query using pgvector cosine similarity.
 * Returns the top K results.
 */
export async function searchChunks(
  query: string,
  projectId: string,
  topK: number = 5
): Promise<SearchResultChunk[]> {
  try {
    const queryEmbedding = await embedText(query);
    const vectorString = `[${queryEmbedding.join(",")}]`;

    // Query pgvector using cosine distance (<=> operator)
    // similarity = 1 - cosine distance
    const results = await prisma.$queryRawUnsafe<SearchResultChunk[]>(
      `SELECT "id", "projectId", "sourceType", "sourceId", "sourceName", "chunkIndex", "content", "createdAt",
              1 - ("embedding" <=> $1::vector) as similarity
       FROM "DocumentChunk"
       WHERE "projectId" = $2
       ORDER BY "embedding" <=> $1::vector
       LIMIT $3`,
      vectorString,
      projectId,
      topK
    );

    return results || [];
  } catch (error) {
    console.error("Failed similarity search:", error);
    return [];
  }
}
