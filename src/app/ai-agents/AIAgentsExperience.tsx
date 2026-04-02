"use client";

import type { CSSProperties } from "react";
import { Mic, MicOff, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { resolveBackendHttpUrl } from "@/config/runtime";
import type {
  AgentChatApiResponse,
  AgentToolCall,
  AgentUIMessage,
  MapsToArgs,
  SendEmailArgs,
  UpdateSiteStyleArgs,
} from "./types";

interface AgentStyleState {
  theme: "dark" | "light";
  primaryColor: string;
  fontScale: number;
  backgroundColor: string;
  chatBackgroundColor: string;
}

type AgentActionStatus = "pending" | "success" | "error";

interface AgentActionLog {
  id: string;
  title: string;
  detail: string;
  status: AgentActionStatus;
  createdAt: number;
}

interface SpeechRecognitionAlternative {
  transcript: string;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEventLike extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
    SpeechRecognition?: SpeechRecognitionConstructor;
  }
}

const DEFAULT_STYLE: AgentStyleState = {
  theme: "dark",
  primaryColor: "#22d3ee",
  fontScale: 1,
  backgroundColor: "",
  chatBackgroundColor: "",
};

function pushMessage(
  previous: AgentUIMessage[],
  role: AgentUIMessage["role"],
  content: string,
): AgentUIMessage[] {
  return [
    ...previous,
    {
      id: crypto.randomUUID(),
      role,
      content,
      createdAt: Date.now(),
    },
  ];
}

