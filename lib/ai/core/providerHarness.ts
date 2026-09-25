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
        label: `Executing ${toolName}...`,
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
        label: `Completed ${toolName}`,
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
  const geminiModels = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
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
            label: `Executing ${call.name}...`,
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
            label: `Completed ${call.name}`,
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
        text: response.response.text(),
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
        label: `Executing ${toolName}...`,
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
        label: `Completed ${toolName}`,
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

// ─── Public Cascade Dispatcher ──────────────────────────────────

export async function executeAICascade(
  options: AICoreGenerateOptions,
  assistantType: "ATLAS" | "NEXUS"
): Promise<AICoreGenerateResult> {
  const cascadeStart = Date.now();

  // 1. Wafer-Scale Engine: Cerebras
  if (process.env.CEREBRAS_API_KEY) {
    try {
      return await runCerebras(options, assistantType);
    } catch (err: any) {
      aiLogger.recordError(assistantType, "CEREBRAS", "gpt-oss-120b", Date.now() - cascadeStart, err);
      console.warn("[AI Core :: Cascade] Engine 1 (Cerebras) failed, cascading to Engine 2 (Gemini)...");
    }
  }

  // 2. Multimodal & Reasoning Engine: Google Gemini Flash Cascade
  if (process.env.GOOGLE_AI_API_KEY) {
    try {
      return await runGemini(options, assistantType);
    } catch (err: any) {
      aiLogger.recordError(assistantType, "GEMINI", "gemini-flash-cascade", Date.now() - cascadeStart, err);
      console.warn("[AI Core :: Cascade] Engine 2 (Gemini) failed, cascading to Engine 3 (Groq)...");
    }
  }

  // 3. Fast LPU Engine: Groq
  if (process.env.GROQ_API_KEY) {
    try {
      return await runGroq(options, assistantType);
    } catch (err: any) {
      aiLogger.recordError(assistantType, "GROQ", "openai/gpt-oss-120b", Date.now() - cascadeStart, err);
      console.error("[AI Core :: Cascade] Engine 3 (Groq) failed.");
    }
  }

  throw new Error("All configured AI provider engines failed or are unconfigured.");
}
