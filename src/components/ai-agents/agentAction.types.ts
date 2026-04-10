/**
 * Status values for individual AI agent action log entries.
 * - "pending"  — action has been triggered, waiting for result
 * - "success"  — action completed successfully
 * - "error"    — action failed
 */
export type AgentActionStatus = "pending" | "success" | "error";

/**
 * A single entry in the AI pipeline activity log.
 * Displayed in real-time in the pipeline monitor panel.
 */
export interface AgentActionLog {
  id: string;
  title: string;
  detail: string;
  status: AgentActionStatus;
  createdAt: number;
}
