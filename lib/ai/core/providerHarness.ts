/**
 * Shared AI Core Provider Harness
 * Implements a resilient multi-engine cascade:
 *   1. Cerebras Wafer-Scale Engine (gpt-oss-120b)
 *   2. Google Gemini Flash Cascade (gemini-2.5-flash -> gemini-2.0-flash -> gemini-1.5-flash)
 *   3. Groq LPU (openai/gpt-oss-120b)
 * 
 * Provides unified tool calling, safety controls, and execution telemetry.
 */

import { GoogleGenerativeAI, SchemaType, FunctionDeclaration } from "@google/generative-ai";
import Groq from "groq-sdk";
import {
  AIToolDeclaration,
  AICoreGenerateOptions,
  AICoreGenerateResult,
  AIProviderTelemetry,
  AIToolParameter,
} from "./types";
import { aiLogger } from "./logger";

// ─── Format Converters ──────────────────────────────────────────

function convertParameterToGemini(param: AIToolParameter): any {
  let schemaType = SchemaType.STRING;
  if (param.type === "number") schemaType = SchemaType.NUMBER;
  if (param.type === "boolean") schemaType = SchemaType.BOOLEAN;
  if (param.type === "object") schemaType = SchemaType.OBJECT;
  if (param.type === "array") schemaType = SchemaType.ARRAY;

  const res: any = {
    type: schemaType,
    description: param.description,
  };

  if (param.enum) {
    res.enum = param.enum;
  }

  if (param.type === "object" && param.properties) {
    res.properties = {};
    for (const [k, v] of Object.entries(param.properties)) {
      res.properties[k] = convertParameterToGemini(v);
    }
    if (param.required) {
      res.required = param.required;
    }
  }

  if (param.type === "array" && param.items) {
    res.items = convertParameterToGemini(param.items as AIToolParameter);
  }

  return res;
}

export function convertToolsToGemini(tools: AIToolDeclaration[]): FunctionDeclaration[] {
  return tools.map((tool) => {
    const properties: Record<string, any> = {};
    for (const [key, param] of Object.entries(tool.parameters.properties)) {
      properties[key] = convertParameterToGemini(param);
    }

    return {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: SchemaType.OBJECT,
        description: `${tool.name} parameters`,
        properties,
        required: tool.parameters.required || [],
      },
    };
  });
}

export function convertToolsToOpenAI(tools: AIToolDeclaration[]): any[] {
  return tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: "object",
        properties: tool.parameters.properties,
        required: tool.parameters.required || [],
      },
    },
  }));
}

function formatHumanToolLabel(
  toolName: string,
  args: Record<string, unknown> = {},
  isComplete: boolean = false
): string {
  const norm = toolName.toLowerCase();
  if (isComplete) {
    if (norm.includes("search") || norm.includes("find")) return "Projects identified";
    if (norm.includes("timeline")) return "Milestone timeline ready";
    if (norm.includes("distance") || norm.includes("bounds")) return "Spatial calculation completed";
    if (norm.includes("fly") || norm.includes("zoom") || norm.includes("navigate")) return "Map position focused";
    if (norm.includes("filter")) return "Portfolio filters applied";
    if (norm.includes("footprint")) return "Engineering boundary rendered";
    if (norm.includes("tour")) return "Portfolio tour engaged";
    if (norm.includes("nexus")) return "Operational records loaded";
    return `Completed ${toolName.replace(/_/g, " ")}`;
  }

  // Active / in-progress label
  if (norm === "search_projects" || norm === "search_atlas_knowledge") {
    if (args.region) return `Locating projects in ${args.region}...`;
    if (args.category) return `Finding ${args.category} projects...`;
    if (args.query) return `Finding projects matching "${args.query}"...`;
    return "Finding projects...";
  }
  if (norm === "get_region_summary" || norm === "zoom_to_region") {
    return args.region ? `Locating ${args.region}...` : "Locating Region...";
  }
  if (norm === "get_province_summary") {
    return args.province ? `Analyzing projects in ${args.province}...` : "Locating province...";
  }
  if (norm === "calculate_distance") {
    return "Calculating distance...";
  }
  if (norm === "get_geographic_bounds") {
    return "Calculating geographic bounds...";
  }
  if (norm === "get_nearby_projects") {
    return "Searching nearby projects...";
  }
  if (norm === "get_project_timeline") {
    return "Retrieving verified timeline...";
  }
  if (norm === "get_project" || norm === "get_project_details") {
    return args.projectId ? `Retrieving project details...` : "Retrieving project...";
  }
  if (norm === "get_project_statistics") {
    return "Calculating portfolio statistics...";
  }
  if (norm === "compare_projects") {
    return "Comparing project specifications...";
  }
  if (norm === "get_portfolio_brief") {
    return "Synthesizing executive portfolio brief...";
  }
  if (norm === "explain_current_view") {
    return "Analyzing active map view...";
  }
  if (norm === "fly_to_project") {
    return "Navigating map camera...";
  }
  if (norm === "apply_project_filters") {
    return "Filtering projects...";
  }
  if (norm === "clear_project_filters") {
    return "Resetting portfolio filters...";
  }
  if (norm === "toggle_gis_layer") {
    return "Updating GIS layers...";
  }
  if (norm === "inspect_engineering_footprint") {
    return "Loading engineering boundary...";
  }
  if (norm === "enter_discovery_scope") {
    return "Activating Discovery Mode...";
  }
  if (norm === "get_nexus_project_summary") {
    return "Querying Nexus operational records...";
  }

  // Fallback to formatted title
  const clean = toolName.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return `Consulting ${clean}...`;
}

