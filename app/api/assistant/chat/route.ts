import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import { searchChunks, SearchResultChunk } from "@/lib/rag/search";
import { generateAnswer, Citation, contextualizeQuery } from "@/lib/rag/generate";
import { Prisma } from "@prisma/client";

async function resolveCitations(citations: Citation[]) {
  const resolved = [];
  for (const citation of citations) {
    if (citation.sourceType === "KNOWLEDGE_ARTICLE") {
      const article = await prisma.knowledgeArticle.findUnique({
        where: { id: citation.sourceId },
        select: { slug: true },
      });
      resolved.push({
        ...citation,
        slug: article?.slug || citation.sourceId,
      });
    } else {
      resolved.push(citation);
    }
  }
  return resolved;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, conversationId, projectId, stream = true } = body;

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

    // 2.5 Multi-turn Contextualizer: Resolves short follow-ups (e.g. "do it", "yes", "tell me more")
    const effectiveQuery = await contextualizeQuery(query, history);

    // 3. Search database for relevant chunks with strict relevance filtering
    let filteredChunks: SearchResultChunk[] = [];
    try {
      const chunks = await searchChunks(effectiveQuery, projectId, 5);
      // Strict threshold: only chunks with high semantic similarity (>= 0.68) are injected
      filteredChunks = chunks.filter((c) => c.similarity >= 0.68);
    } catch (searchError) {
      console.warn("[Chat API Warning] searchChunks failed, proceeding without chunks:", searchError);
    }

    const wantsStream =
      stream === true || request.headers.get("accept")?.includes("text/event-stream");

    // ─── SSE STREAMING MODE ───
    if (wantsStream) {
      const encoder = new TextEncoder();

      const readable = new ReadableStream({
        async start(controller) {
          const sendEvent = (data: Record<string, unknown>) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          };

          try {
            const response = await generateAnswer(
              effectiveQuery,
              filteredChunks,
              history,
              projectId,
              dbUser.id,
              conversation.id,
              (toolEvent) => {
                sendEvent({
                  type: toolEvent.type,
                  tool: toolEvent.tool,
                  label: toolEvent.label,
                  summary: toolEvent.summary,
                  elapsedMs: toolEvent.elapsedMs,
                });
              }
            );

            if (response.clearChat) {
              sendEvent({
                type: "final_answer",
                answer: response.answer,
                citations: [],
                conversationId: null,
                clearChat: true,
                clientAction: null,
              });
              controller.close();
              return;
            }

            // Save messages to DB
            await prisma.assistantMessage.create({
              data: {
                conversationId: conversation.id,
                role: "USER",
                content: query,
              },
            });

            await prisma.assistantMessage.create({
              data: {
                conversationId: conversation.id,
                role: "ASSISTANT",
                content: response.answer,
                citations: response.citations as unknown as Prisma.InputJsonValue,
              },
            });

            const resolvedCitations = await resolveCitations(response.citations);

            sendEvent({
              type: "final_answer",
              answer: response.answer,
              citations: resolvedCitations,
              conversationId: conversation.id,
              clientAction: response.clientAction || null,
            });

            controller.close();
          } catch (err: unknown) {
            console.error("[Chat Stream Execution Error]:", err);
            const msg = err instanceof Error ? err.message : "Internal server error";
            sendEvent({ type: "error", error: msg });
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          "Connection": "keep-alive",
        },
      });
    }

    // ─── STANDARD JSON MODE (BACKWARDS COMPATIBILITY) ───
    const response = await generateAnswer(
      effectiveQuery,
      filteredChunks,
      history,
      projectId,
      dbUser.id,
      conversation.id
    );

    if (response.clearChat) {
      return NextResponse.json({
        answer: response.answer,
        citations: [],
        conversationId: null,
        clearChat: true,
        clientAction: null,
      });
    }

    await prisma.assistantMessage.create({
      data: {
        conversationId: conversation.id,
        role: "USER",
        content: query,
      },
    });

    await prisma.assistantMessage.create({
      data: {
        conversationId: conversation.id,
        role: "ASSISTANT",
        content: response.answer,
        citations: response.citations as unknown as Prisma.InputJsonValue,
      },
    });

    const resolvedCitations = await resolveCitations(response.citations);

    return NextResponse.json({
      answer: response.answer,
      citations: resolvedCitations,
      conversationId: conversation.id,
      clientAction: response.clientAction || null,
    });
  } catch (error) {
    console.error("[Chat API Error]:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
