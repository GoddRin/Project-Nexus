import Groq from "groq-sdk";
import { SearchResultChunk } from "./search";
import { prisma } from "../db/prisma";

export interface Citation {
  sourceId: string;
  sourceName: string;
  sourceType: "DOCUMENT" | "KNOWLEDGE_ARTICLE" | "EQUIPMENT_SPEC" | string;
  excerpt: string;
  slug?: string;
}

// DB Tool Execution Functions
async function listDocumentFolders(projectId: string) {
  const folders = await prisma.documentFolder.findMany({
    where: { projectId },
    select: { id: true, name: true, parentId: true }
  });
  return { folders };
}

async function listDocuments(projectId: string, folderName?: string) {
  const whereClause: Record<string, unknown> = { projectId };
  if (folderName) {
    const folder = await prisma.documentFolder.findFirst({
      where: { projectId, name: { equals: folderName, mode: "insensitive" } }
    });
    if (folder) {
      whereClause.folderId = folder.id;
    } else {
      return { documents: [], message: `Folder "${folderName}" not found.` };
    }
  }
  const documents = await prisma.document.findMany({
    where: whereClause,
    select: {
      id: true,
      name: true,
      folder: { select: { name: true } },
      createdAt: true
    }
  });
  return {
    documents: documents.map(d => ({
      id: d.id,
      name: d.name,
      folder: d.folder?.name || "Root",
      createdAt: d.createdAt
    }))
  };
}

async function searchDocuments(projectId: string, query: string) {
  const documents = await prisma.document.findMany({
    where: {
      projectId,
      name: { contains: query, mode: "insensitive" }
    },
    select: { id: true, name: true, folder: { select: { name: true } } }
  });
  return {
    documents: documents.map(d => ({
      id: d.id,
      name: d.name,
      folder: d.folder?.name || "Root"
    }))
  };
}

async function getDocumentContent(projectId: string, documentName: string) {
  const doc = await prisma.document.findFirst({
    where: {
      projectId,
      name: { equals: documentName, mode: "insensitive" }
    }
  });
  if (!doc) {
    const docContains = await prisma.document.findFirst({
      where: {
        projectId,
        name: { contains: documentName, mode: "insensitive" }
      }
    });
    if (!docContains) {
      return { error: `Document "${documentName}" not found.` };
    }
    return await fetchChunks(docContains);
  }
  return await fetchChunks(doc);

  async function fetchChunks(d: { id: string; name: string }) {
    const chunks = await prisma.documentChunk.findMany({
      where: {
        projectId,
        sourceId: d.id,
        sourceType: "DOCUMENT"
      },
      orderBy: { chunkIndex: "asc" },
      select: { content: true }
    });
    const fullContent = chunks.map(c => c.content).join("\n\n");
    return {
      documentName: d.name,
      content: fullContent.substring(0, 40000)
    };
  }
}

async function listEquipment(projectId: string, category?: string) {
  const whereClause: Record<string, unknown> = { projectId };
  if (category) {
    whereClause.category = category;
  }
  const equipment = await prisma.plantEquipment.findMany({
    where: whereClause,
    select: {
      id: true,
      equipmentTag: true,
      name: true,
      category: true,
      status: true,
      location: true
    }
  });
  return { equipment };
}

async function listKnowledgeArticles(projectId: string) {
  const articles = await prisma.knowledgeArticle.findMany({
    where: { projectId, published: true },
    select: { id: true, title: true, category: true, slug: true }
  });
  return { articles };
}

async function getProjectSummary(projectId: string) {
  const [documentCount, equipmentCount, knowledgeArticleCount, ticketCount] = await Promise.all([
    prisma.document.count({ where: { projectId } }),
    prisma.plantEquipment.count({ where: { projectId } }),
    prisma.knowledgeArticle.count({ where: { projectId, published: true } }),
    prisma.ticket.count({ where: { projectId } })
  ]);
  
  const folders = await prisma.documentFolder.findMany({
    where: { projectId },
    select: { name: true }
  });

  return {
    summary: {
      documentCount,
      equipmentCount,
      knowledgeArticleCount,
      ticketCount,
      existingFolders: folders.map(f => f.name)
    }
  };
}

