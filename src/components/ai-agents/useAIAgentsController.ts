import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveBackendHttpUrl } from "@/config/runtime";
import type {
  AgentChatApiResponse,
  AgentToolCall,
  AgentUIMessage,
  MapsToArgs,
  SendEmailArgs,
  UpdateSiteStyleArgs,
} from "@/types/AiAgent.type";
import {
  applyStyleUpdate,
  buildToolCallPreview,
  buildToolCallSignature,
  DEFAULT_STYLE,
  formatStyleState,
  pushMessage,
  resolveRouteFromPageName,
  toAgentRequestMessages,
  type AgentActionLog,
  type AgentActionStatus,
  type AgentStyleState,
  type SpeechRecognitionLike,
} from "./logic";

export function useAIAgentsController() {
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
  const chatEndRef = useRef<HTMLDivElement>(null);
  const monitorScrollRef = useRef<HTMLDivElement>(null);

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

  const resetStyles = useCallback(() => {
    setStyleState(DEFAULT_STYLE);
    appendActionLog(
      "Style Reset",
      `UI style reset. ${formatStyleState(DEFAULT_STYLE)}`,
      "success",
    );
  }, [appendActionLog]);

  const isLightTheme = useMemo(
    () => styleState.theme === "light",
    [styleState.theme],
  );

  return {
    messages,
    inputValue,
    isThinking,
    errorMessage,
    styleState,
    actionLogs,
    isSpeechSupported,
    isListening,
    micError,
    chatEndRef,
    monitorScrollRef,
    setInputValue,
    sendPrompt,
    toggleMic,
    resetStyles,
    isLightTheme,
  };
}
