import { Radio, ShieldCheck } from "lucide-react";
import type { AssistantState } from "@/types/voice";
import { VoiceWave } from "./VoiceWave";

interface VoiceOrbDisplayProps {
  assistantState: AssistantState;
  combinedLevel: number;
  statusLabel: string;
  isSecureContext: boolean;
}

/**
 * Renders the animated voice orb, the sound wave visualization,
 * and the status badge below the orb.
 */
export function VoiceOrbDisplay({
  assistantState,
  combinedLevel,
  statusLabel,
  isSecureContext,
}: VoiceOrbDisplayProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-slate-950/70 p-2 md:p-3">
      {/* Top bar: real-time voice indicator + secure context badge */}
      <div className="mb-4 pt-1 flex items-center justify-between text-xs uppercase tracking-[0.14em] text-cyan-200/90">
        <span className="flex items-center gap-2">
          <Radio className="h-4 w-4" />
          Real-time voice
        </span>
        <span className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" />
          {isSecureContext ? "Secure" : "HTTPS required"}
        </span>
      </div>

      {/* Animated orb */}
      <div className="voice-orb-frame">
        <div
          className={`voice-orb ${
            assistantState === "thinking"
              ? "voice-orb-thinking"
              : assistantState === "assistant-speaking"
                ? "voice-orb-speaking"
                : "voice-orb-listening"
          }`}
        />
        <div className="voice-wave-layer">
          <VoiceWave level={combinedLevel} state={assistantState} />
        </div>
      </div>

      {/* Status badge */}
      <div className="mt-3 flex justify-center">
        <div className="inline-flex items-center gap-2 rounded-md border border-[rgba(51,65,85,0.85)] bg-[rgba(2,6,23,0.72)] px-4 py-1 text-sm font-medium tracking-[0.16em]">
          {statusLabel}
          <span className="relative flex w-2 h-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75 animate-ping"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
        </div>
      </div>
    </div>
  );
}
