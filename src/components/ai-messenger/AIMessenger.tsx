"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "../ui/utils";
import { resolveBackendHttpUrl } from "@/config/runtime";

/* ─────────────────────── Types ─────────────────────── */

interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
  /** True while the typewriter animation is still revealing text */
  streaming?: boolean;
}

/* ─────────────────────── Constants ─────────────────────── */

const DEFAULT_QUESTIONS = [
  "Who created this website?",
  "What features does this website have?",
  "What technologies are used?",
];

const WELCOME_STORAGE_KEY = "tm-ai-welcome-seen";
const PILL_PHRASES = ["Need help?", "Ask AI", "Chat now"];
const PILL_INTERVAL_MS = 2400;
const WELCOME_AUTO_DISMISS_MS = 12_000;
const WELCOME_INITIAL_DELAY_MS = 1500;

/** Controls how many characters are revealed per animation frame based on backlog size. */
function getCharsPerFrame(backlog: number): number {
  if (backlog <= 0) return 0;
  if (backlog < 40) return 1;
  if (backlog < 120) return 2;
  if (backlog < 240) return 4;
  if (backlog < 500) return 7;
  return 12;
}

/* ─────────────────────── Markdown Renderers ─────────────────────── */

const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-2 last:mb-0 whitespace-pre-wrap">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="leading-snug">{children}</li>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-cyan-200">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className="italic">{children}</em>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-base font-semibold mb-1 mt-2 text-cyan-100">
      {children}
    </h3>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-base font-semibold mb-1 mt-2 text-cyan-100">
      {children}
    </h3>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-sm font-semibold mb-1 mt-2 text-cyan-200">
      {children}
    </h3>
  ),
  h4: ({ children }: { children?: React.ReactNode }) => (
    <h4 className="text-sm font-semibold mb-1 mt-2 text-cyan-200">
      {children}
    </h4>
  ),
  code: ({
    children,
    className,
  }: {
    children?: React.ReactNode;
    className?: string;
  }) => {
    const text = String(children ?? "");
    const isBlock = text.includes("\n") || /language-/.test(className ?? "");
    return isBlock ? (
      <code className="font-mono text-[12px] block text-teal-200">
        {children}
      </code>
    ) : (
      <code className="bg-cyan-950/60 text-cyan-300 px-1 py-0.5 rounded text-[12px] font-mono">
        {children}
      </code>
    );
  },
  pre: ({ children }: { children?: React.ReactNode }) => (
    <pre className="bg-slate-950/70 border border-cyan-900/40 rounded-md p-2 my-2 overflow-x-auto text-[12px] leading-snug">
      {children}
    </pre>
  ),
  a: ({
    children,
    href,
  }: {
    children?: React.ReactNode;
    href?: string;
  }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-cyan-400 underline break-all hover:text-cyan-300 transition-colors"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-l-2 border-cyan-500/60 pl-2 italic text-slate-300 my-2">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-2 border-slate-600/60" />,
};

/* ─────────────────────── Component ─────────────────────── */