async function executeFunction(name: string, args: Record<string, unknown>, projectId: string): Promise<unknown> {
  console.log(`[RAG Agent Tool] Executing: ${name} with args:`, JSON.stringify(args));
  switch (name) {
    case "listDocumentFolders":
      return await listDocumentFolders(projectId);
    case "listDocuments":
      return await listDocuments(projectId, args.folderName as string | undefined);
    case "searchDocuments":
      return await searchDocuments(projectId, args.query as string);
    case "getDocumentContent":
      return await getDocumentContent(projectId, args.documentName as string);
    case "listEquipment":
      return await listEquipment(projectId, args.category as string | undefined);
    case "listKnowledgeArticles":
      return await listKnowledgeArticles(projectId);
    case "getProjectSummary":
      return await getProjectSummary(projectId);
    default:
      throw new Error(`Function "${name}" is not implemented.`);
  }
}

/**
 * Generates an answer to the query using Groq's llama-3.3-70b-versatile model,
 * grounded strictly on the retrieved context chunks and using database tools if required.
 */
export async function generateAnswer(
  query: string,
  chunks: SearchResultChunk[],
  conversationHistory: { role: string; content: string }[],
  projectId: string
): Promise<{ answer: string; citations: Citation[] }> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return {
      answer: "API configuration error: GROQ_API_KEY is not defined. Please set it in your environment.",
      citations: []
    };
  }

  const groq = new Groq({ apiKey });

  const systemInstruction = `You are the Project Nexus RAG AI Assistant for the Tumauini Hydroelectric Power Plant project.
The current active projectId is "${projectId}".
Cite the source in brackets using the source index (e.g. [Source 1], [Source 2]) when referencing facts from the documents.
For general questions, programming, math, history, greetings, or general knowledge (e.g. "What is the capital of France?", "How does a turbine work in general?", "who are you"), answer them directly, intelligently, and comprehensively.`;

  const tools = [
    {
      type: "function" as const,
      function: {
        name: "listDocumentFolders",
        description: "List all folders in the Document Center of the project.",
        parameters: {
          type: "object",
          properties: {
            projectId: { type: "string", description: "The project ID" }
          },
          required: ["projectId"]
        }
      }
    },
    {
      type: "function" as const,
      function: {
        name: "listDocuments",
        description: "List documents in the project, optionally filtered by folder name.",
        parameters: {
          type: "object",
          properties: {
            projectId: { type: "string", description: "The project ID" },
            folderName: { type: "string", description: "Optional name of the folder to filter by" }
          },
          required: ["projectId"]
        }
      }
    },
    {
      type: "function" as const,
      function: {
        name: "searchDocuments",
        description: "Search for documents in the project by name.",
        parameters: {
          type: "object",
          properties: {
            projectId: { type: "string", description: "The project ID" },
            query: { type: "string", description: "Search query for the document name" }
          },
          required: ["projectId", "query"]
        }
      }
    },
    {
      type: "function" as const,
      function: {
        name: "getDocumentContent",
        description: "Retrieve the text content of a specific document by its name.",
        parameters: {
          type: "object",
          properties: {
            projectId: { type: "string", description: "The project ID" },
            documentName: { type: "string", description: "Exact or close name of the document" }
          },
          required: ["projectId", "documentName"]
        }
      }
    },
    {
      type: "function" as const,
      function: {
        name: "listEquipment",
        description: "List registered equipment/assets in the plant, optionally filtered by category.",
        parameters: {
          type: "object",
          properties: {
            projectId: { type: "string", description: "The project ID" },
            category: { type: "string", description: "Optional equipment category (e.g. TURBINE, GENERATOR, TRANSFORMER)" }
          },
          required: ["projectId"]
        }
      }
    },
    {
      type: "function" as const,
      function: {
        name: "listKnowledgeArticles",
        description: "List published articles in the Knowledge Base.",
        parameters: {
          type: "object",
          properties: {
            projectId: { type: "string", description: "The project ID" }
          },
          required: ["projectId"]
        }
      }
    },
    {
      type: "function" as const,
      function: {
        name: "getProjectSummary",
        description: "Get a comprehensive summary of the project data: count of documents, equipment, folders, etc.",
        parameters: {
          type: "object",
          properties: {
            projectId: { type: "string", description: "The project ID" }
          },
          required: ["projectId"]
        }
      }
    }
  ];

  const messages: Groq.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemInstruction }
  ];

  if (conversationHistory && conversationHistory.length > 0) {
    conversationHistory.forEach((msg) => {
      const role = msg.role.toLowerCase() === "user" ? "user" : "assistant";
      messages.push({
        role,
        content: msg.content
      });
    });
  }

  let contextText = "Provided Project Context Sources:\n\n";
  if (chunks.length > 0) {
    chunks.forEach((chunk, index) => {
      contextText += `[Source ${index + 1}]: Name: "${chunk.sourceName}" (Type: ${chunk.sourceType})\n`;
      contextText += `Content:\n${chunk.content}\n\n`;
    });
  } else {
    contextText += "(No relevant document chunks found for the initial search. Use tools if necessary to explore files or project specs.)\n\n";
  }

  messages.push({
    role: "user",
    content: `${contextText}User Question: ${query}\n\nAnswer:`
  });

  try {
    let response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages,
      tools,
      tool_choice: "auto",
    });

    let loopCount = 0;
    let message = response.choices[0].message;
    let toolCalls = message.tool_calls;

    while (toolCalls && toolCalls.length > 0 && loopCount < 5) {
      loopCount++;
      messages.push(message);

      for (const toolCall of toolCalls) {
        const { name, arguments: argsString } = toolCall.function;
        let args = {};
        try {
          args = JSON.parse(argsString);
        } catch (parseError) {
          console.error(`Error parsing JSON args for tool ${name}:`, parseError);
        }

        let fnResult;
        try {
          fnResult = await executeFunction(name, args, projectId);
        } catch (e) {
          console.error(`Error executing tool function ${name}:`, e);
          fnResult = { error: e instanceof Error ? e.message : String(e) };
        }

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(fnResult)
        });
      }

      response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages,
        tools,
      });

      message = response.choices[0].message;
      toolCalls = message.tool_calls;
    }

    const answerText = message.content || "I apologize, I could not formulate an answer.";

    const citationIndices = new Set<number>();
    const citationRegex = /\[Source\s+(\d+)\]/gi;
    let match;
    while ((match = citationRegex.exec(answerText)) !== null) {
      const indexVal = parseInt(match[1], 10) - 1;
      if (indexVal >= 0 && indexVal < chunks.length) {
        citationIndices.add(indexVal);
      }
    }

    if (citationIndices.size === 0 && chunks.length > 0) {
      citationIndices.add(0);
    }

    const citations: Citation[] = Array.from(citationIndices).map((indexVal) => {
      const chunk = chunks[indexVal];
      return {
        sourceId: chunk.sourceId,
        sourceName: chunk.sourceName,
        sourceType: chunk.sourceType,
        excerpt: chunk.content.length > 200 ? `${chunk.content.substring(0, 197)}...` : chunk.content,
      };
    });

    return {
      answer: answerText,
      citations,
    };

  } catch (error: unknown) {
    console.error("Error generating answer from Groq (Llama 3.3):", error);
    let errorMessage = "I encountered an error trying to process the search documents. Please try again.";
    const errStr = String(error instanceof Error ? error.message : error);
    if (
      errStr.includes("429") ||
      errStr.includes("rate_limit") ||
      errStr.includes("Rate limit") ||
      errStr.includes("Quota") ||
      errStr.includes("aborted") ||
      errStr.includes("timeout") ||
      errStr.includes("fetch failed")
    ) {
      errorMessage = "I'm having trouble connecting to the Groq API due to rate limits or temporary network issues. Please try again in a few seconds.";
    }
    return {
      answer: errorMessage,
      citations: []
    };
  }
}