// ─── Engine 1: Cerebras Wafer-Scale Engine ───────────────────────

async function runCerebras(
  options: AICoreGenerateOptions,
  assistantType: "ATLAS" | "NEXUS"
): Promise<AICoreGenerateResult> {
  const apiKey = process.env.CEREBRAS_API_KEY;
  if (!apiKey) throw new Error("CEREBRAS_API_KEY not configured");

  const startTime = Date.now();
  const modelToUse = "gpt-oss-120b";
  const executedTools: string[] = [];

  const openAiTools = options.tools && options.tools.length > 0 ? convertToolsToOpenAI(options.tools) : undefined;

  const messages: any[] = [
    { role: "system", content: options.systemInstruction },
    ...options.history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: options.message },
  ];

  const payload: any = {
    model: modelToUse,
    messages,
    temperature: options.temperature ?? 0.2,
    max_tokens: 3000,
  };
  if (openAiTools) payload.tools = openAiTools;

  let res = await fetch("https://api.cerebras.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Cerebras API HTTP ${res.status}: ${errText}`);
  }

  let data = await res.json();
  let message = data.choices?.[0]?.message;
  let toolCalls = message?.tool_calls;
  let loopCount = 0;
  const maxLoops = options.maxToolLoops ?? 5;

  while (toolCalls && toolCalls.length > 0 && loopCount < maxLoops) {
    loopCount++;
    messages.push(message);

    for (const toolCall of toolCalls) {
      const toolName = toolCall.function?.name;
      executedTools.push(toolName);
      let parsedArgs = {};
      try {
        parsedArgs = JSON.parse(toolCall.function?.arguments || "{}");
      } catch {
        parsedArgs = {};
      }

      options.onToolEvent?.({
        type: "step_start",
        tool: toolName,
        label: formatHumanToolLabel(toolName, parsedArgs, false),
      });

      const toolStart = Date.now();
      let toolResult: unknown;
      try {
        if (options.executeTool) {
          toolResult = await options.executeTool(toolName, parsedArgs);
        } else {
          toolResult = { error: `Tool execution not configured for ${toolName}` };
        }
      } catch (err: any) {
        toolResult = { error: err?.message || String(err) };
      }

      options.onToolEvent?.({
        type: "step_complete",
        tool: toolName,
        label: formatHumanToolLabel(toolName, parsedArgs, true),
        elapsedMs: Date.now() - toolStart,
      });

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(toolResult ?? {}),
      });
    }

    res = await fetch("https://api.cerebras.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelToUse,
        messages,
        temperature: options.temperature ?? 0.2,
        tools: openAiTools,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Cerebras Tool Loop HTTP ${res.status}: ${errText}`);
    }

    data = await res.json();
    message = data.choices?.[0]?.message;
    toolCalls = message?.tool_calls;
  }

  const durationMs = Date.now() - startTime;
  const telemetry: AIProviderTelemetry = {
    provider: "CEREBRAS",
    model: modelToUse,
    durationMs,
    executedTools,
    success: true,
    tokensPrompt: data.usage?.prompt_tokens,
    tokensCompletion: data.usage?.completion_tokens,
  };

  aiLogger.logExecution(assistantType, telemetry);

  return {
    text: message?.content || "",
    executedTools,
    telemetry,
  };
}

// ─── Engine 2: Google Gemini Flash Cascade ──────────────────────

async function runGemini(
  options: AICoreGenerateOptions,
  assistantType: "ATLAS" | "NEXUS"
): Promise<AICoreGenerateResult> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_AI_API_KEY not configured");

  const startTime = Date.now();
  const genAI = new GoogleGenerativeAI(apiKey);
  // Newest first. Each model has its own free-tier allowance (a few requests a minute), so a
  // model that is rate-limited simply hands over to the next one. (gemini-1.5-flash was retired
  // and only ever answered 404.)
  // (gemini-3.8-flash is left out: it rejects the "function" role this SDK uses for tool
  //  results, so it failed on every question that needed data. gemini-3.5-flash is accurate but
  //  slower, so it comes after the fast 2.5 model.)
  const geminiModels = ["gemini-2.5-flash", "gemini-3.5-flash"];
  const executedTools: string[] = [];
  const geminiTools = options.tools && options.tools.length > 0 ? convertToolsToGemini(options.tools) : undefined;

  const historyForGemini = options.history.slice(-10).map((m) => ({
    role: m.role.toLowerCase() === "user" ? "user" : "model",
    parts: [{ text: m.content }],
  }));

  let lastError: any = null;

  for (const modelName of geminiModels) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: options.systemInstruction,
        tools: geminiTools ? [{ functionDeclarations: geminiTools }] : undefined,
        generationConfig: {
          temperature: options.temperature ?? 0.2,
        },
      });

      const chat = model.startChat({
        history: historyForGemini,
      });

      let response = await chat.sendMessage(options.message);
      let functionCalls = response.response.functionCalls();
      let loopCount = 0;
      const maxLoops = options.maxToolLoops ?? 5;
      const replyText = () => {
        try {
          return response.response.text() || "";
        } catch {
          return ""; // blocked or no text part
        }
      };
      let nudged = false;

      // (the loop also runs once more after a nudge, below)
      for (;;) {
      while (functionCalls && functionCalls.length > 0 && loopCount < maxLoops) {
        loopCount++;
        const functionResponses = [];

        for (const call of functionCalls) {
          executedTools.push(call.name);
          const args = (call.args as Record<string, unknown>) || {};
          const toolStart = Date.now();

          options.onToolEvent?.({
            type: "step_start",
            tool: call.name,
            label: formatHumanToolLabel(call.name, args, false),
          });

          let result: unknown;
          try {
            if (options.executeTool) {
              result = await options.executeTool(call.name, args);
            } else {
              result = { error: `Tool ${call.name} not configured` };
            }
          } catch (err: any) {
            result = { error: err?.message || String(err) };
          }

          options.onToolEvent?.({
            type: "step_complete",
            tool: call.name,
            label: formatHumanToolLabel(call.name, args, true),
            elapsedMs: Date.now() - toolStart,
          });

          functionResponses.push({
            functionResponse: {
              name: call.name,
              response: { output: result },
            },
          });
        }

        response = await chat.sendMessage(functionResponses);
        functionCalls = response.response.functionCalls();
      }

      // An empty reply (no text, no tool call) happens now and then, typically a tool call the
      // model got wrong. It used to reach the user as "I processed your request." The chat SDK
      // also DROPS a turn that produced nothing, so the question itself is gone from the
      // conversation (the model then answered the question before it, or said it "missed" it):
      // ask it again, in full. If it is still empty, this model has failed and the cascade
      // moves on to the next one.
      if (isUsableAnswer(replyText()) || nudged) break;
      nudged = true;
      const finish = response.response.candidates?.[0]?.finishReason;
      console.warn(`[AI Core :: Gemini] ${modelName} gave an empty reply (finish: ${finish ?? "?"}); asking again`);
      response = await chat.sendMessage(
        `${options.message}\n\n(If this needs data such as counts, lists or figures, call one tool with valid arguments first, then answer in plain sentences for a person, never as raw data or JSON.)`
      );
      functionCalls = response.response.functionCalls();
      }
      if (!isUsableAnswer(replyText())) throw new Error(`${modelName} returned no usable answer`);

      const durationMs = Date.now() - startTime;
      const telemetry: AIProviderTelemetry = {
        provider: "GEMINI",
        model: modelName,
        durationMs,
        executedTools,
        success: true,
      };

      aiLogger.logExecution(assistantType, telemetry);

      return {
        text: replyText(),
        executedTools,
        telemetry,
      };
    } catch (err: any) {
      lastError = err;
      console.warn(`[AI Core :: Gemini Cascade] ${modelName} failed, cascading:`, err?.message || err);
    }
  }

  throw lastError || new Error("All Gemini cascade models failed");
}

// ─── Engine 2b: OpenAI-compatible fallbacks (OpenRouter, Mistral) ─────
// Same chat-completions shape with tool calls; each lists its models best first.

type OpenAICompatEngine = {
  provider: "OPENROUTER" | "MISTRAL";
  label: string;
  url: string;
  models: string[];
  apiKey: string | undefined;
  extraHeaders?: Record<string, string>;
};

// OpenRouter free models (":free"): 50 requests a day without credits, 20 a minute. Tool-capable
// models only, fastest good one first (Nemotron answers well but takes 30-70 s); OpenRouter itself also routes around a busy provider.
const OPENROUTER_ENGINE = (): OpenAICompatEngine => ({
  provider: "OPENROUTER",
  label: "OpenRouter",
  url: "https://openrouter.ai/api/v1/chat/completions",
  models: ["qwen/qwen3.8-27b:free", "inclusionai/ling-3.0-flash-sante:free", "google/gemma-4-31b-it:free"],
  apiKey: process.env.OPENROUTER_API_KEY,
  extraHeaders: { "HTTP-Referer": "https://scic.com.ph", "X-Title": "SCIC Project Atlas" },
});

// Mistral La Plateforme: needs a paid plan for API use now; kept for when a key works.
const MISTRAL_ENGINE = (): OpenAICompatEngine => ({
  provider: "MISTRAL",
  label: "Mistral",
  url: "https://api.mistral.ai/v1/chat/completions",
  models: ["mistral-medium-latest", "mistral-small-latest"],
  apiKey: process.env.MISTRAL_API_KEY,
});

async function runOpenAICompatible(
  engine: OpenAICompatEngine,
  options: AICoreGenerateOptions,
  assistantType: "ATLAS" | "NEXUS"
): Promise<AICoreGenerateResult> {
  const { apiKey, label } = engine;
  if (!apiKey) throw new Error(`${label} key not configured`);

  const tools = options.tools && options.tools.length > 0 ? convertToolsToOpenAI(options.tools) : undefined;
  let lastError: unknown = null;

  for (const model of engine.models) {
    const startTime = Date.now();
    const executedTools: string[] = [];
    const messages: any[] = [
      { role: "system", content: options.systemInstruction },
      ...options.history.map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.content })),
      { role: "user", content: options.message },
    ];
    const call = async () => {
      const res = await fetch(engine.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}`, ...engine.extraHeaders },
        body: JSON.stringify({
          model,
          messages,
          ...(tools ? { tools, tool_choice: "auto" } : {}),
          temperature: options.temperature ?? 0.2,
        }),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        const err = new Error(`${label} ${model} HTTP ${res.status}: ${detail.slice(0, 300)}`);
        (err as Error & { status?: number }).status = res.status;
        throw err;
      }
      const json = await res.json();
      return json.choices?.[0]?.message ?? {};
    };

    try {
      let message = await call();
      let loops = 0;
      const maxLoops = options.maxToolLoops ?? 5;
      while (Array.isArray(message.tool_calls) && message.tool_calls.length > 0 && loops < maxLoops) {
        loops++;
        messages.push({ role: "assistant", content: message.content ?? "", tool_calls: message.tool_calls });
        for (const toolCall of message.tool_calls) {
          const toolName: string = toolCall.function?.name ?? "unknown_tool";
          let args: Record<string, unknown> = {};
          try {
            args = typeof toolCall.function?.arguments === "string" ? JSON.parse(toolCall.function.arguments || "{}") : toolCall.function?.arguments ?? {};
          } catch {
            args = {};
          }
          executedTools.push(toolName);
          options.onToolEvent?.({ type: "step_start", tool: toolName, label: formatHumanToolLabel(toolName, args, false) });
          const toolStart = Date.now();
          let result: unknown;
          try {
            result = options.executeTool ? await options.executeTool(toolName, args) : { error: `Tool ${toolName} not configured` };
          } catch (err: any) {
            result = { error: err?.message || String(err) };
          }
          options.onToolEvent?.({
            type: "step_complete",
            tool: toolName,
            label: formatHumanToolLabel(toolName, args, true),
            elapsedMs: Date.now() - toolStart,
          });
          messages.push({ role: "tool", name: toolName, tool_call_id: toolCall.id, content: JSON.stringify(result ?? {}) });
        }
        message = await call();
      }

      const text = typeof message.content === "string" ? message.content : Array.isArray(message.content) ? message.content.map((p: any) => p?.text ?? "").join("") : "";
      if (!isUsableAnswer(text)) throw new Error(`${label} ${model} returned no usable answer`);

      const telemetry: AIProviderTelemetry = {
        provider: engine.provider,
        model,
        durationMs: Date.now() - startTime,
        executedTools,
        success: true,
      };
      aiLogger.logExecution(assistantType, telemetry);
      return { text, executedTools, telemetry };
    } catch (err) {
      lastError = err;
      console.warn(`[AI Core :: ${label}] ${model} failed, cascading:`, (err as Error)?.message || err);
    }
  }
  throw lastError || new Error(`All ${label} models failed`);
}