export function AIChatMessenger() {
  /* ── UI State ── */
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [pillIdx, setPillIdx] = useState(0);

  /* ── Refs ── */
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Typewriter animation state (kept in refs to avoid re-renders on every character)
  const bufferRef = useRef(""); // Full text received from the network
  const displayedLenRef = useRef(0); // Number of characters currently visible
  const streamDoneRef = useRef(false); // Whether the network stream has ended
  const animationFrameRef = useRef<number | null>(null);
  const activeAiIdRef = useRef<string | null>(null);

  /* ── Rotating pill label while chat is closed ── */
  useEffect(() => {
    if (isOpen) return;
    const timer = setInterval(
      () => setPillIdx((i) => (i + 1) % PILL_PHRASES.length),
      PILL_INTERVAL_MS,
    );
    return () => clearInterval(timer);
  }, [isOpen]);

  /* ── First-visit welcome bubble ── */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(WELCOME_STORAGE_KEY)) return;
    const timer = setTimeout(
      () => setShowWelcome(true),
      WELCOME_INITIAL_DELAY_MS,
    );
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!showWelcome) return;
    const timer = setTimeout(() => {
      setShowWelcome(false);
      localStorage.setItem(WELCOME_STORAGE_KEY, "1");
    }, WELCOME_AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [showWelcome]);

  const dismissWelcome = useCallback(() => {
    setShowWelcome(false);
    if (typeof window !== "undefined") {
      localStorage.setItem(WELCOME_STORAGE_KEY, "1");
    }
  }, []);

  const openChat = useCallback(() => {
    setIsOpen(true);
    dismissWelcome();
  }, [dismissWelcome]);

  /* ── Auto-scroll to latest message ── */
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  /* ── Cleanup animation frame on unmount ── */
  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  /* ── Typewriter animation loop ── */
  const tick = useCallback(() => {
    const aiId = activeAiIdRef.current;
    if (!aiId) {
      animationFrameRef.current = null;
      return;
    }

    const backlog = bufferRef.current.length - displayedLenRef.current;
    const step = getCharsPerFrame(backlog);

    if (step > 0) {
      displayedLenRef.current = Math.min(
        displayedLenRef.current + step,
        bufferRef.current.length,
      );

      const visible = bufferRef.current.slice(0, displayedLenRef.current);

      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === aiId);
        if (idx === -1) return prev;
        const updated = [...prev];
        updated[idx] = { ...updated[idx], content: visible, streaming: true };
        return updated;
      });
    }

    const caughtUp =
      displayedLenRef.current >= bufferRef.current.length &&
      streamDoneRef.current;

    if (caughtUp) {
      // All text revealed — finalize the message (hides the blinking cursor)
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === aiId);
        if (idx === -1) return prev;
        const updated = [...prev];
        updated[idx] = { ...updated[idx], streaming: false };
        return updated;
      });
      activeAiIdRef.current = null;
      animationFrameRef.current = null;
      return;
    }

    animationFrameRef.current = requestAnimationFrame(tick);
  }, []);

  /** Ensures the animation loop is running (safe to call multiple times). */
  const ensureAnimationRunning = useCallback(() => {
    if (animationFrameRef.current === null) {
      animationFrameRef.current = requestAnimationFrame(tick);
    }
  }, [tick]);

  /* ── Send message to backend & process the streaming response ── */
  const sendToAI = async (userMessage: string) => {
    // Reset typewriter state for this new response
    bufferRef.current = "";
    displayedLenRef.current = 0;
    streamDoneRef.current = false;

    try {
      setIsThinking(true);

      const response = await fetch(
        `${resolveBackendHttpUrl()}/ai/messenger-chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content: userMessage }],
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      if (!response.body) {
        throw new Error("Response body is empty — streaming not supported");
      }

      // Create the AI message bubble (empty — will be filled by the typewriter)
      const aiMessageId = `ai-${Date.now()}`;
      activeAiIdRef.current = aiMessageId;

      setMessages((prev) => [
        ...prev,
        {
          id: aiMessageId,
          content: "",
          sender: "ai",
          timestamp: new Date(),
          streaming: true,
        },
      ]);

      // Hide the "thinking" spinner now that we have a live stream
      setIsThinking(false);

      // Start the typewriter animation
      ensureAnimationRunning();

      // Read chunks from the response stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bufferRef.current += decoder.decode(value, { stream: true });
        ensureAnimationRunning();
      }

      // Signal that the network stream is complete
      streamDoneRef.current = true;
      ensureAnimationRunning();
    } catch (error) {
      console.error("[AIMessenger] Stream error:", error);

      // Clean up animation state
      streamDoneRef.current = true;
      activeAiIdRef.current = null;

      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          content:
            "Sorry, the AI service is currently unavailable. Please try again.",
          sender: "ai",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  /* ── Message submission handlers ── */
  const handleSendMessage = (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    sendToAI(content);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };

  /* ─────────────────────── Render ─────────────────────── */

  return (
    <>
      {/* ── Floating Chat Button (visible when chat is closed) ── */}
      {!isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[60] flex items-end gap-2 sm:gap-3">
          {/* Welcome bubble or rotating pill */}
          {showWelcome ? (
            <div
              role="button"
              tabIndex={0}
              onClick={openChat}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") openChat();
              }}
              className="tm-ai-bubble-in relative mb-3 max-w-[200px] sm:max-w-[230px] cursor-pointer rounded-2xl rounded-br-sm bg-slate-900/95 border border-cyan-500/30 px-3 sm:px-4 py-2.5 sm:py-3 shadow-xl shadow-cyan-950/30 backdrop-blur-xl hover:shadow-2xl hover:shadow-cyan-900/30 transition-shadow"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  dismissWelcome();
                }}
                aria-label="Dismiss"
                className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-slate-300 shadow hover:bg-slate-500 transition-colors"
              >
                <X className="h-3 w-3" strokeWidth={3} />
              </button>

              <div className="flex items-center gap-2">
                <Sparkles
                  className="h-4 w-4 text-cyan-400 tm-ai-sparkle shrink-0"
                  strokeWidth={2.5}
                />
                <p className="text-sm font-semibold text-cyan-300 tm-ai-shimmer">
                  Need help?
                </p>
              </div>
              <p className="mt-1 text-xs text-slate-300">
                Ask the{" "}
                <span className="font-semibold text-cyan-400">
                  AI Assistant
                </span>{" "}
                — anything about this site.
              </p>
              <p className="mt-1 text-[10px] text-slate-500">
                Click to start chatting →
              </p>

              {/* Tail pointing toward the chat icon */}
              <span className="absolute -right-1.5 bottom-4 h-3 w-3 rotate-45 border-t border-r border-cyan-500/30 bg-slate-900/95" />
            </div>
          ) : (
            <button
              type="button"
              onClick={openChat}
              aria-label="Open AI chat"
              className="tm-ai-bubble-in relative mb-3 flex items-center gap-1.5 rounded-full bg-slate-900/95 border border-cyan-500/30 pl-2.5 pr-3 py-1.5 shadow-md shadow-cyan-950/25 backdrop-blur-xl hover:shadow-lg hover:shadow-cyan-900/30 hover:scale-[1.04] transition-all cursor-pointer"
            >
              <Sparkles
                className="h-3.5 w-3.5 text-cyan-400 tm-ai-sparkle shrink-0"
                strokeWidth={2.8}
              />
              <span
                key={pillIdx}
                className="tm-ai-text-pop inline-block min-w-[68px] text-center text-[12px] font-bold text-cyan-300 whitespace-nowrap"
              >
                {PILL_PHRASES[pillIdx]}
              </span>
              {/* Tail */}
              <span className="absolute -right-1 bottom-3 h-2.5 w-2.5 rotate-45 border-t border-r border-cyan-500/30 bg-slate-900/95" />
            </button>
          )}

          {/* Main floating button with pulse rings */}
          <div className="relative tm-ai-float">
            {/* Pulse rings */}
            <span
              aria-hidden
              className="tm-ai-ring absolute inset-0 rounded-full bg-cyan-500/30"
            />
            <span
              aria-hidden
              className="tm-ai-ring absolute inset-0 rounded-full bg-teal-400/25"
              style={{ animationDelay: "1.2s" }}
            />

            <Button
              onClick={openChat}
              aria-label="Open AI chat"
              className="relative h-12 w-12 sm:h-14 sm:w-14 xl:h-16 xl:w-16 rounded-full bg-gradient-to-br from-cyan-600 to-teal-500 hover:from-teal-500 hover:to-cyan-600 shadow-lg shadow-cyan-900/40 hover:shadow-2xl hover:shadow-cyan-800/50 transition-all duration-300 hover:scale-110 hover:-rotate-6 cursor-pointer"
            >
              <MessageCircle
                className="!h-5 !w-5 sm:!h-6 sm:!w-6 text-white"
                strokeWidth={2.5}
              />
            </Button>

            {/* Online indicator dot */}
            <span
              aria-hidden
              className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-teal-400 animate-ping"
            />
            <span
              aria-hidden
              className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-teal-400 ring-2 ring-slate-900"
            />
          </div>
        </div>
      )}

      {/* ── Chat Window ── */}
      {isOpen && (
        <div
          className="fixed z-[60] chat-shadow animate-slide-up overflow-hidden flex flex-col rounded-xl shadow-2xl shadow-cyan-950/40 border border-cyan-500/20
            top-3 right-3 bottom-3 left-3
            sm:top-auto sm:left-auto sm:bottom-6 sm:right-6
            sm:w-[390px] sm:h-[620px] sm:max-h-[85vh]"
          style={{
            background:
              "linear-gradient(145deg, #0b1220 0%, #0f172a 50%, #020617 100%)",
          }}
        >
          {/* Header */}
          <div
            className="p-3 sm:p-4 flex items-center justify-between border-b border-cyan-500/20"
            style={{
              background:
                "linear-gradient(135deg, rgba(8,145,178,0.15) 0%, rgba(15,23,42,0.95) 100%)",
            }}
          >
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-gradient-to-br from-cyan-500/25 to-teal-500/25 border border-cyan-400/30 flex items-center justify-center shrink-0">
                <MessageCircle className="h-5 w-5 text-cyan-400" />
              </div>
              <div className="min-w-0">
                <h3 className="text-cyan-50 font-semibold text-sm sm:text-base tracking-wide">
                  AI Assistant
                </h3>
                <p className="text-cyan-300/70 text-[11px] sm:text-xs truncate">
                  Online • Typically replies instantly
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="text-slate-300 rounded-full cursor-pointer bg-slate-800/60 border border-slate-600/40 hover:bg-slate-700/80 hover:text-white shrink-0 transition-colors"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 sm:space-y-4">
            {/* Welcome state with default questions */}
            {messages.length === 0 && (
              <div className="space-y-4">
                <div className="bg-slate-800/60 border border-cyan-500/15 rounded-xl p-4 max-w-[85%]">
                  <p className="text-sm text-slate-200">
                    👋 Hi! I&apos;m your AI assistant for{" "}
                    <span className="font-semibold text-cyan-400">
                      TM AI Studio
                    </span>
                    . How can I help you today?
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-slate-400 px-1">
                    Quick questions:
                  </p>
                  {DEFAULT_QUESTIONS.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => handleSendMessage(question)}
                      className="block w-full text-left bg-slate-800/40 hover:bg-slate-700/60 border border-cyan-500/15 hover:border-cyan-400/30 rounded-xl p-3 text-sm text-slate-200 transition-all duration-200 hover:shadow-md hover:shadow-cyan-950/20 hover:scale-[1.02] cursor-pointer"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message bubbles */}
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex animate-fade-in",
                  message.sender === "user" ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "rounded-2xl p-4 max-w-[85%] shadow-sm",
                    message.sender === "user"
                      ? "bg-gradient-to-br from-cyan-600/90 to-teal-600/80 text-white rounded-br-sm shadow-cyan-900/30"
                      : "bg-slate-800/60 border border-cyan-500/15 text-slate-200 rounded-bl-sm",
                  )}
                >
                  {message.sender === "user" ? (
                    <p className="text-sm whitespace-pre-wrap">
                      {message.content}
                    </p>
                  ) : (
                    <div className="text-sm leading-relaxed ai-markdown">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={markdownComponents}
                      >
                        {message.content}
                      </ReactMarkdown>
                      {message.streaming && (
                        <span className="inline-block w-[7px] h-[14px] align-[-2px] bg-cyan-400 ml-0.5 animate-pulse rounded-[1px]" />
                      )}
                    </div>
                  )}
                  <div className="flex justify-between mt-1.5">
                    <p
                      className={cn(
                        "text-xs",
                        message.sender === "user"
                          ? "text-white/60"
                          : "text-slate-500",
                      )}
                    >
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    {message.sender === "ai" && (
                      <span className="text-xs text-cyan-500/70">
                        AI Studio
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Thinking indicator */}
            {isThinking && (
              <div className="flex justify-start animate-fade-in">
                <div className="bg-slate-800/60 border border-cyan-500/15 rounded-2xl rounded-bl-sm p-3 max-w-[85%] flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
                  <span className="text-sm font-medium text-slate-400">
                    AI Thinking...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 sm:p-4 border-t border-cyan-500/15 bg-slate-950/80">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 rounded-full border border-cyan-500/20 focus-visible:ring-cyan-500/50 !text-slate-200 !bg-slate-800/60 placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-offset-0 text-sm"
                disabled={isThinking}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!inputValue.trim() || isThinking}
                className="rounded-full bg-gradient-to-br from-cyan-600 to-teal-500 hover:from-teal-500 hover:to-cyan-600 h-10 w-10 shrink-0 cursor-pointer text-white shadow-md shadow-cyan-900/30 disabled:opacity-40 transition-all"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
