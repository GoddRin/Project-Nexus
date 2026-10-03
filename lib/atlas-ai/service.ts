/**
 * Atlas AI Service Orchestrator
 * Integrates Atlas identity, tools, and validation with the shared AI Core multi-engine cascade.
 */

import { executeAICascade } from "@/lib/ai/core/providerHarness";
import { fixProjectNames } from "./projectVocabulary";
import { AIChatMessage, AIToolStreamEvent } from "@/lib/ai/core/types";
import { globalAIRateLimiter } from "@/lib/ai/core/rateLimiter";
import { buildAtlasSystemInstruction, AtlasContextPayload, isCompanyQuestion } from "./identity";
import { tryQuickAnswer } from "./quickAnswers";
import { reviewAnswer, unsupportedNumbers } from "./selfReview";
import { COMPANY_PROFILE } from "./companyProfile";
import { ALL_SECTOR_TEXT, atlasGapNoteFor, sectorKnowledgeFor } from "./sectorKnowledge";
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
const MAX_EXECUTION_TIMEOUT_MS = 40000; // free fallback models (OpenRouter) can need 20-35 s with tools
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
  // (a misheard or mistyped project name is put right first: "Mala Dugo" -> "Maladugao")
  const query = fixProjectNames(
    rawQuery.length > MAX_INPUT_CHARACTERS
      ? rawQuery.slice(0, MAX_INPUT_CHARACTERS)
      : rawQuery
  );

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

  // 3b. Counting questions ("how many projects in Mindanao", "and how many of those are ongoing?")
  //     are answered exactly from the records, instantly, without the language model.
  try {
    const quick = await tryQuickAnswer(query, history, initialContext?.language);
    if (quick) {
      // "no solar projects" on the map must not read as "the company does no solar"
      const gap = atlasGapNoteFor(query, quick.answer);
      const quickAnswer = gap
        ? `${quick.answer.split("[[SAY")[0].trimEnd()}\n${gap.note}${gap.spoken ? `\n[[SAY: ${gap.spoken}]]` : ""}`
        : quick.answer;
      return validateAndGateAtlasResponse({
        answer: quickAnswer,
        actions: quick.filters
          ? [{ type: "FILTER_PROJECTS", filters: quick.filters }]
          : quick.highlight
          ? [{ type: "HIGHLIGHT_PROJECTS", projectIds: quick.highlight, fitBounds: true }]
          : [],
        sources: [{ name: "Project Atlas Database", sourceType: "DATABASE", provenance: "Verified" }],
        metadata: {
          provider: "atlas_records",
          model: "quick_count",
          durationMs: 0,
          executedTools: ["quick_count"],
          assistantVersion: ASSISTANT_VERSION,
          promptVersion: PROMPT_VERSION,
          toolVersion: TOOL_VERSION,
          requestId,
        },
      });
    }
  } catch (err) {
    console.warn("[AtlasAIService] quick answer skipped:", err);
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
  // the full company profile only when the question (or the one before it) is about the company
  const lastUserTurn = [...history].reverse().find((m) => m.role === "user")?.content ?? "";
  const systemInstruction = buildAtlasSystemInstruction({
    ...context,
    companyQuestion: isCompanyQuestion(query) || (query.split(/\s+/).length <= 6 && isCompanyQuestion(lastUserTurn)),
    // what the company has built of the kind asked about, and how such projects work (a short
    // follow-up, "and the risks?", keeps the sector of the question before it)
    sectorKnowledge: sectorKnowledgeFor(query, query.split(/\s+/).length <= 8 ? lastUserTurn : ""),
  });

  // 6. Prepare tool execution containers
  const collectedActions: AtlasAIAction[] = [];
  const collectedSources: AtlasAISource[] = [];

  // everything the tools returned, kept for the self-review of figures
  const toolOutputs: unknown[] = [];
  const executeTool = async (name: string, args: Record<string, unknown>): Promise<unknown> => {
    const output = await dispatchAtlasTool(name, args, {
      actions: collectedActions,
      sources: collectedSources,
      runtimeContext: context,
      isAuthorized,
    });
    toolOutputs.push({ tool: name, output });
    return output;
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
    let answerText = result.text;

    // 7b. Self-review: figures in an answer built from tool data must be found in that data. If
    //     some are not, the answer goes back once to be corrected (one extra request, only then).
    const startedAt = Date.now() - (result.telemetry.durationMs ?? 0);
    if (toolOutputs.length && Date.now() - startedAt < 15000) {
      const unsupported = unsupportedNumbers(answerText, toolOutputs, [
        query,
        history.map((m) => m.content).join("\n"),
        COMPANY_PROFILE,
        ALL_SECTOR_TEXT,
      ]);
      if (unsupported.length) {
        console.warn(`[AtlasAIService] ${requestId}: figures not found in tool data (${unsupported.join(", ")}); reviewing`);
        const reviewed = await Promise.race([
          reviewAnswer({ question: query, draft: answerText, toolOutputs, unsupported }),
          new Promise<null>((r) => setTimeout(() => r(null), 8000)),
        ]);
        if (reviewed) answerText = reviewed;
      }
    }

    // A company answer cites the company's own pages, which the user can open
    if (/company profile/i.test(answerText)) {
      collectedSources.unshift({
        name: "Sta. Clara company profile",
        sourceType: "NARRATIVE_DOC",
        provenance: "Verified",
        document: "https://staclara.com.ph/who-we-are/about-scic/",
      });
    }

    if (/company website/i.test(answerText)) {
      collectedSources.unshift({
        name: "Sta. Clara company website",
        sourceType: "NARRATIVE_DOC",
        provenance: "Verified",
        document: "https://staclara.com.ph/what-we-do/completed/renewable-energy-power-plants/",
      });
    }

    // 8. Deliver final output through Central Validation Gate
    return validateAndGateAtlasResponse({
      answer: answerText,
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
