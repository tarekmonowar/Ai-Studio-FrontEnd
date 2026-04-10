import { Mic, MicOff } from "lucide-react";
import type { InstructionMode, SpeakerProfile } from "@/types/voice";

interface VoiceControlsProps {
  started: boolean;
  isTogglingConversation: boolean;
  selectedSpeakerProfile: SpeakerProfile;
  selectedInstructionMode: InstructionMode;
  hasPendingInstructionChange: boolean;
  onToggle: () => void;
  onSelectSpeaker: (profile: SpeakerProfile) => void;
  onSelectMode: (mode: InstructionMode) => void;
  onApplyChange: () => void;
}

/**
 * Renders the session controls: Start/Stop button, speaker profile toggle,
 * instruction mode toggle, and the Apply Change button.
 */
export function VoiceControls({
  started,
  isTogglingConversation,
  selectedSpeakerProfile,
  selectedInstructionMode,
  hasPendingInstructionChange,
  onToggle,
  onSelectSpeaker,
  onSelectMode,
  onApplyChange,
}: VoiceControlsProps) {
  return (
    <div className="mt-4 xl:mt-5 flex flex-col gap-3">
      {/* Start / Stop button */}
      <div className="flex justify-center">
        <button
          onClick={onToggle}
          disabled={isTogglingConversation}
          className="inline-flex min-w-[130px] justify-center items-center gap-2 rounded-full border border-cyan-300/50 bg-cyan-400/15 px-4 py-2 text-md font-bold tracking-[0.12em] text-cyan-100 transition hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {started ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          {started ? "Stop" : "Start"}
        </button>
      </div>

      {/* Speaker profile: Male / Female */}
      <div className="flex mt-3 justify-center">
        <div className="inline-flex overflow-hidden rounded-full border border-slate-700/80 bg-slate-900/70 p-1 text-xs tracking-[0.11em]">
          <button
            onClick={() => onSelectSpeaker("monowar")}
            className={`rounded-full px-3 py-2 transition ${
              selectedSpeakerProfile === "monowar"
                ? "bg-cyan-400/20 text-cyan-100"
                : "text-slate-300 hover:text-slate-100"
            }`}
          >
            Male
          </button>
          <button
            onClick={() => onSelectSpeaker("muntaha")}
            className={`rounded-full px-3 py-2 transition ${
              selectedSpeakerProfile === "muntaha"
                ? "bg-cyan-400/20 text-cyan-100"
                : "text-slate-300 hover:text-slate-100"
            }`}
          >
            Female
          </button>
        </div>
      </div>

      {/* Instruction mode: Interview Prep / Learning English */}
      <div className="flex justify-center">
        <div className="inline-flex overflow-hidden rounded-full border border-slate-700/80 bg-slate-900/70 p-1 text-xs tracking-[0.11em]">
          <button
            onClick={() => onSelectMode("interview-prep")}
            className={`rounded-full px-3 py-2 transition ${
              selectedInstructionMode === "interview-prep"
                ? "bg-cyan-400/20 text-cyan-100"
                : "text-slate-300 hover:text-slate-100"
            }`}
          >
            Interview Prep
          </button>
          <button
            onClick={() => onSelectMode("english-learning")}
            className={`rounded-full px-3 py-2 transition ${
              selectedInstructionMode === "english-learning"
                ? "bg-cyan-400/20 text-cyan-100"
                : "text-slate-300 hover:text-slate-100"
            }`}
          >
            Learning English
          </button>
        </div>
      </div>

      {/* Apply Change button — only active when there is a pending change */}
      <div className="flex justify-end">
        <button
          onClick={onApplyChange}
          disabled={!hasPendingInstructionChange}
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold tracking-[0.12em] transition disabled:cursor-not-allowed disabled:opacity-50 ${
            hasPendingInstructionChange
              ? "border-cyan-300/50 bg-cyan-400/15 text-cyan-100 hover:bg-cyan-300/20"
              : "border-slate-500/70 bg-slate-950/70 text-slate-100"
          }`}
        >
          Apply Change
        </button>
      </div>
    </div>
  );
}
