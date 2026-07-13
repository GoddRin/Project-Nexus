import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import { searchChunks, SearchResultChunk } from "@/lib/rag/search";
import { generateAnswer } from "@/lib/rag/generate";
import { Prisma } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const { query, conversationId, projectId } = await request.json();

    if (!query || !projectId) {
      return NextResponse.json({ error: "Missing query or projectId" }, { status: 400 });
    }

    // 1. Auth check: any signed-in project member can use the assistant
    const { dbUser, member } = await getOrCreateUser(projectId);
    if (!dbUser || !member) {
      return NextResponse.json({ error: "Unauthorized: Access is denied" }, { status: 401 });
    }

    // 2. Fetch or create the conversation
    let conversation;
    if (conversationId) {
      conversation = await prisma.assistantConversation.findUnique({
        where: { id: conversationId },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            take: 20, // Limit history context window to last 20 messages
          },
        },
      });
      if (!conversation || conversation.userId !== dbUser.id) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }
    } else {
      conversation = await prisma.assistantConversation.create({
        data: {
          projectId,
          userId: dbUser.id,
        },
        include: {
          messages: true,
        },
      });
    }

    const history = conversation.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // 3. Search database for relevant chunks
    let filteredChunks: SearchResultChunk[] = [];
    try {
      const chunks = await searchChunks(query, projectId, 5);
      // 4. Threshold filtering (similarity threshold: 0.7)
      filteredChunks = chunks.filter((c) => c.similarity >= 0.7);
    } catch (searchError) {
      console.warn("[Chat API Warning] searchChunks failed, proceeding without chunks:", searchError);
    }

    // 5. Generate answer using Gemini grounding (always call, even if no chunks found, to allow conversational fallback)
    const response = await generateAnswer(query, filteredChunks, history, projectId);
    const answer = response.answer;
    const citations = response.citations;

    // 6. Save User message to database
    await prisma.assistantMessage.create({
      data: {
        conversationId: conversation.id,
        role: "USER",
        content: query,
      },
    });

    // 7. Save Assistant message to database
    await prisma.assistantMessage.create({
      data: {
        conversationId: conversation.id,
        role: "ASSISTANT",
        content: answer,
        citations: citations as unknown as Prisma.InputJsonValue,
      },
    });

    // 8. Resolve links/slugs for citations
    const resolvedCitations = [];
    for (const citation of citations) {
      if (citation.sourceType === "KNOWLEDGE_ARTICLE") {
        const article = await prisma.knowledgeArticle.findUnique({
          where: { id: citation.sourceId },
          select: { slug: true },
        });
        resolvedCitations.push({
          ...citation,
          slug: article?.slug || citation.sourceId,
        });
      } else {
        resolvedCitations.push(citation);
      }
    }

    return NextResponse.json({
      answer,
      citations: resolvedCitations,
      conversationId: conversation.id,
    });
  } catch (error) {
    console.error("[Chat API Error]:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
