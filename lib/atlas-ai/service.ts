/**
 * Atlas AI Service Orchestrator
 * Integrates Atlas identity, tools, and validation with the shared AI Core multi-engine cascade.
 */

import { executeAICascade } from "@/lib/ai/core/providerHarness";
import { AIChatMessage, AIToolStreamEvent } from "@/lib/ai/core/types";
import { globalAIRateLimiter } from "@/lib/ai/core/rateLimiter";
import { buildAtlasSystemInstruction, AtlasContextPayload } from "./identity";
import {
  ATLAS_TOOL_DECLARATIONS,
  NEXUS_TOOL_DECLARATIONS,
  dispatchAtlasTool,
} from "./tools/registry";
import { AtlasAIAction, AtlasAIResponse, AtlasAISource } from "./tools/types";
import { validateAndGateAtlasResponse } from "./validation";
import { ProjectProfileService } from "@/lib/services/projectProfileService";
import { prisma } from "@/lib/db/prisma";

export interface GenerateAtlasAIAnswerOptions {
  query: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  context?: AtlasContextPayload;
  userId?: string;
  isAuthorized?: boolean;
  onToolEvent?: (event: AIToolStreamEvent) => void;
}

const MAX_INPUT_CHARACTERS = 4000;
const MAX_CONVERSATION_CONTEXT = 12;
const MAX_EXECUTION_TIMEOUT_MS = 25000;
const ASSISTANT_VERSION = "1.0.0-prod";
const PROMPT_VERSION = "19.0.0";
const TOOL_VERSION = "19.0.0";

