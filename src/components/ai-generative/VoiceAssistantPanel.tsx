"use client";

import {
  Mic,
  Server,
  Brain,
  MessageSquare,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useVoicePanel } from "./useVoicePanel";
import { VoiceControls } from "./VoiceControls";
import { VoiceOrbDisplay } from "./VoiceOrbDisplay";
import { VoiceSessionStats } from "./VoiceSessionStats";
import { VoiceTranscriptPanel } from "./VoiceTranscriptPanel";

const CAPABILITY_CARDS = [
  {
    icon: Server,
    title: "MCP Question Bank",
    desc: "Interview Qs via MCP protocol",
    color: "from-cyan-500/20 to-sky-500/10",
    iconColor: "text-cyan-400",
    borderColor: "border-cyan-500/20",
  },
  {
    icon: Mic,
    title: "Real-Time Voice",
    desc: "Azure VoiceLive streaming",
    color: "from-fuchsia-500/20 to-purple-500/10",
    iconColor: "text-fuchsia-400",
    borderColor: "border-fuchsia-500/20",
  },
  {
    icon: Brain,
    title: "Smart Topic Flow",
    desc: "Auto-tracks & switches topics",
    color: "from-amber-500/20 to-orange-500/10",
    iconColor: "text-amber-400",
    borderColor: "border-amber-500/20",
  },
  {
    icon: MessageSquare,
    title: "Live Transcript",
    desc: "Real-time speech-to-text",
    color: "from-emerald-500/20 to-teal-500/10",
    iconColor: "text-emerald-400",
    borderColor: "border-emerald-500/20",
  },
] as const;

const PIPELINE_STEPS = [
  { icon: Mic, label: "Voice Input", color: "text-cyan-400" },
  { icon: Server, label: "MCP Server", color: "text-fuchsia-400" },
  { icon: Brain, label: "Question Context", color: "text-amber-400" },
  { icon: Sparkles, label: "AI Voice Response", color: "text-emerald-400" },
] as const;

export function VoiceAssistantPanel() {
  const panel = useVoicePanel();

  return (
    <main className="bg-app px-3 pb-28 pt-3 text-slate-100 sm:px-6 md:px-8 lg:px-10 sm:pb-32">
      {/* ─── Page Header ─────────────────────────────────────────────── */}
      <div className="mx-auto w-full max-w-6xl mb-4 space-y-3 sm:mb-5 sm:space-y-4">
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-100 mb-1.5 sm:mb-2">
            Real-Time Voice{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-400">
              Interview Prep
            </span>
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Practice interviews with an AI voice assistant powered by MCP —
            questions are served from a structured question bank and
            auto-switched when you change topics.
          </p>
        </div>

        {/* ── Capability Info Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {CAPABILITY_CARDS.map((card) => (
            <div
              key={card.title}
              className={`rounded-xl border ${card.borderColor} bg-gradient-to-br ${card.color} p-3 sm:p-4 backdrop-blur`}
            >
              <card.icon
                className={`h-4 w-4 sm:h-5 sm:w-5 ${card.iconColor} mb-1.5 sm:mb-2`}
              />
              <p className="text-xs sm:text-sm font-semibold text-slate-200">
                {card.title}
              </p>
              <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">
                {card.desc}
              </p>
            </div>
          ))}
        </div>

        {/* ── Pipeline Flow Indicator ── */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 py-1 text-[10px] sm:text-xs text-slate-500 flex-wrap">
          {PIPELINE_STEPS.map((step, i) => (
            <span key={step.label} className="contents">
              {i > 0 && <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
              <span className={`flex items-center gap-1 ${step.color}`}>
                <step.icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                {step.label}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* ─── Main Content Grid ───────────────────────────────────────── */}
      <div className="mx-auto grid w-full max-w-6xl gap-4 sm:gap-5 lg:gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        {/* ─── Left Column: Orb, Controls, Error ─────────────────────── */}
        <section className="rounded-xl border border-cyan-400/20 bg-slate-900/65 p-3 shadow-2xl shadow-cyan-950/20 backdrop-blur sm:p-4 md:p-5">
          {/* Section title */}
          <div className="mb-3 sm:mb-4 xl:mb-5">
            <h2 className="text-base sm:text-lg md:text-xl xl:text-2xl font-semibold text-slate-100">
              {panel.appliedInstructionMode === "english-learning"
                ? "English Speaking Practice with"
                : "Interview Prep Practice with"}{" "}
              <span className="font-bold text-fuchsia-600">
                {panel.assistantName}.
              </span>
            </h2>
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
            <p className="mt-3 sm:mt-4 rounded-xl border border-rose-400/40 bg-rose-950/35 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-rose-200">
              <span className="font-semibold">Connection error:</span>{" "}
              {panel.displayedError}
            </p>
          ) : null}
        </section>

        {/* ─── Right Column: Stats + Transcript ──────────────────────── */}
        <aside className="flex flex-col gap-3 sm:gap-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:self-start">
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
