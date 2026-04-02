import type {
  AgentToolCall,
  AgentUIMessage,
  MapsToArgs,
  SendEmailArgs,
  UpdateSiteStyleArgs,
} from "@/types/AiAgent.type";

export interface AgentStyleState {
  theme: "dark" | "light";
  primaryColor: string;
  fontScale: number;
  backgroundColor: string;
  chatBackgroundColor: string;
}

export type AgentActionStatus = "pending" | "success" | "error";

export interface AgentActionLog {
  id: string;
  title: string;
  detail: string;
  status: AgentActionStatus;
  createdAt: number;
}

export interface SpeechRecognitionAlternative {
  transcript: string;
}

export interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
}

export interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

export interface SpeechRecognitionEventLike extends Event {
  results: SpeechRecognitionResultList;
}

export interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
}

export interface SpeechRecognitionLike {
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

export const DEFAULT_STYLE: AgentStyleState = {
  theme: "dark",
  primaryColor: "#22d3ee",
  fontScale: 1,
  backgroundColor: "",
  chatBackgroundColor: "",
};

export function pushMessage(
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

export function resolveRouteFromPageName(pageName: string): string | null {
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

export function applyStyleUpdate(
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

  if (property.includes("background") || property.includes("bg")) {
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

export function toAgentRequestMessages(
  messages: AgentUIMessage[],
  nextInput: string,
) {
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

export function buildToolCallPreview(toolCall: AgentToolCall): string {
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

export function buildToolCallSignature(toolCall: AgentToolCall): string {
  if (toolCall.name === "maps_to") {
    const args = toolCall.arguments as MapsToArgs;
    return `maps_to(page_name="${args.page_name}")`;
  }

  if (toolCall.name === "send_email") {
    const args = toolCall.arguments as SendEmailArgs;
    return `send_email(recipient="${args.recipient}", body="${args.body}")`;
  }

  const args = toolCall.arguments as UpdateSiteStyleArgs;
  return `update_site_style(property="${args.property}", value="${args.value}")`;
}

export function formatStyleState(state: AgentStyleState): string {
  let result = `Theme: ${state.theme} | Primary color: ${state.primaryColor} | Font scale: ${state.fontScale.toFixed(2)}x`;
  if (state.backgroundColor) result += ` | Page BG: ${state.backgroundColor}`;
  if (state.chatBackgroundColor)
    result += ` | Chat BG: ${state.chatBackgroundColor}`;
  return result;
}
