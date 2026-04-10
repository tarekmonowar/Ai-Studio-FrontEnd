import type { UpdateSiteStyleArgs } from "@/types/AiAgent.type";

// ─── Style State ─────────────────────────────────────────────────────────────

/** The current visual customization state for the AI Agents page. */
export interface AgentStyleState {
  theme: "dark" | "light";
  primaryColor: string;
  fontScale: number;
  backgroundColor: string;
  chatBackgroundColor: string;
}

/** Default style values applied on first load and after a style reset. */
export const DEFAULT_STYLE: AgentStyleState = {
  theme: "dark",
  primaryColor: "#22d3ee",
  fontScale: 1,
  backgroundColor: "",
  chatBackgroundColor: "",
};

// ─── Color Validation ─────────────────────────────────────────────────────────

/** Returns true if the string is a valid CSS color (named, hex, or functional). */
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

// ─── Font Scale Parsing ───────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Parses a font size string into a numeric scale factor (e.g. "large" → 1.12). */
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

// ─── Style Updater ────────────────────────────────────────────────────────────

/**
 * Applies a single style update from an AI tool call argument.
 * Returns the updated style state and a human-readable summary for the chat.
 *
 * Supported properties: theme, background_color, chatbot_background_color,
 * primary_color, font_size.
 */
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
        next: { ...current, theme: "light" },
        summary: "Applied light theme on the entire AI Agents page.",
      };
    }
    if (themeValue.includes("dark") || themeValue.includes("night")) {
      return {
        next: { ...current, theme: "dark" },
        summary: "Applied dark theme on the entire AI Agents page.",
      };
    }
    return { next: current, summary: `Could not parse theme value: ${value}` };
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
      next: { ...current, chatBackgroundColor: value },
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
      next: { ...current, backgroundColor: value },
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
      next: { ...current, primaryColor: value },
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
      next: { ...current, fontScale },
      summary: `Adjusted font scale to ${fontScale.toFixed(2)}x.`,
    };
  }

  return {
    next: current,
    summary: `No supported style property matched: ${args.property}`,
  };
}

/** Formats the current style state as a human-readable summary string. */
export function formatStyleState(state: AgentStyleState): string {
  let result = `Theme: ${state.theme} | Primary color: ${state.primaryColor} | Font scale: ${state.fontScale.toFixed(2)}x`;
  if (state.backgroundColor) result += ` | Page BG: ${state.backgroundColor}`;
  if (state.chatBackgroundColor) result += ` | Chat BG: ${state.chatBackgroundColor}`;
  return result;
}
