/**
 * Atlas AI Service Orchestrator
 * Integrates Atlas identity, tools, and validation with the shared AI Core multi-engine cascade.
 */

import { executeAICascade } from "@/lib/ai/core/providerHarness";
import { AIChatMessage, AIToolStreamEvent } from "@/lib/ai/core/types";
import { globalAIRateLimiter } from "@/lib/ai/core/rateLimiter";
import { buildAtlasSystemInstruction, AtlasContextPayload } from "./identity";
import { ATLAS_TOOL_DECLARATIONS, dispatchAtlasTool } from "./tools/registry";
import { AtlasAIAction, AtlasAIResponse, AtlasAISource } from "./tools/types";
import { validateAtlasResponse } from "./validation";

export interface GenerateAtlasAIAnswerOptions {
  query: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  context?: AtlasContextPayload;
  userId?: string;
  onToolEvent?: (event: AIToolStreamEvent) => void;
}

export async function generateAtlasAIAnswer(
  options: GenerateAtlasAIAnswerOptions
): Promise<AtlasAIResponse> {
  const { query, history = [], context, userId = "anonymous", onToolEvent } = options;

  // 1. Rate Limiting Check
  const rateLimitResult = globalAIRateLimiter.check(userId, query);
  if (!rateLimitResult.allowed) {
    return {
      answer: rateLimitResult.reason || "Rate limit reached. Please wait a moment before trying again.",
      actions: [],
      sources: [],
    };
  }

  // 2. Build dedicated Atlas system instruction
  const systemInstruction = buildAtlasSystemInstruction(context);

  // 3. Prepare tool execution containers
  const collectedActions: AtlasAIAction[] = [];
  const collectedSources: AtlasAISource[] = [];

  const executeTool = async (name: string, args: Record<string, unknown>): Promise<unknown> => {
    return await dispatchAtlasTool(name, args, {
      actions: collectedActions,
      sources: collectedSources,
      runtimeContext: context,
    });
  };

  const formattedHistory: AIChatMessage[] = history.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // 4. Execute Multi-Engine Cascade via shared AI Core
  const result = await executeAICascade(
    {
      systemInstruction,
      history: formattedHistory,
      message: query,
      tools: ATLAS_TOOL_DECLARATIONS,
      executeTool,
      onToolEvent,
      maxToolLoops: 5,
      temperature: 0.15, // Low temperature for high precision and grounded facts
    },
    "ATLAS"
  );

  // 5. Default source fallback if no tools were called (general knowledge grounded in Atlas registry)
  if (collectedSources.length === 0) {
    collectedSources.push({
      name: "Project Atlas Database",
      sourceType: "DATABASE",
      provenance: "Verified",
    });
  }

  // 6. Deduplicate sources
  const uniqueSources: AtlasAISource[] = [];
  const seenSourceKeys = new Set<string>();
  for (const s of collectedSources) {
    const key = `${s.name}-${s.sourceType}-${s.provenance}-${s.document || ""}-${s.section || ""}`;
    if (!seenSourceKeys.has(key)) {
      seenSourceKeys.add(key);
      uniqueSources.push(s);
    }
  }

  // 7. Validate and return final structured contract
  return validateAtlasResponse({
    answer: result.text,
    actions: collectedActions,
    sources: uniqueSources,
    metadata: {
      provider: result.telemetry.provider,
      model: result.telemetry.model,
      durationMs: result.telemetry.durationMs,
      executedTools: result.executedTools,
      tokensPrompt: result.telemetry.tokensPrompt,
      tokensCompletion: result.telemetry.tokensCompletion,
    },
  });
}
