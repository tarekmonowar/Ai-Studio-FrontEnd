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
    <main className="bg-app px-4 pb-32 pt-3 text-slate-100 sm:px-8 lg:px-10">
      {/* ─── Page Header ─────────────────────────────────────────────── */}
      <div className="mx-auto w-full max-w-6xl mb-5 space-y-4">
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-2">
            Real-Time Voice{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-400">
              Interview Prep
            </span>
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
            Practice interviews with an AI voice assistant powered by MCP —
            questions are served from a structured question bank, tracked in
            real time, and auto-switched when you change topics.
          </p>
        </div>

        {/* ── Capability Info Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {CAPABILITY_CARDS.map((card) => (
            <div
              key={card.title}
              className={`rounded-xl border ${card.borderColor} bg-gradient-to-br ${card.color} p-4 backdrop-blur`}
            >
              <card.icon className={`h-5 w-5 ${card.iconColor} mb-2`} />
              <p className="text-sm font-semibold text-slate-200">
                {card.title}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">{card.desc}</p>
            </div>
          ))}
        </div>

        {/* ── Pipeline Flow Indicator ── */}
        <div className="flex items-center justify-center gap-2 py-1 text-xs text-slate-500 flex-wrap">
          {PIPELINE_STEPS.map((step, i) => (
            <span key={step.label} className="contents">
              {i > 0 && <ArrowRight className="h-3.5 w-3.5" />}
              <span className={`flex items-center gap-1 ${step.color}`}>
                <step.icon className="h-3.5 w-3.5" />
                {step.label}
              </span>
            </span>
          ))}
        </div>

        {/* ── How MCP Works ── */}
        <div className="mx-auto max-w-2xl rounded-xl border border-slate-700/60 bg-slate-800/30 p-4 space-y-2">
          <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            How MCP powers this
          </p>
          <ol className="text-xs text-slate-400 space-y-1.5 list-decimal list-inside">
            <li>
              MCP Server loads all interview questions from the{" "}
              <code className="text-cyan-400 bg-cyan-950/40 px-1 rounded">
                question bank
              </code>
            </li>
            <li>
              Client calls{" "}
              <code className="text-cyan-400 bg-cyan-950/40 px-1 rounded">
                buildInterviewContext
              </code>{" "}
              tool to build AI instructions
            </li>
            <li>
              <code className="text-cyan-400 bg-cyan-950/40 px-1 rounded">
                extractAskedQuestionIds
              </code>{" "}
              tracks which questions are already asked
            </li>
            <li>
              <code className="text-cyan-400 bg-cyan-950/40 px-1 rounded">
                detectTopicSelection
              </code>{" "}
              auto-switches when you pick a new technology
            </li>
          </ol>
        </div>
      </div>

      {/* ─── Main Content Grid ───────────────────────────────────────── */}
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        {/* ─── Left Column: Orb, Controls, Error ─────────────────────── */}
        <section className="rounded-3xl border border-cyan-400/20 bg-slate-900/65 p-3 shadow-2xl shadow-cyan-950/20 backdrop-blur md:p-5">
          {/* Section title */}
          <div className="mb-4 xl:mb-5">
            <h2 className="mt-2 xl:mt-3 text-xl font-semibold text-slate-100 md:text-2xl">
              {panel.appliedInstructionMode === "english-learning"
                ? "English Speaking Practice with"
                : "Interview Prep Practice with"}{" "}
              <span className="font-bold text-fuchsia-600">
                {" "}
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
