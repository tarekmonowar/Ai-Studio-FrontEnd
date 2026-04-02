export interface UseMicrophoneVadOptions {
  isActive: boolean;
  vadThreshold?: number;
  silenceMs?: number;
  onPcmChunk: (chunk: ArrayBuffer) => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
}

export interface UseMicrophoneVadResult {
  level: number;
  speaking: boolean;
  error: string | null;
  isSecureContext: boolean;
}