export async function generateAtlasAIAnswer(
  options: GenerateAtlasAIAnswerOptions
): Promise<AtlasAIResponse> {
  const {
    query: rawQuery,
    history = [],
    context: initialContext,
    userId = "anonymous",
    isAuthorized = false,
    onToolEvent,
  } = options;

  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  // 1. Circuit Breaker / Temporary AI Disable (Phase 19 Requirement 16 & 17)
  const isAIEnabled = process.env.ATLAS_AI_ENABLED !== "false";
  if (!isAIEnabled) {
    return validateAndGateAtlasResponse({
      answer:
        "SCIC Atlas Assistant is temporarily unavailable. Project exploration, interactive map, directory filters, and the Project Intelligence drawer remain fully operational.",
      actions: [],
      sources: [],
      metadata: {
        provider: "system",
        model: "circuit_breaker",
        durationMs: 0,
        executedTools: [],
        assistantVersion: ASSISTANT_VERSION,
        promptVersion: PROMPT_VERSION,
        toolVersion: TOOL_VERSION,
        requestId,
        degradedMode: true,
      },
    });
  }

  // 2. Input Limits & Sanitization (Phase 19 Requirement 13 & 36)
  const query =
    rawQuery.length > MAX_INPUT_CHARACTERS
      ? rawQuery.slice(0, MAX_INPUT_CHARACTERS)
      : rawQuery;

  // 3. Rate Limiting Check
  const rateLimitResult = globalAIRateLimiter.check(userId, query);
  if (!rateLimitResult.allowed) {
    return validateAndGateAtlasResponse({
      answer:
        rateLimitResult.reason ||
        "Rate limit reached. Please wait a moment before sending another query.",
      actions: [],
      sources: [],
      metadata: {
        provider: "rate_limiter",
        model: "local",
        durationMs: 0,
        executedTools: [],
        assistantVersion: ASSISTANT_VERSION,
        promptVersion: PROMPT_VERSION,
        toolVersion: TOOL_VERSION,
        requestId,
      },
    });
  }

  // 4. Resolve Active Project & Nexus Integration Boundary (Phase 18)
  const context: AtlasContextPayload = initialContext ? { ...initialContext } : {};
  context.isAuthorized = isAuthorized;

  // Resolve candidate project identifier from context or query text
  let activeNexusProject: any = null;
  const candidateIdentifier =
    context.selectedProjectId ||
    (query.toLowerCase().includes("tumauini") ? "tumauini-hepp" : null);

  if (candidateIdentifier) {
    try {
      const resolved = await ProjectProfileService.resolveProject(candidateIdentifier);
      if (resolved && !resolved.deletedAt) {
        context.canonicalProjectId = resolved.id;
        const isTumauini =
          resolved.slug === "tumauini-hepp" ||
          resolved.id === "cmqvwzn750000r8w1zidk116i" ||
          resolved.projectCode === "SCIC-HEPP-01";

        if (isTumauini) {
          activeNexusProject = resolved;
          context.hasNexusOperations = true;
        } else {
          // Check Prisma live operational records
          const cnt = await prisma.project.findUnique({
            where: { id: resolved.id },
            select: {
              _count: {
                select: { tickets: true, equipments: true, dailyLogs: true, assets: true },
              },
            },
          });
          const hasCounts =
            (cnt?._count?.tickets || 0) > 0 ||
            (cnt?._count?.equipments || 0) > 0 ||
            (cnt?._count?.dailyLogs || 0) > 0;
          if (hasCounts) {
            activeNexusProject = resolved;
            context.hasNexusOperations = true;
          } else {
            context.hasNexusOperations = false;
          }
        }
      }
    } catch (err) {
      console.warn("[AtlasAIService] Error resolving active project for tool exposure:", err);
    }
  }

  // Phase 18 Principle: Only expose Nexus tools when user is authorized AND
  // project has Nexus integration. Otherwise Nexus tool is not exposed.
  const canExposeNexusTools = Boolean(isAuthorized && context.hasNexusOperations);
  const activeTools = canExposeNexusTools
    ? [...ATLAS_TOOL_DECLARATIONS, ...NEXUS_TOOL_DECLARATIONS]
    : ATLAS_TOOL_DECLARATIONS;

  // 5. Build dedicated Atlas system instruction with Phase 18 boundary
  const systemInstruction = buildAtlasSystemInstruction(context);

  // 6. Prepare tool execution containers
  const collectedActions: AtlasAIAction[] = [];
  const collectedSources: AtlasAISource[] = [];

  const executeTool = async (name: string, args: Record<string, unknown>): Promise<unknown> => {
    return await dispatchAtlasTool(name, args, {
      actions: collectedActions,
      sources: collectedSources,
      runtimeContext: context,
      isAuthorized,
    });
  };

  // Limit conversation history to prevent context overflows
  const formattedHistory: AIChatMessage[] = history
    .slice(-MAX_CONVERSATION_CONTEXT)
    .map((m) => ({
      role: m.role,
      content: m.content,
    }));

  // 7. Execute Multi-Engine Cascade via shared AI Core with execution timeout
  try {
    const cascadePromise = executeAICascade(
      {
        systemInstruction,
        history: formattedHistory,
        message: query,
        tools: activeTools,
        executeTool,
        onToolEvent,
        maxToolLoops: 5, // Maximum 5 tool loops per turn to prevent runaway loops
        temperature: 0.15, // Low temperature for deterministic precision
      },
      "ATLAS"
    );

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("Atlas AI execution exceeded maximum processing time limit.")),
        MAX_EXECUTION_TIMEOUT_MS
      )
    );

    const result = await Promise.race([cascadePromise, timeoutPromise]);

    // 8. Deliver final output through Central Validation Gate
    return validateAndGateAtlasResponse({
      answer: result.text,
      actions: collectedActions,
      sources: collectedSources,
      metadata: {
        provider: result.telemetry.provider,
        model: result.telemetry.model,
        durationMs: result.telemetry.durationMs,
        executedTools: result.executedTools,
        tokensPrompt: result.telemetry.tokensPrompt,
        tokensCompletion: result.telemetry.tokensCompletion,
        assistantVersion: ASSISTANT_VERSION,
        promptVersion: PROMPT_VERSION,
        toolVersion: TOOL_VERSION,
        requestId,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[AtlasAIService] Error processing request ${requestId}:`, errorMsg);

    // Controlled degraded fallback response
    return validateAndGateAtlasResponse({
      answer:
        "I couldn't complete that Atlas operation within the allowed processing limits. You can explore the project directly on the interactive map or through the project directory filters.",
      actions: collectedActions.length > 0 ? collectedActions : [],
      sources: collectedSources.length > 0 ? collectedSources : [],
      metadata: {
        provider: "fallback_error",
        model: "error_boundary",
        durationMs: 0,
        executedTools: [],
        assistantVersion: ASSISTANT_VERSION,
        promptVersion: PROMPT_VERSION,
        toolVersion: TOOL_VERSION,
        requestId,
      },
    });
  }
}
