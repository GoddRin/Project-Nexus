import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateAtlasAIAnswer } from "@/lib/atlas-ai/service";

export async function POST(request: NextRequest) {
  try {
    // 1. Authentication check
    const { userId } = await auth();

    // Determine client identifier for rate limiting & logging
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const clientId = userId || `anon_${ip}`;

    // 2. Parse and validate request body
    const body = await request.json();
    const { query, history = [], context, stream = true } = body;

    if (!query || typeof query !== "string" || !query.trim()) {
      return NextResponse.json(
        { error: "Missing or invalid 'query' parameter." },
        { status: 400 }
      );
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
            const response = await generateAtlasAIAnswer({
              query: query.trim(),
              history,
              context,
              userId: clientId,
              onToolEvent: (event) => {
                sendEvent({
                  type: event.type,
                  tool: event.tool,
                  label: event.label,
                  summary: event.summary,
                  elapsedMs: event.elapsedMs,
                });
              },
            });

            sendEvent({
              type: "final_answer",
              answer: response.answer,
              actions: response.actions,
              sources: response.sources,
              metadata: response.metadata,
            });

            controller.close();
          } catch (err: unknown) {
            console.error("[Atlas AI Stream Error]:", err);
            const msg = err instanceof Error ? err.message : "Internal AI processing error";
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

    // ─── STANDARD JSON MODE ───
    const response = await generateAtlasAIAnswer({
      query: query.trim(),
      history,
      context,
      userId: clientId,
    });

    return NextResponse.json(response);
  } catch (err: unknown) {
    console.error("[Atlas AI API Route Error]:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred while processing your Atlas AI request." },
      { status: 500 }
    );
  }
}