function resolveRouteFromPageName(pageName: string): string | null {
  const normalized = pageName.trim().toLowerCase();

  if (
    normalized === "/" ||
    normalized.includes("generative") ||
    normalized.includes("home") ||
    normalized.includes("main") ||
    normalized.includes("landing")
  ) {
    return "/";
  }

  if (normalized === "/analytical-ai" || normalized.includes("analytical")) {
    return "/analytical-ai";
  }

  if (normalized === "/ai-agents" || normalized.includes("agent")) {
    return "/ai-agents";
  }

  return null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseFontScale(value: string): number | null {
  const normalized = value.trim().toLowerCase();

  if (["large", "big", "bigger", "xl"].includes(normalized)) return 1.12;
  if (["small", "smaller"].includes(normalized)) return 0.92;
  if (["normal", "default", "medium"].includes(normalized)) return 1;

  const numeric = Number.parseFloat(normalized);
  if (Number.isFinite(numeric)) {
    if (numeric > 3) {
      return clamp(numeric / 16, 0.85, 1.4);
    }
    return clamp(numeric, 0.85, 1.4);
  }

  return null;
}

function isValidColor(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;

  const namedColorPattern = /^[a-zA-Z]+$/;
  const hexPattern = /^#([a-fA-F0-9]{3}|[a-fA-F0-9]{6})$/;
  const functionalPattern = /^(rgb|rgba|hsl|hsla)\(.+\)$/;

  return (
    namedColorPattern.test(trimmed) ||
    hexPattern.test(trimmed) ||
    functionalPattern.test(trimmed)
  );
}

function applyStyleUpdate(
  current: AgentStyleState,
  args: UpdateSiteStyleArgs,
): { next: AgentStyleState; summary: string } {
  const property = args.property
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  const value = args.value.trim();

  if (property.includes("theme")) {
    const themeValue = value.toLowerCase();

    if (themeValue.includes("light")) {
      return {
        next: {
          ...current,
          theme: "light",
        },
        summary: "Applied light theme on the entire AI Agents page.",
      };
    }

    if (themeValue.includes("dark") || themeValue.includes("night")) {
      return {
        next: {
          ...current,
          theme: "dark",
        },
        summary: "Applied dark theme on the entire AI Agents page.",
      };
    }

    return {
      next: current,
      summary: `Could not parse theme value: ${value}`,
    };
  }

  // Check chatbot background first ("chatbot_background_color" contains both "chatbot" and "background")
  if (
    property.includes("chatbot") ||
    property.includes("chat_bg") ||
    property.includes("chat_background")
  ) {
    if (!isValidColor(value)) {
      return {
        next: current,
        summary: `Ignored invalid chatbot background color value: ${value}`,
      };
    }

    return {
      next: {
        ...current,
        chatBackgroundColor: value,
      },
      summary: `Updated chat interface background color to ${value}.`,
    };
  }

  // Page background ("background_color" / "bg")
  if (
    property.includes("background") ||
    property.includes("bg")
  ) {
    if (!isValidColor(value)) {
      return {
        next: current,
        summary: `Ignored invalid background color value: ${value}`,
      };
    }

    return {
      next: {
        ...current,
        backgroundColor: value,
      },
      summary: `Updated page background color to ${value}.`,
    };
  }

  if (
    property.includes("color") ||
    property.includes("accent") ||
    property.includes("primary")
  ) {
    if (!isValidColor(value)) {
      return {
        next: current,
        summary: `Ignored invalid color value: ${value}`,
      };
    }

    return {
      next: {
        ...current,
        primaryColor: value,
      },
      summary: `Updated primary color to ${value}.`,
    };
  }

  if (property.includes("font") || property.includes("text")) {
    const fontScale = parseFontScale(value);
    if (!fontScale) {
      return {
        next: current,
        summary: `Could not parse font size value: ${value}`,
      };
    }

    return {
      next: {
        ...current,
        fontScale,
      },
      summary: `Adjusted font scale to ${fontScale.toFixed(2)}x.`,
    };
  }

  return {
    next: current,
    summary: `No supported style property matched: ${args.property}`,
  };
}

function toAgentRequestMessages(messages: AgentUIMessage[], nextInput: string) {
  return [
    ...messages
      .filter(
        (message) => message.role === "user" || message.role === "assistant",
      )
      .slice(-10)
      .map((message) => ({
        role: message.role,
        content: message.content,
      })),
    {
      role: "user" as const,
      content: nextInput,
    },
  ];
}

function buildToolCallPreview(toolCall: AgentToolCall): string {
  if (toolCall.name === "maps_to") {
    const args = toolCall.arguments as MapsToArgs;
    return `Target page: ${args.page_name}`;
  }

  if (toolCall.name === "send_email") {
    const args = toolCall.arguments as SendEmailArgs;
    return `Recipient: ${args.recipient} | Body: ${args.body}`;
  }

  const args = toolCall.arguments as UpdateSiteStyleArgs;
  return `Style update: ${args.property} => ${args.value}`;
}

function buildToolCallSignature(toolCall: AgentToolCall): string {
  if (toolCall.name === "maps_to") {
    const args = toolCall.arguments as MapsToArgs;
    return `maps_to(page_name=\"${args.page_name}\")`;
  }

  if (toolCall.name === "send_email") {
    const args = toolCall.arguments as SendEmailArgs;
    return `send_email(recipient=\"${args.recipient}\", body=\"${args.body}\")`;
  }

  const args = toolCall.arguments as UpdateSiteStyleArgs;
  return `update_site_style(property=\"${args.property}\", value=\"${args.value}\")`;
}

function formatStyleState(state: AgentStyleState): string {
  let result = `Theme: ${state.theme} | Primary color: ${state.primaryColor} | Font scale: ${state.fontScale.toFixed(2)}x`;
  if (state.backgroundColor) result += ` | Page BG: ${state.backgroundColor}`;
  if (state.chatBackgroundColor) result += ` | Chat BG: ${state.chatBackgroundColor}`;
  return result;
}

/* ═══════════════════════════════════════════════════════════
   How-to-Use Animated Demo Component
   ═══════════════════════════════════════════════════════════ */

const DEMO_COMMANDS = [
  { text: "navigate to generative ai page", label: "Navigation" },
  { text: "change background color to navy", label: "Page Style" },
  { text: "change your background color to #2d1b69", label: "Chat Style" },
  { text: 'send welcome email to example@gmail.com', label: "Email" },
  { text: "set theme light", label: "Theme" },
];

const DEMO_RESPONSES: Record<string, string> = {
  "navigate to generative ai page": "Navigating to Generative AI page…",
  "change background color to navy": "Updated page background to navy.",
  "change your background color to #2d1b69": "Updated chat background to #2d1b69.",
  'send welcome email to example@gmail.com': "Email sent to example@gmail.com ✓",
  "set theme light": "Applied light theme to the page.",
};

function HowToUseDemo({
  isLightTheme,
  borderSoft,
  cardBackground,
  subtleTextColor,
}: {
  isLightTheme: boolean;
  borderSoft: string;
  cardBackground: string;
  subtleTextColor: string;
}) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [phase, setPhase] = useState<"typing" | "sending" | "response" | "pause">("typing");
  const [response, setResponse] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const cmd = DEMO_COMMANDS[currentIdx];
    if (!cmd) return;
    const fullText = cmd.text;

    if (phase === "typing") {
      if (typedText.length < fullText.length) {
        timerRef.current = setTimeout(() => {
          setTypedText(fullText.slice(0, typedText.length + 1));
        }, 45 + Math.random() * 30);
      } else {
        timerRef.current = setTimeout(() => setPhase("sending"), 600);
      }
    } else if (phase === "sending") {
      timerRef.current = setTimeout(() => {
        setResponse(DEMO_RESPONSES[fullText] ?? "Done.");
        setPhase("response");
      }, 800);
    } else if (phase === "response") {
      timerRef.current = setTimeout(() => setPhase("pause"), 2200);
    } else if (phase === "pause") {
      timerRef.current = setTimeout(() => {
        const next = (currentIdx + 1) % DEMO_COMMANDS.length;
        setCurrentIdx(next);
        setTypedText("");
        setResponse("");
        setPhase("typing");
      }, 400);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [phase, typedText, currentIdx]);

  const currentCmd = DEMO_COMMANDS[currentIdx];

  return (
    <div
      className="flex flex-col overflow-hidden rounded-xl border"
      style={{
        borderColor: borderSoft,
        background: cardBackground,
        flex: "1 1 50%",
        minHeight: 0,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 border-b px-3 py-2"
        style={{ borderColor: borderSoft, flexShrink: 0 }}
      >
        <span
          style={{
            display: "inline-block",
            height: 6,
            width: 6,
            borderRadius: "50%",
            background: "var(--agent-primary)",
            opacity: 0.7,
          }}
        />
        <p
          className="text-[10px] font-bold uppercase tracking-[0.18em]"
          style={{ color: subtleTextColor, opacity: 0.8 }}
        >
          How to Use
        </p>
        <span
          className="ml-auto rounded-full px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider"
          style={{
            background: "color-mix(in srgb, var(--agent-primary) 12%, transparent)",
            color: "var(--agent-primary)",
            border: "1px solid color-mix(in srgb, var(--agent-primary) 25%, transparent)",
          }}
        >
          {currentCmd?.label}
        </span>
      </div>

      {/* Demo area */}
      <div className="flex flex-1 flex-col justify-between overflow-hidden px-3 py-3" style={{ minHeight: 0 }}>
        {/* Step indicators */}
        <div className="flex flex-wrap gap-1" style={{ flexShrink: 0 }}>
          {DEMO_COMMANDS.map((cmd, i) => (
            <span
              key={cmd.text}
              className="rounded-full px-2 py-0.5 text-[9px] font-medium transition-all duration-300"
              style={{
                background: i === currentIdx
                  ? "color-mix(in srgb, var(--agent-primary) 20%, transparent)"
                  : isLightTheme ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.04)",
                color: i === currentIdx ? "var(--agent-primary)" : subtleTextColor,
                border: `1px solid ${i === currentIdx
                  ? "color-mix(in srgb, var(--agent-primary) 35%, transparent)"
                  : "transparent"}`,
                opacity: i === currentIdx ? 1 : 0.5,
              }}
            >
              {cmd.label}
            </span>
          ))}
        </div>

        {/* Simulated chat area */}
        <div className="flex flex-1 flex-col justify-end overflow-hidden" style={{ minHeight: 0, gap: 4 }}>
          {/* AI response bubble */}
          {response && (
            <div
              className="self-start rounded-lg px-3 py-2 text-[12px]"
              style={{
                animation: "agent-log-fade-in 0.3s ease-out",
                background: isLightTheme ? "rgba(241,245,249,0.9)" : "rgba(15,23,42,0.6)",
                border: `1px solid ${isLightTheme ? "rgba(148,163,184,0.25)" : "rgba(148,163,184,0.12)"}`,
                color: isLightTheme ? "#1e293b" : "#e2e8f0",
                maxWidth: "85%",
              }}
            >
              <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: subtleTextColor, opacity: 0.6 }}>
                Agent
              </span>
              <p className="mt-0.5 leading-relaxed">{response}</p>
            </div>
          )}

          {/* Processing indicator */}
          {phase === "sending" && (
            <div
              className="flex items-center gap-1.5 self-start rounded-lg px-3 py-2"
              style={{
                animation: "agent-log-fade-in 0.2s ease-out",
                background: isLightTheme ? "rgba(241,245,249,0.9)" : "rgba(15,23,42,0.6)",
                border: `1px solid ${isLightTheme ? "rgba(148,163,184,0.25)" : "rgba(148,163,184,0.12)"}`,
              }}
            >
              <div className="flex gap-[2px]">
                <span className="agent-thinking-dot agent-thinking-dot-1 inline-block h-[4px] w-[4px] rounded-full" style={{ background: "var(--agent-primary)" }} />
                <span className="agent-thinking-dot agent-thinking-dot-2 inline-block h-[4px] w-[4px] rounded-full" style={{ background: "var(--agent-primary)" }} />
                <span className="agent-thinking-dot agent-thinking-dot-3 inline-block h-[4px] w-[4px] rounded-full" style={{ background: "var(--agent-primary)" }} />
              </div>
            </div>
          )}
        </div>

        {/* Simulated input area */}
        <div className="relative flex flex-col gap-1.5" style={{ flexShrink: 0 }}>
          <div
            className="rounded-lg border px-3 py-2 text-[12px]"
            style={{
              borderColor: `color-mix(in srgb, var(--agent-primary) 15%, ${borderSoft})`,
              background: isLightTheme ? "rgba(248,250,252,0.5)" : "rgba(8,15,35,0.4)",
              color: isLightTheme ? "#0f172a" : "#f8fafc",
              minHeight: 30,
            }}
          >
            {typedText}
            {phase === "typing" && (
              <span
                className="inline-block"
                style={{
                  width: 1,
                  height: "1em",
                  background: "var(--agent-primary)",
                  marginLeft: 1,
                  animation: "agent-cursor-blink 0.8s step-end infinite",
                  verticalAlign: "text-bottom",
                }}
              />
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="rounded-md px-3 py-1.5 text-[11px] font-semibold transition-all duration-300"
              style={{
                backgroundColor: phase === "sending" ? "color-mix(in srgb, var(--agent-primary) 60%, transparent)" : "var(--agent-primary)",
                color: "#020617",
                transform: phase === "sending" ? "scale(0.95)" : "scale(1)",
                opacity: typedText.length === 0 && phase === "typing" ? 0.4 : 1,
                cursor: "default",
                pointerEvents: "none",
              }}
            >
              Send
            </button>
            <span className="text-[9px]" style={{ color: subtleTextColor, opacity: 0.4 }}>
              Demo — commands cycle automatically
            </span>
          </div>

          {/* Animated dummy cursor */}
          {(phase === "sending" || (phase === "typing" && typedText.length === DEMO_COMMANDS[currentIdx]?.text.length)) && (
            <svg
              width="16"
              height="20"
              viewBox="0 0 16 20"
              fill="none"
              style={{
                position: "absolute",
                left: 36,
                bottom: 8,
                filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.4))",
                animation: phase === "sending" ? "agent-cursor-click 0.4s ease-out" : "agent-cursor-arrive 0.5s ease-out forwards",
                zIndex: 10,
              }}
            >
              <path
                d="M1 1L1 14L4.5 10.5L8 17L10 16L6.5 9.5L11 9L1 1Z"
                fill="white"
                stroke="#1e293b"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}

export function AIAgentsExperience() {
  const router = useRouter();
  const [messages, setMessages] = useState<AgentUIMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [styleState, setStyleState] = useState<AgentStyleState>(DEFAULT_STYLE);
  const [actionLogs, setActionLogs] = useState<AgentActionLog[]>([]);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const pendingMicTranscriptRef = useRef("");
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const monitorScrollRef = useRef<HTMLDivElement | null>(null);

  const appendMessage = useCallback(
    (role: AgentUIMessage["role"], content: string) => {
      setMessages((previous) => pushMessage(previous, role, content));
    },
    [],
  );

  const appendActionLog = useCallback(
    (title: string, detail: string, status: AgentActionStatus) => {
      setActionLogs((previous) => {
        const next: AgentActionLog = {
          id: crypto.randomUUID(),
          title,
          detail,
          status,
          createdAt: Date.now(),
        };
        return [...previous, next].slice(-40);
      });
    },
    [],
  );


  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isThinking]);

  useEffect(() => {
    const el = monitorScrollRef.current;
    if (el) {
      requestAnimationFrame(() => {
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      });
    }
  }, [actionLogs, isThinking]);

  const executeToolCall = useCallback(
    async (toolCall: AgentToolCall) => {
      const signature = buildToolCallSignature(toolCall);
      appendActionLog("Function Call", signature, "pending");

      if (toolCall.name === "maps_to") {
        const args = toolCall.arguments as MapsToArgs;
        const route = resolveRouteFromPageName(args.page_name);

        if (!route) {
          appendMessage(
            "assistant",
            `I could not map that page name (${args.page_name}). Try Generative AI or Analytical AI.`,
          );
          appendActionLog(
            "maps_to failed",
            `Could not map route from page_name: ${args.page_name}`,
            "error",
          );
          return;
        }

        appendMessage("system", `Navigating to ${route}...`);
        appendActionLog(
          "maps_to success",
          `Router push to ${route}`,
          "success",
        );
        router.push(route);
        return;
      }

      if (toolCall.name === "send_email") {
        const args = toolCall.arguments as SendEmailArgs;

        try {
          const response = await fetch(
            `${resolveBackendHttpUrl()}/ai/tools/send-email`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(args),
            },
          );

          const payload = (await response.json()) as {
            ok: boolean;
            message?: string;
          };

          if (!response.ok || !payload.ok) {
            throw new Error(payload.message ?? "Unable to send email.");
          }

          appendMessage(
            "system",
            `Email sent to ${args.recipient} successfully.`,
          );
          appendActionLog(
            "send_email success",
            `Email delivered to ${args.recipient}`,
            "success",
          );
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unable to send email.";
          appendMessage("system", `Email failed: ${message}`);
          appendActionLog("send_email failed", message, "error");
        }

        return;
      }

      const args = toolCall.arguments as UpdateSiteStyleArgs;
      setStyleState((current) => {
        const result = applyStyleUpdate(current, args);
        appendMessage("system", result.summary);
        appendActionLog(
          "update_site_style success",
          `${result.summary} ${formatStyleState(result.next)}`,
          "success",
        );
        return result.next;
      });
    },
    [appendActionLog, appendMessage, router],
  );

  const sendPrompt = useCallback(
    async (prompt: string) => {
      const trimmedPrompt = prompt.trim();
      if (!trimmedPrompt || isThinking) {
        return;
      }

      setErrorMessage(null);
      setMessages((previous) => pushMessage(previous, "user", trimmedPrompt));
      appendActionLog("User Prompt", `"${trimmedPrompt}"`, "success");
      setInputValue("");
      setIsThinking(true);

      try {
        appendActionLog(
          "AI Thinking",
          "Sending prompt to AI model for intent classification and tool selection…",
          "pending",
        );

        const response = await fetch(
          `${resolveBackendHttpUrl()}/ai/agent-chat`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messages: toAgentRequestMessages(messages, trimmedPrompt),
            }),
          },
        );

        const payload = (await response.json()) as AgentChatApiResponse;
        if (!response.ok || !payload.ok) {
          throw new Error(payload.message ?? "AI endpoint request failed.");
        }

        appendActionLog(
          "AI Response Received",
          "Model returned structured response. Parsing intent and tool calls…",
          "success",
        );

        const assistantText = payload.assistantMessage?.trim();
        if (assistantText) {
          appendMessage("assistant", assistantText);
          appendActionLog("Assistant Response", assistantText, "success");
        }

        const toolCalls = payload.toolCalls ?? [];
        if (toolCalls.length > 0) {
          appendActionLog(
            "AI Decision — Tool Plan",
            `AI decided to execute ${toolCalls.length} function call(s). Preparing execution pipeline…`,
            "pending",
          );

          for (const toolCall of toolCalls) {
            appendActionLog(
              `Invoking ${toolCall.name}()`,
              `Args: ${JSON.stringify(toolCall.arguments)}`,
              "pending",
            );
            appendMessage(
              "system",
              `Executing ${toolCall.name}: ${buildToolCallPreview(toolCall)}`,
            );
            await executeToolCall(toolCall);
          }

          appendActionLog(
            "Execution Complete",
            `All ${toolCalls.length} function call(s) finished.`,
            "success",
          );
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to process the request.";
        setErrorMessage(message);
        appendMessage("system", `Error: ${message}`);
        appendActionLog("Request Error", message, "error");
      } finally {
        setIsThinking(false);
      }
    },
    [appendActionLog, appendMessage, executeToolCall, isThinking, messages],
  );

  const toggleMic = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      setMicError("Speech recognition is not supported in this browser.");
      return;
    }

    setMicError(null);

    if (isListening) {
      recognition.stop();
      setIsListening(false);
      return;
    }

    pendingMicTranscriptRef.current = "";

    try {
      recognition.start();
      setIsListening(true);
    } catch {
      setMicError("Unable to start microphone recognition.");
    }
  }, [isListening]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const RecognitionCtor =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!RecognitionCtor) {
      setIsSpeechSupported(false);
      return;
    }

    setIsSpeechSupported(true);
    const recognition = new RecognitionCtor();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let transcript = "";

      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (!result || !result[0]) {
          continue;
        }

        transcript += `${result[0].transcript} `;
      }

      const cleaned = transcript.trim();
      if (!cleaned) {
        return;
      }

      pendingMicTranscriptRef.current = cleaned;
      setInputValue(cleaned);
    };

    recognition.onerror = (event) => {
      setMicError(`Microphone error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      const transcript = pendingMicTranscriptRef.current.trim();
      if (!transcript) {
        return;
      }

      pendingMicTranscriptRef.current = "";
      void sendPrompt(transcript);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [sendPrompt]);

  const isLightTheme = styleState.theme === "light";

  const wrapperStyle = useMemo(() => {
    const defaultBg = isLightTheme
      ? "radial-gradient(circle at 10% 8%, #ffffff 0%, #f0f7ff 35%, #e2edf8 100%)"
      : "radial-gradient(circle at 14% 4%, #10203f 0%, #06122a 35%, #020617 100%)";

    const style: CSSProperties = {
      "--agent-primary": styleState.primaryColor,
      "--agent-font-scale": styleState.fontScale.toString(),
      "background": styleState.backgroundColor || defaultBg,
      "color": isLightTheme ? "#0f172a" : "#e2e8f0",
    } as CSSProperties;

    return style;
  }, [isLightTheme, styleState.backgroundColor, styleState.fontScale, styleState.primaryColor]);

  const shellBackground = isLightTheme
    ? "linear-gradient(145deg, rgba(255,255,255,0.88), rgba(229,239,251,0.8))"
    : "linear-gradient(145deg, rgba(2,6,23,0.84), rgba(12,24,49,0.78))";
  const panelBackground = isLightTheme
    ? "rgba(255,255,255,0.68)"
    : "rgba(3,9,25,0.6)";
  const cardBackground = isLightTheme
    ? "rgba(248,250,252,0.95)"
    : "rgba(15,23,42,0.5)";
  const subtleTextColor = isLightTheme ? "#334155" : "#cbd5e1";
  const borderSoft = isLightTheme
    ? "rgba(71,85,105,0.3)"
    : "rgba(148,163,184,0.22)";

  return (
    <main
      className="px-4 pb-32 pt-3 transition-colors duration-500 sm:px-8 lg:px-10"
      style={wrapperStyle}
    >
      <div
        className="mx-auto grid w-full max-w-6xl gap-4 rounded-3xl border p-3 shadow-2xl md:p-5 lg:grid-cols-[1.5fr_1fr]"
        style={{
          borderColor: "color-mix(in srgb, var(--agent-primary) 40%, #334155)",
          background: shellBackground,
          height: "calc(100vh - 200px)",
          minHeight: 380,
        }}
      >
        <section
          className="flex flex-col overflow-hidden rounded-2xl border p-3 transition-all duration-500 md:p-4"
          style={{
            borderColor: `color-mix(in srgb, var(--agent-primary) 30%, ${borderSoft})`,
            background: styleState.chatBackgroundColor
              ? styleState.chatBackgroundColor
              : panelBackground,
            color: isLightTheme ? "#0f172a" : "#e2e8f0",
            fontSize: `calc(1rem * var(--agent-font-scale))`,
          }}
        >
          {/* Header */}
          <div
            className="mb-2 border-b pb-2"
            style={{ borderColor: `color-mix(in srgb, var(--agent-primary) 15%, ${borderSoft})` }}
          >
            <h1
              className="text-lg font-semibold leading-tight md:text-xl"
              style={{ fontSize: "calc(1.15rem * var(--agent-font-scale))" }}
            >
              AI Agents Automation
            </h1>
            <p
              className="mt-0.5 text-[11px] leading-relaxed"
              style={{ color: subtleTextColor, opacity: 0.6 }}
            >
              Navigate pages, send emails, and customize this UI — all via AI function calling.
            </p>
          </div>

          {/* Chat messages */}
          <div
            className="agent-monitor-scroll flex-1 space-y-2 overflow-y-auto overflow-x-hidden py-2 pr-1"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: isLightTheme
                ? "rgba(71,85,105,0.3) transparent"
                : "rgba(148,163,184,0.2) transparent",
            }}
          >
            {messages.length === 0 && !isThinking ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 py-8 text-center">
                <p className="text-[11px] font-medium" style={{ color: subtleTextColor, opacity: 0.5 }}>
                  Try: &ldquo;navigate to analytical ai&rdquo; or &ldquo;set theme light&rdquo;
                </p>
              </div>
            ) : null}

            {messages.map((message) => {
              const isUser = message.role === "user";
              const isSystem = message.role === "system";

              return (
                <div
                  key={message.id}
                  className={`flex ${isUser ? "justify-end" : isSystem ? "justify-center" : "justify-start"}`}
                  style={{ animation: "agent-log-fade-in 0.3s ease-out" }}
                >
                  <div
                    className="max-w-[88%] rounded-xl px-3.5 py-2 text-[13px] leading-relaxed text-left"
                    style={{
                      fontSize: "calc(0.82rem * var(--agent-font-scale))",
                      background: isUser
                        ? "color-mix(in srgb, var(--agent-primary) 18%, transparent)"
                        : isSystem
                          ? isLightTheme
                            ? "rgba(14,116,144,0.08)"
                            : "rgba(34,211,238,0.06)"
                          : isLightTheme
                            ? "rgba(241,245,249,0.9)"
                            : "rgba(15,23,42,0.6)",
                      border: `1px solid ${
                        isUser
                          ? "color-mix(in srgb, var(--agent-primary) 35%, transparent)"
                          : isSystem
                            ? isLightTheme
                              ? "rgba(14,116,144,0.2)"
                              : "rgba(34,211,238,0.15)"
                            : isLightTheme
                              ? "rgba(148,163,184,0.25)"
                              : "rgba(148,163,184,0.12)"
                      }`,
                      color: isSystem
                        ? isLightTheme ? "#0e7490" : "#67e8f9"
                        : isLightTheme ? "#1e293b" : "#e2e8f0",
                    }}
                  >
                    {!isSystem && (
                      <p
                        className="mb-0.5 text-[9px] font-bold uppercase tracking-[0.1em]"
                        style={{
                          color: isUser
                            ? "var(--agent-primary)"
                            : isLightTheme ? "#64748b" : "#94a3b8",
                        }}
                      >
                        {isUser ? "You" : "Agent"}
                      </p>
                    )}
                    {isSystem && (
                      <p
                        className="mb-0.5 text-[9px] font-bold uppercase tracking-wider"
                        style={{ color: isLightTheme ? "#0891b2" : "#22d3ee", opacity: 0.8 }}
                      >
                        System
                      </p>
                    )}
                    {isSystem ? (
                      <p>{message.content}</p>
                    ) : (
                      <p>{message.content}</p>
                    )}
                  </div>
                </div>
              );
            })}

            {isThinking ? (
              <div className="flex justify-start" style={{ animation: "agent-log-fade-in 0.3s ease-out" }}>
                <div
                  className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2"
                  style={{
                    background: isLightTheme ? "rgba(241,245,249,0.9)" : "rgba(15,23,42,0.6)",
                    border: `1px solid ${isLightTheme ? "rgba(148,163,184,0.25)" : "rgba(148,163,184,0.12)"}`,
                  }}
                >
                  <div className="flex gap-[3px]">
                    <span className="agent-thinking-dot agent-thinking-dot-1 inline-block h-[5px] w-[5px] rounded-full" style={{ background: "var(--agent-primary)" }} />
                    <span className="agent-thinking-dot agent-thinking-dot-2 inline-block h-[5px] w-[5px] rounded-full" style={{ background: "var(--agent-primary)" }} />
                    <span className="agent-thinking-dot agent-thinking-dot-3 inline-block h-[5px] w-[5px] rounded-full" style={{ background: "var(--agent-primary)" }} />
                  </div>
                  <span className="text-[11px] font-medium" style={{ color: subtleTextColor }}>
                    Thinking…
                  </span>
                </div>
              </div>
            ) : null}
            <div ref={chatEndRef} aria-hidden="true" />
          </div>

          {/* Input area */}
          <div
            className="mt-2 space-y-1.5 border-t pt-2"
            style={{ borderColor: `color-mix(in srgb, var(--agent-primary) 12%, ${borderSoft})` }}
          >
            <textarea
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendPrompt(inputValue);
                }
              }}
              placeholder="Ask the AI agent anything…"
              rows={2}
              className="w-full resize-none rounded-lg border px-3 py-2 text-[13px] outline-none transition placeholder:text-[12px]"
              style={{
                fontSize: "calc(0.82rem * var(--agent-font-scale))",
                borderColor: `color-mix(in srgb, var(--agent-primary) 15%, ${borderSoft})`,
                background: isLightTheme ? "rgba(248,250,252,0.8)" : "rgba(8,15,35,0.5)",
                color: isLightTheme ? "#0f172a" : "#f8fafc",
              }}
            />

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  void sendPrompt(inputValue);
                }}
                disabled={isThinking || inputValue.trim().length === 0}
                className="rounded-lg px-3.5 py-1.5 text-[12px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-40"
                style={{
                  backgroundColor: "var(--agent-primary)",
                  color: "#020617",
                }}
              >
                Send
              </button>

              <button
                type="button"
                onClick={toggleMic}
                disabled={!isSpeechSupported}
                className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition disabled:cursor-not-allowed disabled:opacity-40"
                style={{
                  borderColor: `color-mix(in srgb, var(--agent-primary) 25%, ${borderSoft})`,
                  color: isLightTheme ? "#334155" : "#cbd5e1",
                }}
              >
                {isListening ? <MicOff size={13} /> : <Mic size={13} />}
                {isListening ? "Stop" : "Mic"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStyleState(DEFAULT_STYLE);
                  appendActionLog(
                    "Style Reset",
                    `UI style reset. ${formatStyleState(DEFAULT_STYLE)}`,
                    "success",
                  );
                }}
                className="rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] transition"
                style={{
                  borderColor: borderSoft,
                  color: subtleTextColor,
                  opacity: 0.7,
                }}
              >
                Reset
              </button>
            </div>

            {errorMessage ? (
              <p className="text-[11px] text-rose-400">{errorMessage}</p>
            ) : null}
            {micError ? (
              <p className="text-[11px]" style={{ color: isLightTheme ? "#b45309" : "#fcd34d" }}>
                {micError}
              </p>
            ) : null}
          </div>
        </section>

        <aside
          className="flex flex-col gap-2 overflow-hidden rounded-2xl border p-3"
          style={{
            borderColor: borderSoft,
            background: panelBackground,
          }}
        >
          {/* ─── How to Use Demo (top) ─── */}
          <HowToUseDemo isLightTheme={isLightTheme} borderSoft={borderSoft} cardBackground={cardBackground} subtleTextColor={subtleTextColor} />

          {/* ─── AI Pipeline Monitor (bottom) ─── */}
          <div
            className="flex flex-col rounded-xl border"
            style={{
              borderColor: borderSoft,
              background: cardBackground,
              overflow: "hidden",
              flex: "1 1 50%",
              minHeight: 0,
            }}
          >
            {/* Monitor Header */}
            <div
              className="flex items-center gap-2.5 border-b px-4 py-2.5"
              style={{ borderColor: borderSoft, flexShrink: 0 }}
            >
              <span
                className={isThinking ? "agent-monitor-pulse" : ""}
                style={{
                  display: "inline-block",
                  height: 7,
                  width: 7,
                  borderRadius: "50%",
                  background: isThinking ? "#22d3ee" : "var(--agent-primary)",
                  boxShadow: isThinking
                    ? "0 0 8px rgba(34,211,238,0.8), 0 0 20px rgba(34,211,238,0.35)"
                    : `0 0 6px color-mix(in srgb, var(--agent-primary) 55%, transparent)`,
                }}
              />
              <p
                className="text-[11px] font-bold uppercase tracking-[0.2em]"
                style={{ color: "var(--agent-primary)" }}
              >
                AI Pipeline
              </p>
              <span
                className="ml-auto rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                style={{
                  background: isThinking ? "rgba(34,211,238,0.15)" : "rgba(16,185,129,0.12)",
                  color: isThinking
                    ? isLightTheme ? "#0e7490" : "#67e8f9"
                    : isLightTheme ? "#065f46" : "#6ee7b7",
                  border: `1px solid ${isThinking ? "rgba(34,211,238,0.3)" : "rgba(16,185,129,0.25)"}`,
                }}
              >
                {isThinking ? "⟳ Processing" : "● Idle"}
              </span>
            </div>

            {/* Scrollable pipeline feed */}
            <div
              className="agent-monitor-scroll flex-1 overflow-y-auto px-3 py-2"
              style={{
                scrollbarWidth: "thin",
                scrollbarColor: isLightTheme
                  ? "rgba(71,85,105,0.3) transparent"
                  : "rgba(148,163,184,0.2) transparent",
              }}
              ref={monitorScrollRef}
            >
              {actionLogs.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 py-8 text-center">
                  <div
                    className="agent-monitor-idle-icon flex h-9 w-9 items-center justify-center rounded-full"
                    style={{
                      background: isLightTheme ? "rgba(34,211,238,0.06)" : "rgba(34,211,238,0.04)",
                      border: `1px solid ${isLightTheme ? "rgba(34,211,238,0.15)" : "rgba(34,211,238,0.12)"}`,
                    }}
                  >
                    <Sparkles size={16} style={{ color: isLightTheme ? "#0891b2" : "#22d3ee", opacity: 0.7 }} />
                  </div>
                  <p className="text-[11px] font-medium" style={{ color: subtleTextColor, opacity: 0.7 }}>
                    Awaiting AI Activity
                  </p>
                  <p className="max-w-[200px] text-[10px] leading-relaxed" style={{ color: subtleTextColor, opacity: 0.4 }}>
                    Send a prompt to see how the AI thinks, decides, and calls tools in real time
                  </p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {actionLogs.map((log, idx) => {
                    const isLatest = idx === actionLogs.length - 1;
                    const titleLower = log.title.toLowerCase();

                    // Phase classification
                    const isInput = titleLower.includes("prompt") || titleLower.includes("user");
                    const isThinkingStep = titleLower.includes("thinking") || titleLower.includes("sending");
                    const isReceived = titleLower.includes("received") || titleLower.includes("response received");
                    const isDecision = titleLower.includes("plan") || titleLower.includes("decision") || titleLower.includes("assistant response");
                    const isInvoke = titleLower.includes("invoking") || titleLower.includes("function call");
                    const isResult = titleLower.includes("success") || titleLower.includes("complete") || titleLower.includes("reset");
                    const isError = log.status === "error";

                    let icon = "›";
                    let label = "STEP";
                    let accentColor = isLightTheme ? "#64748b" : "#64748b";

                    if (isError) {
                      icon = "✕"; label = "ERROR";
                      accentColor = "#ef4444";
                    } else if (isInput) {
                      icon = "⏵"; label = "INPUT";
                      accentColor = isLightTheme ? "#0891b2" : "#22d3ee";
                    } else if (isThinkingStep) {
                      icon = "◐"; label = "THINKING";
                      accentColor = isLightTheme ? "#0891b2" : "#67e8f9";
                    } else if (isReceived) {
                      icon = "◉"; label = "RECEIVED";
                      accentColor = isLightTheme ? "#0d9488" : "#5eead4";
                    } else if (isDecision) {
                      icon = "⚡"; label = "DECISION";
                      accentColor = isLightTheme ? "#d97706" : "#fbbf24";
                    } else if (isInvoke) {
                      icon = "ƒ"; label = "FUNCTION";
                      accentColor = isLightTheme ? "#7c3aed" : "#a78bfa";
                    } else if (isResult) {
                      icon = "✓"; label = "RESULT";
                      accentColor = isLightTheme ? "#059669" : "#34d399";
                    }

                    return (
                      <div
                        key={log.id}
                        className="agent-log-entry flex gap-2.5 rounded-md px-2 py-2"
                        style={{
                          animation: isLatest ? "agent-log-fade-in 0.35s ease-out" : "none",
                          background: isLatest
                            ? `color-mix(in srgb, ${accentColor} 6%, transparent)`
                            : "transparent",
                        }}
                      >
                        {/* Timeline connector + icon */}
                        <div className="flex flex-col items-center" style={{ width: 18, flexShrink: 0 }}>
                          <span
                            className="flex h-[18px] w-[18px] items-center justify-center rounded-full text-[9px] font-bold"
                            style={{
                              background: `color-mix(in srgb, ${accentColor} 16%, transparent)`,
                              color: accentColor,
                              border: `1.5px solid color-mix(in srgb, ${accentColor} 35%, transparent)`,
                              boxShadow: isLatest ? `0 0 8px color-mix(in srgb, ${accentColor} 25%, transparent)` : "none",
                            }}
                          >
                            {icon}
                          </span>
                          {idx < actionLogs.length - 1 && (
                            <div
                              style={{
                                width: 1.5,
                                flex: 1,
                                minHeight: 8,
                                background: `color-mix(in srgb, ${accentColor} 20%, transparent)`,
                              }}
                            />
                          )}
                        </div>

                        {/* Content */}
                        <div className="min-w-0 flex-1 pb-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="text-[9px] font-bold uppercase tracking-[0.12em]"
                              style={{ color: accentColor }}
                            >
                              {label}
                            </span>
                            {log.status === "pending" && (
                              <span
                                className="agent-monitor-pulse inline-block h-1 w-1 rounded-full"
                                style={{ background: accentColor }}
                              />
                            )}
                            <span
                              className="ml-auto text-[9px] tabular-nums"
                              style={{ color: subtleTextColor, opacity: 0.5 }}
                            >
                              {new Date(log.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              })}
                            </span>
                          </div>
                          <p
                            className="mt-0.5 text-[11px] font-semibold leading-tight"
                            style={{ color: isLightTheme ? "#1e293b" : "#e2e8f0" }}
                          >
                            {log.title}
                          </p>
                          <p
                            className="mt-0.5 text-[10px] leading-snug"
                            style={{
                              color: subtleTextColor,
                              opacity: 0.75,
                              fontFamily: isInvoke ? "'SF Mono','Cascadia Code','Fira Code',monospace" : "inherit",
                              wordBreak: "break-word",
                            }}
                          >
                            {log.detail}
                          </p>
                        </div>
                      </div>
                    );
                  })}

                  {/* Thinking indicator */}
                  {isThinking && (
                    <div
                      className="flex items-center gap-2.5 rounded-md px-2 py-2"
                      style={{ animation: "agent-log-fade-in 0.3s ease-out" }}
                    >
                      <div className="flex h-[18px] w-[18px] items-center justify-center">
                        <div className="flex gap-[3px]">
                          <span className="agent-thinking-dot agent-thinking-dot-1 inline-block h-[4px] w-[4px] rounded-full" style={{ background: isLightTheme ? "#0891b2" : "#22d3ee" }} />
                          <span className="agent-thinking-dot agent-thinking-dot-2 inline-block h-[4px] w-[4px] rounded-full" style={{ background: isLightTheme ? "#0891b2" : "#22d3ee" }} />
                          <span className="agent-thinking-dot agent-thinking-dot-3 inline-block h-[4px] w-[4px] rounded-full" style={{ background: isLightTheme ? "#0891b2" : "#22d3ee" }} />
                        </div>
                      </div>
                      <span className="text-[10px] font-medium" style={{ color: isLightTheme ? "#0891b2" : "#67e8f9" }}>
                        Processing…
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </aside>
      </div>
    </main>
  );
}
