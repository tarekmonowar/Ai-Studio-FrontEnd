import type {
  AgentToolCall,
  AgentUIMessage,
  MapsToArgs,
  SendEmailArgs,
  UpdateSiteStyleArgs,
} from "@/types/AiAgent.type";

// ─── Message Helpers ─────────────────────────────────────────────────────────

/**
 * Appends a new message to the chat message list.
 * Each message gets a unique ID and a creation timestamp.
 */
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

/**
 * Converts the current chat history + the new user input into
 * the request message array expected by the /ai/agent-chat endpoint.
 * Only includes user and assistant turns (no system messages).
 */
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

// ─── Route Resolver ───────────────────────────────────────────────────────────

/**
 * Resolves a page name string from the AI (e.g. "generative ai") into
 * the actual Next.js route path (e.g. "/").
 * Returns null if the page name cannot be matched.
 */
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

// ─── Tool Call Display Helpers ────────────────────────────────────────────────

/**
 * Builds a short human-readable preview of a tool call for the chat panel.
 * Example: "Recipient: user@example.com | Body: Hello..."
 */
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

/**
 * Builds a function signature string for the pipeline monitor log.
 * Example: `maps_to(page_name="analytical-ai")`
 */
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
