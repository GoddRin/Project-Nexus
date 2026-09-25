/**
 * Shared AI Core Observability Logger
 * Privacy-safe structured logger for AI provider calls, tool execution, and latency metrics.
 * Strictly avoids logging API secrets or sensitive conversation text.
 */

import { AIProviderTelemetry } from "./types";

export interface AILogEntry {
  timestamp: string;
  assistantType: "ATLAS" | "NEXUS";
  provider: string;
  model: string;
  durationMs: number;
  toolCount: number;
  tools: string[];
  success: boolean;
  tokensPrompt?: number;
  tokensCompletion?: number;
  errorCategory?: string;
  userHash?: string;
}

class AIObservabilityLogger {
  private formatErrorCategory(err: unknown): string {
    if (!err) return "UNKNOWN";
    const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
    if (msg.includes("rate") || msg.includes("429") || msg.includes("quota")) return "RATE_LIMIT";
    if (msg.includes("timeout") || msg.includes("timed out") || msg.includes("econnreset")) return "NETWORK_TIMEOUT";
    if (msg.includes("401") || msg.includes("unauthorized") || msg.includes("key")) return "AUTH_CONFIG";
    if (msg.includes("parse") || msg.includes("json") || msg.includes("syntax")) return "RESPONSE_PARSING";
    if (msg.includes("tool") || msg.includes("function")) return "TOOL_EXECUTION";
    return "PROVIDER_ERROR";
  }

  public logExecution(
    assistantType: "ATLAS" | "NEXUS",
    telemetry: AIProviderTelemetry,
    userId?: string
  ): void {
    const entry: AILogEntry = {
      timestamp: new Date().toISOString(),
      assistantType,
      provider: telemetry.provider,
      model: telemetry.model,
      durationMs: telemetry.durationMs,
      toolCount: telemetry.executedTools.length,
      tools: telemetry.executedTools,
      success: telemetry.success,
      tokensPrompt: telemetry.tokensPrompt,
      tokensCompletion: telemetry.tokensCompletion,
      errorCategory: telemetry.errorCategory,
      userHash: userId ? `usr_${userId.slice(-6)}` : "anonymous",
    };

    if (process.env.NODE_ENV !== "test") {
      const prefix = `[AI Core :: ${entry.assistantType}]`;
      const status = entry.success ? "✓ SUCCESS" : `✗ FAILED (${entry.errorCategory})`;
      console.log(
        `${prefix} ${entry.provider}/${entry.model} in ${entry.durationMs}ms | ${status} | Tools: [${entry.tools.join(", ") || "none"}]`
      );
    }
  }

  public recordError(
    assistantType: "ATLAS" | "NEXUS",
    provider: string,
    model: string,
    durationMs: number,
    err: unknown,
    tools: string[] = []
  ): AIProviderTelemetry {
    const category = this.formatErrorCategory(err);
    const telemetry: AIProviderTelemetry = {
      provider: provider as any,
      model,
      durationMs,
      executedTools: tools,
      success: false,
      errorCategory: category,
    };
    this.logExecution(assistantType, telemetry);
    return telemetry;
  }
}

export const aiLogger = new AIObservabilityLogger();
