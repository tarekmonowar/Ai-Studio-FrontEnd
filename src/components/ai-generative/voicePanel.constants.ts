import type { AssistantState, InstructionMode, SpeakerProfile, TranscriptItem } from "@/types/voice";

// ─── Session Constants ───────────────────────────────────────────────────────

export const MAX_TRANSCRIPTS = 8;
export const DEFAULT_INSTRUCTION_MODE: InstructionMode = "interview-prep";
export const DEFAULT_SPEAKER_PROFILE: SpeakerProfile = "muntaha";

// ─── Phase Labels ────────────────────────────────────────────────────────────

/**
 * Maps backend phase identifiers to the human-readable labels shown in the UI.
 * The backend sends these keys in "phase.update" events.
 */
export const BACKEND_PHASE_LABELS: Record<string, string> = {
  "interview-prep": "Opening",
  "english-learning": "Language coaching",
  "interpersonal": "Interpersonal round",
  "technical-general": "Technical round",
  "HTML": "HTML round",
  "CSS": "CSS round",
  "JavaScript": "JavaScript round",
  "TypeScript": "TypeScript round",
  "React": "React round",
  "Next.js": "Next.js round",
  "Node.js": "Node.js round",
  "Express.js": "Express.js round",
  "MongoDB": "MongoDB round",
  "PostgreSQL": "PostgreSQL round",
  "Docker": "Docker round",
  "Redux": "Redux round",
  "default": "Interview round",
};

/** Returns the human-readable label for a backend phase key. */
export function resolvePhaseLabel(backendPhase: string): string {
  return BACKEND_PHASE_LABELS[backendPhase] ?? "Interview round";
}

// ─── Time Formatters ─────────────────────────────────────────────────────────

/** Formats a duration in seconds as MM:SS (e.g. 125 → "02:05"). */
export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

/**
 * Returns a formatted remaining time string for the session timer display.
 * Shows "00:00" before a session starts, and "Limit reached" when time is up.
 */
export function formatRemainingDuration(
  totalSeconds: number | null,
  hasStartedSession: boolean,
): string {
  if (!hasStartedSession) {
    return "00:00";
  }
  if (totalSeconds === null || totalSeconds <= 0) {
    return "Limit reached";
  }
  return formatDuration(totalSeconds);
}

// ─── Status Labels ───────────────────────────────────────────────────────────

/**
 * Builds a map of AssistantState values to human-readable status badge labels.
 * The assistant name is dynamic (Omi or Ava) based on the instruction mode.
 */
export function getStatusLabels(
  assistantName: string,
): Record<AssistantState, string> {
  return {
    "idle": "Idle",
    "connecting": "Connecting",
    "listening": "Listening",
    "user-speaking": "You are speaking",
    "thinking": `${assistantName} is thinking`,
    "assistant-speaking": `${assistantName} is speaking`,
    "error": "Connection issue",
    "disconnected": "Disconnected",
  };
}

// ─── Transcript List Helper ──────────────────────────────────────────────────

/**
 * Appends a new transcript item to the existing list.
 * Automatically trims to MAX_TRANSCRIPTS so old items are removed from the top.
 */
export function nextTranscript(
  items: TranscriptItem[],
  item: TranscriptItem,
): TranscriptItem[] {
  const merged = [...items, item];
  if (merged.length <= MAX_TRANSCRIPTS) {
    return merged;
  }
  return merged.slice(merged.length - MAX_TRANSCRIPTS);
}
