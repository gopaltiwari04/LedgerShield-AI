"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  Bot,
  X,
  Send,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Trash2,
  ChevronDown,
  ArrowRight,
  ShieldAlert,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  provider?: string;
  timestamp: string;
}

export function AIAssistantWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-1",
      role: "assistant",
      content:
        "Hello! I am your **LedgerShield AI Assistant**. I can guide you through accounts-payable workflows, explain reconciliation formulas, or help you investigate discrepancy findings.\n\nHow can I help you today?",
      timestamp: "Just now",
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll when messages change
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, loading]);

  // Context-aware suggested prompts based on current page route
  const getContextPrompts = (path: string): string[] => {
    if (path.startsWith("/documents")) {
      return [
        "How do I upload an invoice or PO?",
        "What formats are supported for extraction?",
        "How does SHA-256 duplicate detection work?",
      ];
    }
    if (path.startsWith("/findings")) {
      return [
        "What does a high-risk finding mean?",
        "How do I confirm a finding with maker-checker?",
        "What is the difference between facts and hypotheses?",
      ];
    }
    if (path.startsWith("/reconciliation")) {
      return [
        "How does 3-way matching work in LedgerShield?",
        "What causes a price or quantity variance?",
        "How are partial deliveries handled?",
      ];
    }
    if (path.startsWith("/suppliers")) {
      return [
        "What is the Scenario F shared bank account alert?",
        "How do I apply an unapplied supplier credit note?",
      ];
    }
    if (path.startsWith("/rules")) {
      return [
        "How do price and quantity tolerances work?",
        "What is dual-authorization and invoice splitting?",
      ];
    }
    if (path.startsWith("/team")) {
      return [
        "How do I invite a team member?",
        "What permissions does each RBAC role have?",
      ];
    }
    if (path.startsWith("/reports")) {
      return [
        "How do I export an audit report for the board?",
        "What reports distinguish facts from estimates?",
      ];
    }
    // Default dashboard prompts
    return [
      "What do the 4 recovery pipeline stages mean?",
      "How is double-counting prevented across findings?",
      "How do I run a new 3-way reconciliation scan?",
    ];
  };

  const handleSendMessage = async (textToSend?: string) => {
    const messageContent = (textToSend || input).trim();
    if (!messageContent || loading) return;

    setError(null);
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: messageContent,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageContent,
          history: newMessages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
          currentPath: pathname,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to get response from AI Assistant.");
      }

      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        role: "assistant",
        content: data.reply,
        provider: data.provider,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while contacting the assistant.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: "welcome-reset",
        role: "assistant",
        content:
          "Conversation cleared. How can I assist you with LedgerShield AI?",
        timestamp: "Just now",
      },
    ]);
    setShowClearConfirm(false);
    setError(null);
  };

  // Helper to format assistant markdown text cleanly
  const renderMessageContent = (content: string) => {
    const paragraphs = content.split("\n\n");
    return paragraphs.map((para, pIdx) => {
      // Check for bullet lists
      if (para.includes("\n- ") || para.startsWith("- ")) {
        const items = para.split("\n").filter((l) => l.trim().startsWith("- "));
        return (
          <ul key={pIdx} className="list-disc list-inside space-y-1 my-2">
            {items.map((item, iIdx) => (
              <li key={iIdx} className="leading-relaxed">
                {formatInlineText(item.replace(/^- /, ""))}
              </li>
            ))}
          </ul>
        );
      }

      // Check for numbered lists
      if (/^\d+\.\s/.test(para.trim())) {
        const items = para.split("\n").filter((l) => /^\d+\.\s/.test(l.trim()));
        return (
          <ol key={pIdx} className="list-decimal list-inside space-y-1 my-2">
            {items.map((item, iIdx) => (
              <li key={iIdx} className="leading-relaxed">
                {formatInlineText(item.replace(/^\d+\.\s/, ""))}
              </li>
            ))}
          </ol>
        );
      }

      return (
        <p key={pIdx} className="mb-2 leading-relaxed last:mb-0">
          {formatInlineText(para)}
        </p>
      );
    });
  };

  // Helper for bold and code highlighting
  const formatInlineText = (text: string) => {
    const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={idx}
            className="px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-800 font-mono text-[11px]"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={idx} className="font-semibold text-slate-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  const contextPrompts = getContextPrompts(pathname);

  return (
    <div className="fixed bottom-6 right-6 z-40 select-none">
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2.5 px-4 py-3 rounded-full bg-blue-600 hover:bg-blue-500 active:scale-95 text-white shadow-elevated shadow-blue-600/30 transition-all cursor-pointer"
          aria-label="Open LedgerShield AI Assistant"
        >
          <div className="relative">
            <Bot className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-emerald-400" />
          </div>
          <span className="text-xs font-bold tracking-wide">AI Assistant</span>
        </button>
      )}

      {/* Interactive Chat Panel */}
      {isOpen && (
        <div className="flex flex-col w-[380px] sm:w-[420px] h-[580px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
          {/* Header */}
          <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shrink-0">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold tracking-tight text-white flex items-center gap-1.5">
                  LedgerShield AI Assistant
                  <span className="text-[10px] font-mono bg-blue-500/20 text-blue-400 px-1.5 py-0.2 rounded border border-blue-500/30">
                    Gemini
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Your guide to financial intelligence and audit workflows
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowClearConfirm(true)}
                title="Clear conversation"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close Assistant"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Clear Confirmation Prompt */}
          {showClearConfirm && (
            <div className="p-3 bg-amber-50 border-b border-amber-200 text-xs text-amber-900 flex items-center justify-between animate-fadeIn">
              <span>Clear conversation history?</span>
              <div className="flex gap-2">
                <button
                  onClick={handleClearHistory}
                  className="font-bold text-rose-600 hover:underline cursor-pointer"
                >
                  Yes, clear
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="text-slate-500 hover:underline cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs bg-slate-50/50">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${
                  m.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`relative max-w-[88%] p-3.5 rounded-2xl ${
                    m.role === "user"
                      ? "bg-blue-600 text-white rounded-br-none shadow-sm"
                      : "bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-subtle"
                  }`}
                >
                  {m.role === "assistant" ? (
                    <div className="space-y-1">
                      {renderMessageContent(m.content)}
                    </div>
                  ) : (
                    <p className="leading-relaxed whitespace-pre-wrap">{m.content}</p>
                  )}
                </div>

                {/* Message Meta & Copy action */}
                <div className="flex items-center gap-2 mt-1 px-1 text-[10px] text-slate-400 font-mono">
                  <span>{m.timestamp}</span>
                  {m.role === "assistant" && (
                    <button
                      onClick={() => handleCopy(m.id, m.content)}
                      className="hover:text-slate-600 flex items-center gap-1 transition-colors cursor-pointer"
                      title="Copy response"
                    >
                      {copiedId === m.id ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-600" />
                          <span className="text-emerald-600 font-bold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Loading Indicator */}
            {loading && (
              <div className="flex flex-col items-start animate-fadeIn">
                <div className="p-3.5 rounded-2xl rounded-bl-none bg-white border border-slate-200 text-slate-600 flex items-center gap-2 shadow-subtle">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 rounded-full bg-blue-600 animate-bounce" />
                    <span className="h-2 w-2 rounded-full bg-blue-600 animate-bounce [animation-delay:0.2s]" />
                    <span className="h-2 w-2 rounded-full bg-blue-600 animate-bounce [animation-delay:0.4s]" />
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    Consulting Gemini knowledge base...
                  </span>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-fadeIn">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p>{error}</p>
                  <button
                    onClick={() => handleSendMessage()}
                    className="font-bold underline text-rose-700 hover:text-rose-900 cursor-pointer"
                  >
                    Retry request
                  </button>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Context-Aware Suggested Questions */}
          {messages.length <= 4 && (
            <div className="p-3 bg-white border-t border-slate-100 space-y-1.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block px-1">
                Suggested Questions:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {contextPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt)}
                    disabled={loading}
                    className="text-left text-[11px] px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 transition-colors cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Footer */}
          <div className="p-3.5 bg-white border-t border-slate-200">
            <div className="relative flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about reconciliation, findings, or workflows..."
                className="w-full bg-transparent resize-none text-xs text-slate-900 placeholder-slate-400 focus:outline-none max-h-24 p-1"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!input.trim() || loading}
                className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white shadow-sm transition-all cursor-pointer shrink-0"
                aria-label="Send message"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 pt-1.5 font-mono">
              <span>Enter to send • Shift+Enter for new line</span>
              <span>Grounded in active workspace</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
