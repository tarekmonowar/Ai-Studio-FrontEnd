"use client";

import { useVoicePanel } from "./useVoicePanel";
import { VoiceControls } from "./VoiceControls";
import { VoiceOrbDisplay } from "./VoiceOrbDisplay";
import { VoiceSessionStats } from "./VoiceSessionStats";
import { VoiceTranscriptPanel } from "./VoiceTranscriptPanel";

/**
 * VoiceAssistantPanel — the top-level layout component for the voice feature.
 *
 * All state and logic lives in `useVoicePanel`.
 * All visual sections are in their own focused sub-components.
 * This component only wires them together.
 */
export function VoiceAssistantPanel() {
  const panel = useVoicePanel();

  return (
    <main className="bg-app px-4 py-3 text-slate-100 sm:px-8 lg:px-10 xl:mt-5">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        {/* ─── Left Column: Orb, Controls, Error ─────────────────────── */}
        <section className="rounded-3xl border border-cyan-400/20 bg-slate-900/65 p-3 shadow-2xl shadow-cyan-950/20 backdrop-blur md:p-5">
          {/* Page title */}
          <div className="mb-4 xl:mb-5">
            <h1 className="mt-2 xl:mt-3 text-xl font-semibold text-slate-100 md:text-2xl">
              {panel.appliedInstructionMode === "english-learning"
                ? "English Speaking Practice with"
                : "Interview Prep Practice with"}{" "}
              <span className="font-bold text-fuchsia-600">
                {" "}
                {panel.assistantName}.
              </span>
            </h1>
          </div>

          {/* Animated voice orb + status badge */}
          <VoiceOrbDisplay
            assistantState={panel.assistantState}
            combinedLevel={panel.combinedLevel}
            statusLabel={panel.statusLabels[panel.assistantState]}
            isSecureContext={panel.isSecureContext}
          />

          {/* Session controls */}
          <VoiceControls
            started={panel.started}
            isTogglingConversation={panel.isTogglingConversation}
            selectedSpeakerProfile={panel.selectedSpeakerProfile}
            selectedInstructionMode={panel.selectedInstructionMode}
            hasPendingInstructionChange={panel.hasPendingInstructionChange}
            onToggle={() => void panel.toggleConversation()}
            onSelectSpeaker={panel.setSelectedSpeakerProfile}
            onSelectMode={panel.setSelectedInstructionMode}
            onApplyChange={() => void panel.applyInstructionChange()}
          />

          {/* Error message */}
          {panel.displayedError ? (
            <p className="mt-4 rounded-xl border border-rose-400/40 bg-rose-950/35 px-4 py-3 text-sm text-rose-200">
              <span className="font-semibold">Connection error:</span>{" "}
              {panel.displayedError}
            </p>
          ) : null}
        </section>

        {/* ─── Right Column: Stats + Transcript ──────────────────────── */}
        <aside className="flex flex-col gap-3 lg:max-h-[calc(100vh-4rem)] lg:min-h-[620px]">
          {/* Session stats and developer profile */}
          <VoiceSessionStats
            interviewPhaseLabel={panel.interviewPhaseLabel}
            remainingSeconds={panel.remainingSeconds}
            started={panel.started}
            remainingTimeTextClass={panel.remainingTimeTextClass}
            assistantQuestionCount={panel.assistantQuestionCount}
            userResponseCount={panel.userResponseCount}
          />

          {/* Live conversation transcript */}
          <VoiceTranscriptPanel
            transcripts={panel.transcripts}
            assistantName={panel.assistantName}
            transcriptEndRef={panel.transcriptEndRef}
          />
        </aside>
      </div>
    </main>
  );
}
