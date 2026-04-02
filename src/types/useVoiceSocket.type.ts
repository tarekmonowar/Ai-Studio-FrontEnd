import type {
  InstructionMode,
  ServerEvent,
  SpeakerProfile,
} from "@/types/voice";

export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export interface UseVoiceSocketOptions {
  onAudioChunk: (chunk: ArrayBuffer) => void;
  onServerEvent: (event: ServerEvent) => void;
}

export interface UseVoiceSocketResult {
  status: ConnectionStatus;
  error: string | null;
  connect: (
    instructionMode?: InstructionMode,
    speakerProfile?: SpeakerProfile,
  ) => Promise<void>;
  disconnect: () => void;
  sendAudioChunk: (chunk: ArrayBuffer) => void;
  cancelAssistant: () => void;
  requestResponse: () => void;
}
