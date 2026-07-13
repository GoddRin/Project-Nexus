"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Trash2, Bot, User, Sparkles, AlertCircle, FileText, BookOpen, Cpu, ArrowUpRight } from "lucide-react";
import { clearConversation } from "./actions";
import { Citation } from "@/lib/rag/generate";

interface Message {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  citations?: Citation[];
  createdAt?: Date;
}

interface AssistantChatClientProps {
  projectId: string;
  initialConversationId: string | null;
  initialMessages: Message[];
}

export function AssistantChatClient({
  projectId,
  initialConversationId,
  initialMessages,
}: AssistantChatClientProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userQuery = input;
    setInput("");
    setError(null);
    setLoading(true);

    // Append user message locally
    const tempUserMsg: Message = {
      id: crypto.randomUUID(),
      role: "USER",
      content: userQuery,
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: userQuery,
          conversationId,
          projectId,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate answer");
      }

      // Save conversationId if first message
      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }

      // Append assistant response
      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "ASSISTANT",
        content: data.answer,
        citations: data.citations || [],
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : "An error occurred. Please try again.";
      setError(errMsg);
    } finally {
      setLoading(false);
    }
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

  // Render correct icon for citation type
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

  // Render navigation link for citation type
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

  // Render styling class for badges
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
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-flow-teal/15 shadow-[0_0_12px_rgba(31,182,166,0.2)] border border-flow-teal/20">
            <Sparkles className="h-4.5 w-4.5 text-flow-teal" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold tracking-tight text-text-primary">
              RAG AI Assistant
            </h1>
            <p className="text-xs text-text-muted">
              Nexus Intelligent Grounded Assistant
            </p>
          </div>
        </div>

        {conversationId && (
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-text-muted hover:bg-signal-red/10 hover:text-signal-red hover:border-signal-red/20 transition-all"
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
          <div className="flex h-full flex-col items-center justify-center text-center p-8 space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 border border-white/10">
              <Bot className="h-6 w-6 text-text-muted" />
            </div>
            <h2 className="font-display font-medium text-text-primary">
              How can I assist you today?
            </h2>
            <p className="text-xs text-text-muted max-w-sm">
              Ask about technical specifications in the Equipment Registry, Knowledge Base guidelines, or uploaded project design blueprints.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex gap-3 ${msg.role === "USER" ? "justify-end" : "justify-start"}`}
                >
                  {/* Assistant Icon */}
                  {msg.role === "ASSISTANT" && (
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-flow-teal/10 border border-flow-teal/20">
                      <Bot className="h-4.5 w-4.5 text-flow-teal" />
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "USER"
                        ? "bg-flow-teal/10 border border-flow-teal/20 text-text-primary rounded-tr-none shadow-[0_4px_12px_rgba(31,182,166,0.05)]"
                        : "bg-white/5 border border-white/10 text-text-primary/95 rounded-tl-none font-normal"
                    }`}
                  >
                    {/* Message Body */}
                    <div className={msg.role === "ASSISTANT" ? "font-display text-text-primary/95" : ""}>
                      {msg.content}
                    </div>

                    {/* Citations display */}
                    {msg.role === "ASSISTANT" && msg.citations && msg.citations.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-white/5 space-y-2">
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

        {/* Searching / Loading State */}
        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-flow-teal/10 border border-flow-teal/20 animate-pulse">
              <Bot className="h-4.5 w-4.5 text-flow-teal" />
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-none px-4 py-3 text-sm text-text-muted flex items-center gap-2">
              <span className="animate-spin h-3.5 w-3.5 border-2 border-flow-teal border-t-transparent rounded-full" />
              <span className="font-mono text-xs">Searching project documents...</span>
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
          placeholder="Ask a question about design specifications, turbine drawings, manuals..."
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
