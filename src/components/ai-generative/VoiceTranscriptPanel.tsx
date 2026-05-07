import type { RefObject } from "react";
import type { TranscriptItem } from "@/types/voice";

interface VoiceTranscriptPanelProps {
  transcripts: TranscriptItem[];
  assistantName: string;
  transcriptEndRef: RefObject<HTMLDivElement>;
}

/**
 * Renders the live conversation transcript as a scrollable chat bubble list.
 * User messages appear on the right, assistant messages on the left.
 */
export function VoiceTranscriptPanel({
  transcripts,
  assistantName,
  transcriptEndRef,
}: VoiceTranscriptPanelProps) {
  return (
    <section className="flex min-h-[280px]  flex-1 flex-col rounded-xl sm:rounded-xl border border-cyan-400/20 bg-slate-900/60 p-2 backdrop-blur sm:p-3 md:p-4 ">
      <div className="mt-1 min-h-0 flex-1 space-y-2 sm:space-y-3 overflow-y-auto pr-1 voice-transcript-scroll">
        {transcripts.length === 0 ? (
          <div className="rounded-xl sm:rounded-2xl border border-dashed border-slate-700 bg-slate-950/55 p-3 sm:p-4 text-xs sm:text-sm text-slate-400">
            Start a conversation to see the live transcript.
          </div>
        ) : (
          transcripts.map((item) => (
            <div
              key={item.id}
              className={`flex w-full mb-2 sm:mb-4 ${
                item.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[80%] rounded-xl sm:rounded-2xl p-2.5 sm:p-3 text-xs sm:text-sm leading-relaxed shadow-sm ${
                  item.role === "user"
                    ? "border border-cyan-500/30 bg-purple-500/30 text-cyan-100 rounded-tr-none"
                    : "border border-emerald-500/25 bg-emerald-500/10 text-emerald-100 rounded-tl-none"
                }`}
              >
                <p
                  className={`mb-0.5 sm:mb-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.1em] opacity-60 ${
                    item.role === "user" ? "text-right" : "text-left"
                  }`}
                >
                  {item.role === "user" ? "Monowar" : assistantName}
                </p>
                <p className="whitespace-pre-wrap">{item.text}</p>
              </div>
            </div>
          ))
        )}
        <div ref={transcriptEndRef} />
      </div>
    </section>
  );
}