// ─── Engine 3: Groq LPU ─────────────────────────────────────────

async function runGroq(
  options: AICoreGenerateOptions,
  assistantType: "ATLAS" | "NEXUS"
): Promise<AICoreGenerateResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");

  const startTime = Date.now();
  const groq = new Groq({ apiKey });
  const modelToUse = "openai/gpt-oss-120b";
  const executedTools: string[] = [];
  const openAiTools = options.tools && options.tools.length > 0 ? convertToolsToOpenAI(options.tools) : undefined;

  const messages: any[] = [
    { role: "system", content: options.systemInstruction },
    ...options.history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: options.message },
  ];

  let completion = await groq.chat.completions.create({
    model: modelToUse,
    messages,
    tools: openAiTools,
    temperature: options.temperature ?? 0.2,
  });

  let message = completion.choices?.[0]?.message;
  let toolCalls = message?.tool_calls;
  let loopCount = 0;
  const maxLoops = options.maxToolLoops ?? 5;

  while (toolCalls && toolCalls.length > 0 && loopCount < maxLoops) {
    loopCount++;
    messages.push(message);

    for (const toolCall of toolCalls) {
      const toolName = toolCall.function?.name;
      executedTools.push(toolName);
      let parsedArgs = {};
      try {
        parsedArgs = JSON.parse(toolCall.function?.arguments || "{}");
      } catch {
        parsedArgs = {};
      }

      options.onToolEvent?.({
        type: "step_start",
        tool: toolName,
        label: formatHumanToolLabel(toolName, parsedArgs, false),
      });

      const toolStart = Date.now();
      let result: unknown;
      try {
        if (options.executeTool) {
          result = await options.executeTool(toolName, parsedArgs);
        } else {
          result = { error: `Tool ${toolName} not configured` };
        }
      } catch (err: any) {
        result = { error: err?.message || String(err) };
      }

      options.onToolEvent?.({
        type: "step_complete",
        tool: toolName,
        label: formatHumanToolLabel(toolName, parsedArgs, true),
        elapsedMs: Date.now() - toolStart,
      });

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(result ?? {}),
      });
    }

    completion = await groq.chat.completions.create({
      model: modelToUse,
      messages,
      tools: openAiTools,
      temperature: options.temperature ?? 0.2,
    });

    message = completion.choices?.[0]?.message;
    toolCalls = message?.tool_calls;
  }

  const durationMs = Date.now() - startTime;
  const telemetry: AIProviderTelemetry = {
    provider: "GROQ",
    model: modelToUse,
    durationMs,
    executedTools,
    success: true,
    tokensPrompt: completion.usage?.prompt_tokens,
    tokensCompletion: completion.usage?.completion_tokens,
  };

  aiLogger.logExecution(assistantType, telemetry);

  return {
    text: message?.content || "",
    executedTools,
    telemetry,
  };
}

