/**
 * Core AI Provider & Harness Types
 * Shared infrastructure between Project Nexus and Project Atlas.
 */

export type AIProvider = "CEREBRAS" | "GEMINI" | "GROQ";

export type MessageRole = "user" | "assistant" | "system";

export interface AIChatMessage {
  role: MessageRole;
  content: string;
}

export interface AIToolParameter {
  type: "string" | "number" | "boolean" | "object" | "array";
  description: string;
  enum?: string[];
  items?: {
    type: "string" | "number" | "boolean" | "object";
  };
  properties?: Record<string, AIToolParameter>;
  required?: string[];
}

export interface AIToolDeclaration {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, AIToolParameter>;
    required?: string[];
  };
}

export interface AIToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface AIToolResult {
  toolCallId: string;
  name: string;
  result: unknown;
}

export interface AIToolStreamEvent {
  type: "step_start" | "step_complete";
  tool: string;
  label: string;
  summary?: string;
  elapsedMs?: number;
}

export interface AIProviderTelemetry {
  provider: AIProvider;
  model: string;
  durationMs: number;
  tokensPrompt?: number;
  tokensCompletion?: number;
  executedTools: string[];
  success: boolean;
  errorCategory?: string;
}

export interface AICoreGenerateOptions {
  systemInstruction: string;
  history: AIChatMessage[];
  message: string;
  tools?: AIToolDeclaration[];
  executeTool?: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  onToolEvent?: (event: AIToolStreamEvent) => void;
  maxToolLoops?: number;
  temperature?: number;
}

export interface AICoreGenerateResult {
  text: string;
  executedTools: string[];
  telemetry: AIProviderTelemetry;
}
