"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Send,
  Trash2,
  Bot,
  User,
  Sparkles,
  AlertCircle,
  FileText,
  BookOpen,
  Cpu,
  ArrowUpRight,
  ExternalLink,
  Download,
  Image as ImageIcon,
  CheckCircle2,
  Folder,
  Ticket,
  Wrench,
  Activity,
  Users,
  Box,
  Compass,
  ChevronDown,
  ChevronRight,
  Droplets,
  Package,
  ShieldAlert,
  CloudRain,
  Radio,
  Layers,
  Zap,
} from "lucide-react";
import { clearConversation } from "./actions";
import { Citation, ClientAction, ToolStreamEvent } from "@/lib/rag/generate";

interface Message {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  citations?: Citation[];
  createdAt?: Date;
  clientAction?: ClientAction | null;
  executedSteps?: ToolStreamEvent[];
}

interface AssistantChatClientProps {
  projectId: string;
  initialConversationId: string | null;
  initialMessages: Message[];
}

const markdownComponents = {
  h1: ({ children }: any) => (
    <h1 className="font-display text-lg font-bold text-text-primary mt-3 mb-2 border-b border-white/10 pb-1">
      {children}
    </h1>
  ),
  h2: ({ children }: any) => (
    <h2 className="font-display text-base font-semibold text-text-primary mt-3 mb-1.5 border-b border-white/5 pb-1">
      {children}
    </h2>
  ),
  h3: ({ children }: any) => (
    <h3 className="font-display text-sm font-semibold text-text-primary mt-2.5 mb-1">
      {children}
    </h3>
  ),
  p: ({ node, children }: any) => {
    // Prevent invalid HTML nesting: in HTML, <div> (from custom img/table/pre) cannot be a child of <p>.
    const hasBlockChild = node?.children?.some(
      (child: any) =>
        child.tagName === "img" ||
        child.tagName === "table" ||
        child.tagName === "pre" ||
        child.tagName === "div"
    );

    if (hasBlockChild) {
      return (
        <div className="text-sm leading-relaxed text-text-primary/90 mb-2.5 last:mb-0 font-normal">
          {children}
        </div>
      );
    }

    return (
      <p className="text-sm leading-relaxed text-text-primary/90 mb-2.5 last:mb-0 font-normal">
        {children}
      </p>
    );
  },
  ul: ({ children }: any) => (
    <ul className="list-disc pl-5 space-y-1 mb-2.5 text-sm text-text-primary/90">
      {children}
    </ul>
  ),
  ol: ({ children }: any) => (
    <ol className="list-decimal pl-5 space-y-1 mb-2.5 text-sm text-text-primary/90">
      {children}
    </ol>
  ),
  li: ({ children }: any) => <li className="pl-0.5 leading-relaxed">{children}</li>,
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-2 border-flow-teal bg-flow-teal/5 pl-3 py-1.5 pr-2 rounded-r-lg text-text-muted italic mb-2.5 text-xs">
      {children}
    </blockquote>
  ),
  code: ({ inline, children, ...props }: any) => {
    return inline ? (
      <code className="font-mono text-xs bg-white/10 border border-white/10 px-1.5 py-0.5 rounded text-flow-teal font-medium" {...props}>
        {children}
      </code>
    ) : (
      <pre className="font-mono text-xs bg-black/50 border border-white/10 rounded-xl p-3.5 overflow-x-auto my-2.5 text-text-primary">
        <code {...props}>{children}</code>
      </pre>
    );
  },
  table: ({ children }: any) => (
    <div className="overflow-x-auto my-3 rounded-xl border border-white/10 bg-black/20 shadow-md">
      <table className="w-full border-collapse text-xs text-left">{children}</table>
    </div>
  ),
  thead: ({ children }: any) => <thead className="bg-white/[0.04] border-b border-white/10">{children}</thead>,
  tbody: ({ children }: any) => <tbody className="divide-y divide-white/5">{children}</tbody>,
  tr: ({ children }: any) => <tr className="hover:bg-white/[0.02] transition-colors">{children}</tr>,
  th: ({ children }: any) => <th className="px-3 py-2 font-semibold text-text-primary text-[11px] uppercase tracking-wider">{children}</th>,
  td: ({ children }: any) => <td className="px-3 py-2 text-text-primary/80 font-normal">{children}</td>,
  a: ({ href, children }: any) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-flow-teal underline hover:text-flow-teal/80 inline-flex items-center gap-0.5 font-medium"
    >
      {children}
      <ExternalLink className="h-3 w-3 inline ml-0.5 opacity-70" />
    </a>
  ),
  img: ({ src, alt }: any) => (
    <div className="my-3 overflow-hidden rounded-xl border border-white/10 bg-black/40 shadow-xl max-w-lg">
      <div className="relative group bg-black/60 flex items-center justify-center p-2">
        <img
          src={src}
          alt={alt || "Document preview"}
          className="max-h-80 w-auto max-w-full rounded-lg object-contain transition-transform duration-300 group-hover:scale-[1.01]"
          loading="lazy"
        />
      </div>
      <div className="flex items-center justify-between border-t border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs">
        <div className="flex items-center gap-1.5 text-text-muted truncate max-w-[240px]">
          <ImageIcon className="h-3.5 w-3.5 text-flow-teal flex-shrink-0" />
          <span className="font-mono text-[11px] truncate">{alt || "Image preview"}</span>
        </div>
        {src && (
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-flow-teal/15 hover:bg-flow-teal/25 text-flow-teal border border-flow-teal/30 text-[11px] font-medium transition-all"
          >
            <Download className="h-3 w-3" />
            <span>Open / Download</span>
          </a>
        )}
      </div>
    </div>
  ),
};

