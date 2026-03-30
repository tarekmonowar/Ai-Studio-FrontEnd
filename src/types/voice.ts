export type AssistantState =
  | "idle"
  | "connecting"
  | "listening"
  | "user-speaking"
  | "thinking"
  | "assistant-speaking"
  | "error"
  | "disconnected";

export type InstructionMode = "interview-prep" | "english-learning";
export type SpeakerProfile = "monowar" | "muntaha";

export type TranscriptRole = "user" | "assistant";

export interface TranscriptItem {
  id: string;
  role: TranscriptRole;
  text: string;
}

export type ServerEvent =
  | { type: "session.connecting" }
  | {
      type: "session.ready";
      sessionId: string;
      rateLimitRemainingSeconds?: number;
    }
  | { type: "session.closed" }
  | { type: "assistant.thinking" }
  | { type: "assistant.speaking" }
  | { type: "assistant.done" }
  | { type: "assistant.cancelled" }
  | { type: "transcript.user"; text: string }
  | { type: "transcript.assistant"; text: string }
  | { type: "vad.server.speech_started" }
  | { type: "vad.server.speech_stopped" }
  | { type: "phase.update"; phase: string }
  | { type: "pong" }
  | { type: "error"; message: string; code?: string; hint?: string };
