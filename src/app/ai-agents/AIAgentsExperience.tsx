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
}

type AgentActionStatus = "pending" | "success" | "error" | "cancelled";

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

export function AIAgentsExperience() {
  const router = useRouter();
  const [messages, setMessages] = useState<AgentUIMessage[]>([
    {
      id: crypto.randomUUID(),
      role: "assistant",
      content:
        "Hi, I can navigate pages, send an email, and customize this AI Agents UI. Tell me what you want, or use the mic.",
      createdAt: Date.now(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingToolCall, setPendingToolCall] = useState<AgentToolCall | null>(
    null,
  );
  const [styleState, setStyleState] = useState<AgentStyleState>(DEFAULT_STYLE);
  const [actionLogs, setActionLogs] = useState<AgentActionLog[]>([]);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const pendingMicTranscriptRef = useRef("");

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
        return [...previous, next].slice(-30);
      });
    },
    [],
  );

  useEffect(() => {
    appendActionLog(
      "Agent Ready",
      "Tool-calling demo initialized for this session.",
      "success",
    );
  }, [appendActionLog]);

  const sendPrompt = useCallback(
    async (prompt: string) => {
      const trimmedPrompt = prompt.trim();
      if (!trimmedPrompt || isThinking) {
        return;
      }

      setErrorMessage(null);
      setMessages((previous) => pushMessage(previous, "user", trimmedPrompt));
      appendActionLog("User Prompt", trimmedPrompt, "success");
      setInputValue("");
      setIsThinking(true);

      try {
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

        const assistantText = payload.assistantMessage?.trim();
        if (assistantText) {
          appendMessage("assistant", assistantText);
          appendActionLog("Assistant Response", assistantText, "success");
        }

        const candidateTool = payload.toolCalls?.[0];
        if (candidateTool) {
          setPendingToolCall(candidateTool);
          appendActionLog(
            "AI Tool Selected",
            `${candidateTool.name} | ${buildToolCallPreview(candidateTool)}`,
            "pending",
          );
          appendMessage(
            "system",
            `Confirmation required: ${candidateTool.name}`,
          );
        }

        if ((payload.toolCalls?.length ?? 0) > 1) {
          appendMessage(
            "system",
            "Multiple actions were suggested; showing confirmation for the first one.",
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
    [appendActionLog, appendMessage, isThinking, messages],
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

  const executePendingTool = useCallback(async () => {
    if (!pendingToolCall) {
      return;
    }

    const toolCall = pendingToolCall;
    setPendingToolCall(null);
    appendActionLog(
      "Tool Execution Started",
      `${toolCall.name} | ${buildToolCallPreview(toolCall)}`,
      "pending",
    );

    if (toolCall.name === "maps_to") {
      const args = toolCall.arguments as MapsToArgs;
      const route = resolveRouteFromPageName(args.page_name);

      if (!route) {
        appendMessage(
          "assistant",
          `I could not map that page name (${args.page_name}). Try Generative AI or Analytical AI.`,
        );
        appendActionLog(
          "Navigation Failed",
          `Could not map route from page_name: ${args.page_name}`,
          "error",
        );
        return;
      }

      appendMessage("system", `Navigating to ${route}...`);
      appendActionLog(
        "Navigation Success",
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
          "Email Sent",
          `Email delivered to ${args.recipient}`,
          "success",
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to send email.";
        appendMessage("system", `Email failed: ${message}`);
        appendActionLog("Email Failed", message, "error");
      }

      return;
    }

    if (toolCall.name === "update_site_style") {
      const args = toolCall.arguments as UpdateSiteStyleArgs;
      setStyleState((current) => {
        const result = applyStyleUpdate(current, args);
        appendMessage("system", result.summary);
        appendActionLog("Style Update", result.summary, "success");
        return result.next;
      });
      return;
    }
  }, [appendActionLog, appendMessage, pendingToolCall, router]);

  const cancelPendingTool = useCallback(() => {
    if (!pendingToolCall) {
      return;
    }

    appendMessage("system", `Cancelled tool call: ${pendingToolCall.name}.`);
    appendActionLog(
      "Tool Cancelled",
      `${pendingToolCall.name} execution cancelled by user.`,
      "cancelled",
    );
    setPendingToolCall(null);
  }, [appendActionLog, appendMessage, pendingToolCall]);

  const isLightTheme = styleState.theme === "light";

  const wrapperStyle = useMemo(() => {
    const style: CSSProperties = {
      "--agent-primary": styleState.primaryColor,
      "--agent-font-scale": styleState.fontScale.toString(),
      "background": isLightTheme
        ? "radial-gradient(circle at 10% 8%, #ffffff 0%, #f0f7ff 35%, #e2edf8 100%)"
        : "radial-gradient(circle at 14% 4%, #10203f 0%, #06122a 35%, #020617 100%)",
      "color": isLightTheme ? "#0f172a" : "#e2e8f0",
    } as CSSProperties;

    return style;
  }, [isLightTheme, styleState.fontScale, styleState.primaryColor]);

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

  const recentLogs = actionLogs.slice(-8).reverse();

  return (
    <main
      className="min-h-screen px-4 pb-28 pt-5 transition-colors duration-300 sm:px-8 lg:px-10"
      style={wrapperStyle}
    >
      <div
        className="mx-auto grid w-full max-w-6xl gap-5 rounded-3xl border p-4 shadow-2xl md:p-6 lg:grid-cols-[1.25fr_0.75fr]"
        style={{
          borderColor: "color-mix(in srgb, var(--agent-primary) 40%, #334155)",
          background: shellBackground,
        }}
      >
        <section
          className="relative flex min-h-[70vh] flex-col rounded-2xl border p-3 md:p-4"
          style={{
            borderColor: borderSoft,
            background: panelBackground,
          }}
        >
          <div
            className="mb-3 flex items-center justify-between gap-3 border-b pb-3"
            style={{ borderColor: borderSoft }}
          >
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-[0.2em]"
                style={{ color: "var(--agent-primary)" }}
              >
                AI Agents Console
              </p>
              <h1
                className="text-xl font-semibold md:text-2xl"
                style={{ fontSize: "calc(1.25rem * var(--agent-font-scale))" }}
              >
                Tool Calling Demo
              </h1>
            </div>
            <span
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs"
              style={{ borderColor: borderSoft }}
            >
              <Sparkles size={14} />
              Production Mode
            </span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {messages.map((message) => {
              const isUser = message.role === "user";
              const isSystem = message.role === "system";

              return (
                <article
                  key={message.id}
                  className={`max-w-[88%] rounded-2xl px-4 py-2 text-sm leading-relaxed md:text-[15px] ${
                    isUser ? "ml-auto" : isSystem ? "mx-auto" : "mr-auto"
                  }`}
                  style={{
                    fontSize: "calc(0.95rem * var(--agent-font-scale))",
                    border: `1px solid ${
                      isUser
                        ? "color-mix(in srgb, var(--agent-primary) 56%, #155e75)"
                        : isSystem
                          ? "rgba(245,158,11,0.45)"
                          : borderSoft
                    }`,
                    background: isUser
                      ? "color-mix(in srgb, var(--agent-primary) 25%, transparent)"
                      : isSystem
                        ? isLightTheme
                          ? "rgba(245,158,11,0.14)"
                          : "rgba(245,158,11,0.1)"
                        : cardBackground,
                    color: isSystem
                      ? isLightTheme
                        ? "#92400e"
                        : "#fcd34d"
                      : isLightTheme
                        ? "#0f172a"
                        : "#e2e8f0",
                  }}
                >
                  {message.content}
                </article>
              );
            })}

            {isThinking ? (
              <article
                className="mr-auto inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm"
                style={{
                  borderColor: borderSoft,
                  background: cardBackground,
                  color: subtleTextColor,
                }}
              >
                <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300" />
                Thinking...
              </article>
            ) : null}
          </div>

          <div
            className="mt-4 space-y-2 border-t pt-3"
            style={{ borderColor: borderSoft }}
          >
            <textarea
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder="Try: navigate to analytical ai, send email to test@example.com saying hello, set theme light"
              rows={3}
              className="w-full resize-none rounded-xl border px-3 py-2 text-sm outline-none transition"
              style={{
                fontSize: "calc(0.95rem * var(--agent-font-scale))",
                borderColor: borderSoft,
                background: cardBackground,
                color: isLightTheme ? "#0f172a" : "#f8fafc",
              }}
            />

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  void sendPrompt(inputValue);
                }}
                disabled={isThinking || inputValue.trim().length === 0}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-950 transition disabled:cursor-not-allowed disabled:opacity-45"
                style={{
                  backgroundColor: "var(--agent-primary)",
                }}
              >
                Send
              </button>

              <button
                type="button"
                onClick={toggleMic}
                disabled={!isSpeechSupported}
                className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45"
                style={{ borderColor: borderSoft }}
              >
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                {isListening ? "Stop mic" : "Use mic"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStyleState(DEFAULT_STYLE);
                  appendActionLog(
                    "Style Reset",
                    "UI theme and style variables reset to defaults.",
                    "success",
                  );
                }}
                className="rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em]"
                style={{ borderColor: borderSoft }}
              >
                Reset style
              </button>
            </div>

            {errorMessage ? (
              <p className="text-xs text-rose-400">{errorMessage}</p>
            ) : null}
            {micError ? (
              <p
                className="text-xs"
                style={{ color: isLightTheme ? "#b45309" : "#fcd34d" }}
              >
                {micError}
              </p>
            ) : null}
            {!isSpeechSupported ? (
              <p className="text-xs" style={{ color: subtleTextColor }}>
                Browser speech recognition is unavailable. Text input remains
                fully supported.
              </p>
            ) : null}
          </div>

          {pendingToolCall ? (
            <div
              className="absolute inset-0 z-20 grid place-items-center rounded-2xl p-3"
              style={{
                background: isLightTheme
                  ? "rgba(226,232,240,0.68)"
                  : "rgba(2,6,23,0.72)",
              }}
            >
              <div
                className="w-full max-w-lg rounded-2xl border p-5 shadow-2xl"
                style={{
                  borderColor: borderSoft,
                  background: isLightTheme ? "#ffffff" : "#0f172a",
                  color: isLightTheme ? "#0f172a" : "#f8fafc",
                }}
              >
                <p
                  className="text-xs font-semibold uppercase tracking-[0.2em]"
                  style={{ color: isLightTheme ? "#b45309" : "#fcd34d" }}
                >
                  Confirmation Required
                </p>
                <h3 className="mt-2 text-lg font-semibold">
                  Execute AI tool call?
                </h3>
                <p className="mt-3 text-sm" style={{ color: subtleTextColor }}>
                  Function:{" "}
                  <span
                    className="font-semibold"
                    style={{ color: "var(--agent-primary)" }}
                  >
                    {pendingToolCall.name}
                  </span>
                </p>
                <pre
                  className="mt-3 overflow-x-auto rounded-xl border p-3 text-xs"
                  style={{
                    borderColor: borderSoft,
                    background: cardBackground,
                    color: isLightTheme ? "#0f172a" : "#e2e8f0",
                  }}
                >
                  {JSON.stringify(pendingToolCall.arguments, null, 2)}
                </pre>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void executePendingTool();
                    }}
                    className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-950"
                    style={{ backgroundColor: "var(--agent-primary)" }}
                  >
                    Confirm and run
                  </button>
                  <button
                    type="button"
                    onClick={cancelPendingTool}
                    className="rounded-xl border px-4 py-2 text-sm font-semibold"
                    style={{ borderColor: borderSoft }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </section>

        <aside
          className="rounded-2xl border p-4"
          style={{
            borderColor: borderSoft,
            background: panelBackground,
          }}
        >
          <h2
            className="text-sm font-semibold uppercase tracking-[0.18em]"
            style={{ color: "var(--agent-primary)" }}
          >
            Active Agent Tools
          </h2>

          <ul className="mt-3 space-y-3 text-sm">
            <li
              className="rounded-xl border p-3"
              style={{ borderColor: borderSoft, background: cardBackground }}
            >
              <p className="font-semibold">maps_to(page_name)</p>
              <p className="mt-1 text-xs" style={{ color: subtleTextColor }}>
                Auto-route users to Generative AI, AI Agents, or Analytical AI.
              </p>
            </li>
            <li
              className="rounded-xl border p-3"
              style={{ borderColor: borderSoft, background: cardBackground }}
            >
              <p className="font-semibold">send_email(recipient, body)</p>
              <p className="mt-1 text-xs" style={{ color: subtleTextColor }}>
                Sends email via backend Resend endpoint after your confirmation.
              </p>
            </li>
            <li
              className="rounded-xl border p-3"
              style={{ borderColor: borderSoft, background: cardBackground }}
            >
              <p className="font-semibold">
                update_site_style(property, value)
              </p>
              <p className="mt-1 text-xs" style={{ color: subtleTextColor }}>
                Live UI updates scoped to this page and current browser session
                only.
              </p>
            </li>
          </ul>

          <div
            className="mt-4 rounded-xl border p-3 text-xs"
            style={{ borderColor: borderSoft, background: cardBackground }}
          >
            <p className="font-semibold">Current style state</p>
            <p className="mt-2">Theme: {styleState.theme}</p>
            <p>Primary color: {styleState.primaryColor}</p>
            <p>Font scale: {styleState.fontScale.toFixed(2)}x</p>
          </div>

          <div
            className="mt-4 rounded-xl border p-3"
            style={{ borderColor: borderSoft, background: cardBackground }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em]">
              Agent Execution Timeline
            </p>

            <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1 text-xs">
              {recentLogs.length === 0 ? (
                <p style={{ color: subtleTextColor }}>
                  Waiting for the first AI action...
                </p>
              ) : (
                recentLogs.map((log) => {
                  const statusStyle =
                    log.status === "success"
                      ? {
                          borderColor: "rgba(16,185,129,0.45)",
                          color: isLightTheme ? "#065f46" : "#6ee7b7",
                          background: isLightTheme
                            ? "rgba(16,185,129,0.12)"
                            : "rgba(16,185,129,0.1)",
                        }
                      : log.status === "pending"
                        ? {
                            borderColor: "rgba(245,158,11,0.45)",
                            color: isLightTheme ? "#92400e" : "#fcd34d",
                            background: isLightTheme
                              ? "rgba(245,158,11,0.12)"
                              : "rgba(245,158,11,0.1)",
                          }
                        : log.status === "cancelled"
                          ? {
                              borderColor: "rgba(100,116,139,0.45)",
                              color: isLightTheme ? "#334155" : "#cbd5e1",
                              background: isLightTheme
                                ? "rgba(148,163,184,0.12)"
                                : "rgba(100,116,139,0.12)",
                            }
                          : {
                              borderColor: "rgba(239,68,68,0.45)",
                              color: isLightTheme ? "#991b1b" : "#fda4af",
                              background: isLightTheme
                                ? "rgba(239,68,68,0.1)"
                                : "rgba(239,68,68,0.08)",
                            };

                  return (
                    <article
                      key={log.id}
                      className="rounded-lg border p-2"
                      style={statusStyle}
                    >
                      <p className="font-semibold">{log.title}</p>
                      <p className="mt-1 leading-relaxed">{log.detail}</p>
                      <p className="mt-1 opacity-80">
                        {new Date(log.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </article>
                  );
                })
              )}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