const SUGGESTED_PROMPTS = [
  { label: "Take me to Turbine Hall in 3D", icon: Box },
  { label: "What is Pinacanauan River's water level & discharge?", icon: Droplets },
  { label: "Check warehouse inventory for low-stock items", icon: Package },
  { label: "Generate 5-min safety toolbox talk for Penstock welding", icon: ShieldAlert },
  { label: "Who is currently our Project Manager?", icon: Users },
  { label: "Check active typhoon advisories in PAR & Isabela", icon: CloudRain },
  { label: "List active visitors logged at main gate", icon: Users },
  { label: "What are the critical COD Q4 2026 milestones?", icon: Activity },
];

export function AssistantChatClient({
  projectId,
  initialConversationId,
  initialMessages,
}: AssistantChatClientProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId);
  const [loading, setLoading] = useState(false);
  const [activeToolEvents, setActiveToolEvents] = useState<ToolStreamEvent[]>([]);
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, activeToolEvents]);

  const toggleStepAccordion = (msgId: string) => {
    setExpandedSteps((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const sendMessageQuery = async (queryText: string) => {
    if (!queryText.trim() || loading) return;

    setInput("");
    setError(null);
    setLoading(true);
    setActiveToolEvents([]);

    const tempUserMsg: Message = {
      id: crypto.randomUUID(),
      role: "USER",
      content: queryText,
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          query: queryText,
          conversationId,
          projectId,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Request failed with status ${response.status}`);
      }

      // ─── Consume Server-Sent Events (SSE) stream ───
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Unable to read response stream.");
      }

      const decoder = new TextDecoder();
      let buffer = "";
      const currentSteps: ToolStreamEvent[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data: ")) {
            try {
              const payload = JSON.parse(trimmed.slice(6));

              if (payload.type === "step_start") {
                setActiveToolEvents((prev) => {
                  const existingIdx = prev.findIndex((e) => e.tool === payload.tool && e.type === "step_start");
                  if (existingIdx !== -1) {
                    const next = [...prev];
                    next[existingIdx] = payload;
                    return next;
                  }
                  return [...prev, payload];
                });
                currentSteps.push(payload);
              } else if (payload.type === "step_complete") {
                setActiveToolEvents((prev) => {
                  const idx = prev.findIndex((e) => e.tool === payload.tool);
                  if (idx !== -1) {
                    const updated = [...prev];
                    updated[idx] = payload;
                    return updated;
                  }
                  return [...prev, payload];
                });
                const stepIdx = currentSteps.findIndex((e) => e.tool === payload.tool);
                if (stepIdx !== -1) {
                  currentSteps[stepIdx] = payload;
                } else {
                  currentSteps.push(payload);
                }
              } else if (payload.type === "final_answer") {
                if (payload.clearChat) {
                  setMessages([]);
                  setConversationId(null);
                  setActiveToolEvents([]);
                  return;
                }

                if (payload.conversationId && !conversationId) {
                  setConversationId(payload.conversationId);
                }

                const assistantMsg: Message = {
                  id: crypto.randomUUID(),
                  role: "ASSISTANT",
                  content: payload.answer,
                  citations: payload.citations || [],
                  clientAction: payload.clientAction || null,
                  executedSteps: [...currentSteps],
                };

                setMessages((prev) => [...prev, assistantMsg]);
                setActiveToolEvents([]);
              } else if (payload.type === "error") {
                throw new Error(payload.error || "Generation error");
              }
            } catch (pErr) {
              console.warn("SSE parse error:", pErr, trimmed);
            }
          }
        }
      }
    } catch (err: unknown) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : "An error occurred. Please try again.";
      setError(errMsg);
    } finally {
      setLoading(false);
      setActiveToolEvents([]);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessageQuery(input);
  };

  const handleClear = async () => {
    if (!conversationId) return;
    if (!confirm("Are you sure you want to clear this conversation history?")) return;

    setError(null);
    const result = await clearConversation(conversationId);
    if (result.success) {
      setMessages([]);
      setConversationId(null);
    } else {
      setError(result.error || "Failed to clear conversation");
    }
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case "DOCUMENT":
        return <FileText className="h-3 w-3" />;
      case "KNOWLEDGE_ARTICLE":
        return <BookOpen className="h-3 w-3" />;
      case "EQUIPMENT_SPEC":
        return <Cpu className="h-3 w-3" />;
      default:
        return <FileText className="h-3 w-3" />;
    }
  };

  const getSourceUrl = (citation: Citation) => {
    switch (citation.sourceType) {
      case "DOCUMENT":
        return `/dashboard/documents/${citation.sourceId}`;
      case "KNOWLEDGE_ARTICLE":
        return `/dashboard/knowledge-base/${citation.slug || citation.sourceId}`;
      case "EQUIPMENT_SPEC":
        return `/dashboard/equipment/${citation.sourceId}`;
      default:
        return "#";
    }
  };

  const getSourceBadgeClass = (type: string) => {
    switch (type) {
      case "DOCUMENT":
        return "bg-flow-teal/10 text-flow-teal border-flow-teal/20";
      case "KNOWLEDGE_ARTICLE":
        return "bg-signal-amber/10 text-signal-amber border-signal-amber/20";
      case "EQUIPMENT_SPEC":
        return "bg-white/5 text-text-muted border-white/10 font-mono";
      default:
        return "bg-white/5 text-text-muted border-white/10";
    }
  };

  return (
    <div className="flex h-[calc(100vh-2rem)] flex-col gap-4 p-4 max-w-5xl mx-auto">
      {/* Header Area */}
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-flow-teal/15 shadow-[0_0_12px_rgba(31,182,166,0.25)] border border-flow-teal/30">
            <Sparkles className="h-5 w-5 text-flow-teal animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-lg font-bold tracking-tight text-text-primary">
                Nexus AI Assistant
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-flow-teal/10 px-2 py-0.5 text-[10px] font-medium text-flow-teal border border-flow-teal/20">
                <CheckCircle2 className="h-2.5 w-2.5" /> Tri-Engine Cascade Active
              </span>
            </div>
            <p className="text-xs text-text-muted">
              Cerebras WSE (104ms) • Google Gemini Grounding • Groq LPU Failover • 3D Co-Pilot
            </p>
          </div>
        </div>

        {conversationId && (
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-text-muted hover:bg-signal-red/10 hover:text-signal-red hover:border-signal-red/20 transition-all cursor-pointer"
            title="Clear conversation"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear Chat
          </button>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-signal-red/20 bg-signal-red/5 p-3.5 text-sm text-signal-red shadow-[0_0_8px_rgba(239,68,68,0.05)]">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Chat History View (Glass Card) */}
      <div className="flex-1 overflow-y-auto rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-white/[0.01] shadow-[0_12px_40px_rgba(0,0,0,0.4)] backdrop-blur-md p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-6 space-y-4 max-w-xl mx-auto">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-flow-teal/10 border border-flow-teal/20 shadow-[0_0_20px_rgba(31,182,166,0.15)]">
              <Bot className="h-7 w-7 text-flow-teal" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-text-primary">
                Tumauini HEPP Real-Time Co-Pilot
              </h2>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                Powered by a sub-second Tri-Engine cascade. I can fly the 3D Digital Twin camera, pull live river hydrology & weather advisories, check warehouse inventory, and record site shifts.
              </p>
            </div>

            {/* Suggested Prompts */}
            <div className="w-full pt-2">
              <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider text-left mb-2.5">
                Suggested Co-Pilot Actions
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                {SUGGESTED_PROMPTS.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => sendMessageQuery(item.label)}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-flow-teal/10 hover:border-flow-teal/30 text-xs text-text-primary/90 transition-all text-left group cursor-pointer"
                    >
                      <Icon className="h-4 w-4 text-flow-teal group-hover:scale-110 transition-transform flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex gap-3 ${msg.role === "USER" ? "justify-end" : "justify-start"}`}
                >
                  {/* Assistant Icon */}
                  {msg.role === "ASSISTANT" && (
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-flow-teal/10 border border-flow-teal/20 shadow-[0_0_8px_rgba(31,182,166,0.1)]">
                      <Bot className="h-4.5 w-4.5 text-flow-teal" />
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "USER"
                        ? "bg-flow-teal/10 border border-flow-teal/20 text-text-primary rounded-tr-none shadow-[0_4px_12px_rgba(31,182,166,0.05)]"
                        : "bg-white/5 border border-white/10 text-text-primary/95 rounded-tl-none font-normal shadow-md"
                    }`}
                  >
                    {/* Executed Steps Accordion Header */}
                    {msg.role === "ASSISTANT" && msg.executedSteps && msg.executedSteps.length > 0 && (
                      <div className="mb-2.5 pb-2 border-b border-white/10">
                        <button
                          type="button"
                          onClick={() => toggleStepAccordion(msg.id)}
                          className="flex items-center gap-1.5 text-[11px] font-mono text-flow-teal hover:text-flow-teal/80 transition-colors cursor-pointer"
                        >
                          <Zap className="h-3 w-3" />
                          <span>
                            {msg.executedSteps.length} site {msg.executedSteps.length === 1 ? "action" : "actions"} executed
                          </span>
                          {expandedSteps[msg.id] ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                        </button>
                        {expandedSteps[msg.id] && (
                          <div className="mt-2 space-y-1 pl-1">
                            {msg.executedSteps.map((step, sIdx) => (
                              <div
                                key={sIdx}
                                className="text-[11px] font-mono text-text-muted flex items-center justify-between gap-2 bg-black/30 p-1.5 rounded-lg border border-white/5"
                              >
                                <div className="flex items-center gap-1.5 truncate">
                                  <CheckCircle2 className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                                  <span className="text-text-primary/85 truncate">{step.label}</span>
                                </div>
                                {step.elapsedMs && (
                                  <span className="text-[10px] text-text-muted/60 flex-shrink-0">
                                    {step.elapsedMs}ms
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Message Body with ReactMarkdown */}
                    {msg.role === "ASSISTANT" ? (
                      <div className="select-text prose-sm prose-invert max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    )}

                    {/* Citations display */}
                    {msg.role === "ASSISTANT" && msg.citations && msg.citations.length > 0 && (
                      <div className="mt-3.5 pt-3 border-t border-white/5 space-y-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted font-mono">
                          Sources Cited
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {msg.citations.map((citation, cIdx) => (
                            <Link
                              key={cIdx}
                              href={getSourceUrl(citation)}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-medium hover:bg-white/10 transition-colors ${getSourceBadgeClass(
                                citation.sourceType
                              )}`}
                              title={citation.excerpt}
                            >
                              {getSourceIcon(citation.sourceType)}
                              <span className="font-mono text-xs">{citation.sourceName}</span>
                              <ArrowUpRight className="h-2.5 w-2.5 opacity-55" />
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 3D Digital Twin & Page Co-Pilot Navigation Card */}
                    {msg.role === "ASSISTANT" && msg.clientAction && (
                      <div className="mt-3.5 pt-3 border-t border-white/10">
                        {msg.clientAction.type === "NAVIGATE_3D" ? (
                          <div className="rounded-xl border border-flow-teal/30 bg-gradient-to-r from-flow-teal/15 via-cyan-950/30 to-black/50 p-3.5 shadow-[0_0_20px_rgba(31,182,166,0.15)]">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2.5">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-flow-teal/20 text-flow-teal border border-flow-teal/30 shadow-[0_0_10px_rgba(31,182,166,0.3)]">
                                  <Box className="h-5 w-5 animate-pulse" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-flow-teal">
                                      3D Digital Twin Co-Pilot
                                    </span>
                                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-flow-teal animate-ping" />
                                  </div>
                                  <h4 className="text-xs font-semibold text-text-primary font-display">
                                    {msg.clientAction.title}
                                  </h4>
                                </div>
                              </div>
                              <Link
                                href={msg.clientAction.url}
                                onClick={() => {
                                  if (msg.clientAction?.target) {
                                    window.dispatchEvent(
                                      new CustomEvent("plant-scene-select-preset", {
                                        detail: msg.clientAction.target,
                                      })
                                    );
                                  }
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-flow-teal hover:bg-flow-teal/90 text-white font-medium text-xs shadow-md transition-all group flex-shrink-0"
                              >
                                <span>Fly Camera</span>
                                <Compass className="h-3.5 w-3.5 transition-transform group-hover:rotate-45" />
                              </Link>
                            </div>
                            <p className="text-[11px] text-text-muted mt-2 pl-0.5">
                              Smoothly transition the 3D plant camera directly to this operational zone.
                            </p>
                          </div>
                        ) : (
                          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-flow-teal">
                                <Layers className="h-4 w-4" />
                              </div>
                              <div>
                                <span className="text-[10px] font-mono text-text-muted uppercase">
                                  {msg.clientAction.badgeText || "Module Action"}
                                </span>
                                <h4 className="text-xs font-semibold text-text-primary">
                                  {msg.clientAction.title}
                                </h4>
                              </div>
                            </div>
                            <Link
                              href={msg.clientAction.url}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-text-primary text-xs font-medium border border-white/15 transition-all"
                            >
                              <span>Open Module</span>
                              <ArrowUpRight className="h-3 w-3" />
                            </Link>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* User Icon */}
                  {msg.role === "USER" && (
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/5 border border-white/10">
                      <User className="h-4.5 w-4.5 text-text-muted" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Live Action Execution HUD while loading */}
        {loading && (
          <div className="space-y-2.5">
            {activeToolEvents.length > 0 && (
              <div className="rounded-2xl border border-flow-teal/30 bg-black/60 backdrop-blur-md p-3.5 shadow-[0_0_20px_rgba(31,182,166,0.12)] space-y-2.5 max-w-lg">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-5 w-5 items-center justify-center rounded-md bg-flow-teal/20 text-flow-teal">
                      <Zap className="h-3 w-3 animate-pulse" />
                    </div>
                    <span className="font-mono text-xs font-semibold text-flow-teal tracking-wide">
                      Live Agent Execution HUD
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-text-muted bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                    <Radio className="h-2.5 w-2.5 text-flow-teal animate-pulse" />
                    Streaming SSE
                  </span>
                </div>

                <div className="space-y-1.5">
                  {activeToolEvents.map((evt, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white/[0.03] border border-white/5 text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        {evt.type === "step_start" ? (
                          <span className="h-3.5 w-3.5 rounded-full border-2 border-flow-teal border-t-transparent animate-spin flex-shrink-0" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                        )}
                        <span className="truncate text-text-primary/90 font-medium">
                          {evt.label}
                        </span>
                      </div>
                      {evt.summary && (
                        <span className="text-[10px] font-mono text-text-muted whitespace-nowrap bg-black/40 px-1.5 py-0.5 rounded">
                          {evt.elapsedMs ? `${evt.elapsedMs}ms` : "Done"}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-start">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-flow-teal/10 border border-flow-teal/20 animate-pulse shadow-[0_0_10px_rgba(31,182,166,0.2)]">
                <Bot className="h-4.5 w-4.5 text-flow-teal" />
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-none px-4 py-3 text-sm text-text-muted flex items-center gap-2.5">
                <span className="animate-spin h-4 w-4 border-2 border-flow-teal border-t-transparent rounded-full" />
                <span className="font-mono text-xs text-text-primary/90">
                  {activeToolEvents.length > 0
                    ? "Executing agentic tools & synthesizing..."
                    : "Formulating answer on Tri-Engine Cascade..."}
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          placeholder="Ask a question, fly to 3D zones, check river discharge, or request warehouse materials..."
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-flow-teal/40 focus:ring-1 focus:ring-flow-teal/20 transition-all disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-flow-teal text-white hover:bg-flow-teal/90 disabled:opacity-50 shadow-[0_4px_12px_rgba(31,182,166,0.2)] hover:shadow-[0_4px_16px_rgba(31,182,166,0.3)] transition-all cursor-pointer"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
