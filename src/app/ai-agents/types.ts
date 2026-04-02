export type AgentRole = "user" | "assistant" | "system";

export interface AgentUIMessage {
  id: string;
  role: AgentRole;
  content: string;
  createdAt: number;
}

export type AgentToolName = "maps_to" | "send_email" | "update_site_style";

export interface MapsToArgs {
  page_name: string;
}

export interface SendEmailArgs {
  recipient: string;
  body: string;
}

export interface UpdateSiteStyleArgs {
  property: string;
  value: string;
}

export type AgentToolArgs = MapsToArgs | SendEmailArgs | UpdateSiteStyleArgs;

export interface AgentToolCall {
  id: string;
  name: AgentToolName;
  arguments: AgentToolArgs;
}

export interface AgentChatApiResponse {
  ok: boolean;
  message?: string;
  assistantMessage?: string;
  toolCalls?: AgentToolCall[];
}
