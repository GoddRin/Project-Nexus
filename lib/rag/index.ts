import { prisma } from "@/lib/db/prisma";
import { supabaseAdmin } from "@/lib/supabase";
import { embedText } from "./embed";
import { chunkText } from "./chunk";
import { ChunkSourceType } from "@prisma/client";

/**
 * Deletes all document chunks for a given source ID.
 */
export async function deleteChunks(sourceId: string) {
  try {
    await prisma.documentChunk.deleteMany({
      where: { sourceId },
    });
  } catch (error) {
    console.error(`Failed to delete chunks for source ${sourceId}:`, error);
  }
}

/**
 * Indexes a document from the Document Center.
 * Fetches the document from Supabase storage, parses its text (PDF/TXT),
 * chunks it, generates embeddings, and saves them.
 */
export async function indexDocument(documentId: string, projectId: string) {
  console.log(`[RAG Indexer] Starting indexing for Document: ${documentId}`);
  try {
    // 1. Fetch document and current version from Prisma
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        versions: {
          orderBy: { versionNum: "desc" },
          take: 1,
        },
      },
    });

    if (!doc || doc.versions.length === 0) {
      console.warn(`[RAG Indexer] Document ${documentId} or its version not found. Skipping.`);
      return;
    }

    const latestVersion = doc.versions[0];
    const storagePath = latestVersion.storagePath;

    // 2. Download file from Supabase storage
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from("documents")
      .download(storagePath);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download file from Supabase storage: ${downloadError?.message || "No data returned"}`);
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    let extractedText = "";

    // 3. Extract text depending on mime type
    if (latestVersion.mimeType === "application/pdf") {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse");
      const pdfData = await pdfParse(buffer);
      extractedText = pdfData.text;
    } else {
      extractedText = buffer.toString("utf-8");
    }

    if (!extractedText.trim()) {
      console.warn(`[RAG Indexer] Extracted text for Document ${documentId} is empty. Skipping.`);
      return;
    }

    // 4. Chunk the text
    const chunks = chunkText(extractedText);
    console.log(`[RAG Indexer] Split Document ${documentId} into ${chunks.length} chunks.`);

    // 5. Delete existing chunks
    await deleteChunks(documentId);

    // 6. Generate embeddings and save chunks
    for (let index = 0; index < chunks.length; index++) {
      const content = chunks[index];
      const embedding = await embedText(content);
      const vectorString = `[${embedding.join(",")}]`;
      const chunkId = crypto.randomUUID();

      await prisma.$executeRaw`
        INSERT INTO "DocumentChunk" ("id", "projectId", "sourceType", "sourceId", "sourceName", "chunkIndex", "content", "embedding", "createdAt")
        VALUES (${chunkId}, ${projectId}, ${ChunkSourceType.DOCUMENT}::"ChunkSourceType", ${documentId}, ${doc.name}, ${index}, ${content}, ${vectorString}::vector, NOW())
      `;
    }

    console.log(`[RAG Indexer] Document ${documentId} indexed successfully.`);
  } catch (error) {
    console.error(`[RAG Indexer] Error indexing Document ${documentId}:`, error);
  }
}

/**
 * Indexes a Knowledge Base article.
 */
export async function indexKnowledgeArticle(articleId: string, projectId: string) {
  console.log(`[RAG Indexer] Starting indexing for Knowledge Article: ${articleId}`);
  try {
    const article = await prisma.knowledgeArticle.findUnique({
      where: { id: articleId },
    });

    if (!article || !article.published) {
      console.warn(`[RAG Indexer] Article ${articleId} not found or unpublished. Skipping.`);
      // If article was unpublished, delete any existing chunks
      await deleteChunks(articleId);
      return;
    }

    const textToEmbed = `Category: ${article.category}\nTitle: ${article.title}\nContent: ${article.body}`;
    const chunks = chunkText(textToEmbed);

    await deleteChunks(articleId);

    for (let index = 0; index < chunks.length; index++) {
      const content = chunks[index];
      const embedding = await embedText(content);
      const vectorString = `[${embedding.join(",")}]`;
      const chunkId = crypto.randomUUID();

      await prisma.$executeRaw`
        INSERT INTO "DocumentChunk" ("id", "projectId", "sourceType", "sourceId", "sourceName", "chunkIndex", "content", "embedding", "createdAt")
        VALUES (${chunkId}, ${projectId}, ${ChunkSourceType.KNOWLEDGE_ARTICLE}::"ChunkSourceType", ${articleId}, ${article.title}, ${index}, ${content}, ${vectorString}::vector, NOW())
      `;
    }

    console.log(`[RAG Indexer] Knowledge Article ${articleId} indexed successfully.`);
  } catch (error) {
    console.error(`[RAG Indexer] Error indexing Knowledge Article ${articleId}:`, error);
  }
}

/**
 * Indexes a Plant Equipment record's specifications.
 */
export async function indexEquipmentSpec(equipmentId: string, projectId: string) {
  console.log(`[RAG Indexer] Starting indexing for Equipment Spec: ${equipmentId}`);
  try {
    const equipment = await prisma.plantEquipment.findUnique({
      where: { id: equipmentId },
      include: { siteLocation: true },
    });

    if (!equipment) {
      console.warn(`[RAG Indexer] Equipment ${equipmentId} not found. Skipping.`);
      return;
    }

    // Build specification representation
    let specText = `Equipment Tag: ${equipment.equipmentTag}\n`;
    specText += `Name: ${equipment.name}\n`;
    specText += `Category: ${equipment.category}\n`;
    specText += `Location: ${equipment.location || equipment.siteLocation?.name || "N/A"}\n`;
    specText += `Manufacturer: ${equipment.manufacturer || "N/A"}\n`;
    specText += `Model: ${equipment.model || "N/A"}\n`;
    specText += `Serial Number: ${equipment.serialNumber || "N/A"}\n`;
    specText += `Status: ${equipment.status}\n`;
    specText += `Condition: ${equipment.condition}\n`;

    if (equipment.specifications && typeof equipment.specifications === "object") {
      specText += "Specifications:\n";
      const specs = equipment.specifications as Record<string, unknown>;
      for (const [key, value] of Object.entries(specs)) {
        specText += `- ${key}: ${String(value)}\n`;
      }
    }

    // Embed as a single chunk since specs are short
    await deleteChunks(equipmentId);

    const embedding = await embedText(specText);
    const vectorString = `[${embedding.join(",")}]`;
    const chunkId = crypto.randomUUID();

    await prisma.$executeRaw`
      INSERT INTO "DocumentChunk" ("id", "projectId", "sourceType", "sourceId", "sourceName", "chunkIndex", "content", "embedding", "createdAt")
      VALUES (${chunkId}, ${projectId}, ${ChunkSourceType.EQUIPMENT_SPEC}::"ChunkSourceType", ${equipmentId}, ${equipment.equipmentTag}, 0, ${specText}, ${vectorString}::vector, NOW())
    `;

    console.log(`[RAG Indexer] Equipment Spec ${equipmentId} indexed successfully.`);
  } catch (error) {
    console.error(`[RAG Indexer] Error indexing Equipment Spec ${equipmentId}:`, error);
  }
}