/**
 * An answer a person can be shown: not empty, and not a tool's raw output echoed back as the reply
 * (seen once: a whole JSON statistics object arrived as the "answer").
 */
export function isUsableAnswer(text: string | null | undefined): boolean {
  const t = (text || "").trim();
  if (!t) return false;
  if (/^[\[{]/.test(t)) {
    try {
      JSON.parse(t.split("[[SAY")[0].trim());
      return false;
    } catch {
      // starts with a bracket but is prose
    }
  }
  return true;
}

// ─── Public Cascade Dispatcher ──────────────────────────────────

export async function executeAICascade(
  options: AICoreGenerateOptions,
  assistantType: "ATLAS" | "NEXUS"
): Promise<AICoreGenerateResult> {
  const cascadeStart = Date.now();
  const answered = (r: AICoreGenerateResult): AICoreGenerateResult => {
    if (!isUsableAnswer(r.text)) throw new Error(`${r.telemetry?.provider ?? "engine"} returned no usable answer`);
    return r;
  };

  // 1. Wafer-Scale Engine: Cerebras
  if (process.env.CEREBRAS_API_KEY) {
    try {
      return answered(await runCerebras(options, assistantType));
    } catch (err: any) {
      aiLogger.recordError(assistantType, "CEREBRAS", "gpt-oss-120b", Date.now() - cascadeStart, err);
      console.warn("[AI Core :: Cascade] Engine 1 (Cerebras) failed, cascading to Engine 2 (Gemini)...");
    }
  }

  // 2. Multimodal & Reasoning Engine: Google Gemini Flash Cascade
  if (process.env.GOOGLE_AI_API_KEY) {
    try {
      return answered(await runGemini(options, assistantType));
    } catch (err: any) {
      aiLogger.recordError(assistantType, "GEMINI", "gemini-flash-cascade", Date.now() - cascadeStart, err);
      console.warn("[AI Core :: Cascade] Engine 2 (Gemini) failed, cascading to OpenRouter / Mistral...");
    }
  }

  // 2b. OpenAI-compatible fallbacks: OpenRouter free models, then Mistral
  for (const engine of [OPENROUTER_ENGINE(), MISTRAL_ENGINE()]) {
    if (!engine.apiKey) continue;
    try {
      return answered(await runOpenAICompatible(engine, options, assistantType));
    } catch (err: any) {
      aiLogger.recordError(assistantType, engine.provider, engine.models[0], Date.now() - cascadeStart, err);
      console.warn(`[AI Core :: Cascade] ${engine.label} failed, cascading...`);
    }
  }

  // 3. Fast LPU Engine: Groq
  if (process.env.GROQ_API_KEY) {
    try {
      return answered(await runGroq(options, assistantType));
    } catch (err: any) {
      aiLogger.recordError(assistantType, "GROQ", "openai/gpt-oss-120b", Date.now() - cascadeStart, err);
      console.error("[AI Core :: Cascade] Engine 3 (Groq) failed.");
    }
  }

  throw new Error("All configured AI provider engines failed or are unconfigured.");
}
