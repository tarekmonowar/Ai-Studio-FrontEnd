"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";
import {
  Bot,
  Mail,
  Paintbrush,
  Navigation,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { AIAgentsChatPanel } from "@/components/ai-agents/AIAgentsChatPanel";
import { AIPipelineMonitor } from "@/components/ai-agents/AIPipelineMonitor";
import { HowToUseDemo } from "@/components/ai-agents/HowToUseDemo";
import { useAIAgentsController } from "@/components/ai-agents/useAIAgentsController";

export function AIAgentsExperience() {
  const {
    messages,
    inputValue,
    isThinking,
    errorMessage,
    styleState,
    actionLogs,
    isSpeechSupported,
    isListening,
    micError,
    chatEndRef,
    monitorScrollRef,
    setInputValue,
    sendPrompt,
    toggleMic,
    resetStyles,
    isLightTheme,
  } = useAIAgentsController();

  const wrapperStyle = useMemo(() => {
    const defaultBg = isLightTheme
      ? "radial-gradient(circle at 10% 8%, #ffffff 0%, #f0f7ff 35%, #e2edf8 100%)"
      : "radial-gradient(circle at 14% 4%, #10203f 0%, #06122a 35%, #020617 100%)";

    const style: CSSProperties = {
      "--agent-primary": styleState.primaryColor,
      "--agent-font-scale": styleState.fontScale.toString(),
      "background": styleState.backgroundColor || defaultBg,
      "color": isLightTheme ? "#0f172a" : "#e2e8f0",
    } as CSSProperties;

    return style;
  }, [
    isLightTheme,
    styleState.backgroundColor,
    styleState.fontScale,
    styleState.primaryColor,
  ]);

  const shellBackground = isLightTheme
    ? "linear-gradient(145deg, rgba(255,255,255,0.88), rgba(229,239,251,0.8))"
    : "linear-gradient(145deg, rgba(2,6,23,0.84), rgba(12,24,49,0.78))";
  const panelBackground = isLightTheme
    ? "rgba(255,255,255,0.68)"
    : "rgba(3,9,25,0.6)";
  const cardBackground = isLightTheme
    ? "rgba(248,250,252,0.95)"
    : "linear-gradient(145deg, rgba(2,6,23,0.84), rgba(12,24,49,0.78))";
  const subtleTextColor = isLightTheme ? "#334155" : "#cbd5e1";
  const borderSoft = isLightTheme
    ? "rgba(71,85,105,0.3)"
    : "rgba(148,163,184,0.22)";

  return (
    <main
      className="px-4 pb-32 pt-3 transition-colors duration-500 sm:px-8 lg:px-10"
      style={wrapperStyle}
    >
      {/* ── Page Header ── */}
      <div className="mx-auto w-full max-w-6xl mb-4 space-y-4">
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-2">
            Autonomous AI{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-400">
              Agents
            </span>
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
            Chat with an AI agent that autonomously executes server-side
            functions — navigate pages, send real emails, and customize the UI
            through GPT function calling.
          </p>
        </div>

        {/* ── Capability Info Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              icon: Navigation,
              title: "Page Navigation",
              desc: "Route to any page",
              color: "from-cyan-500/20 to-sky-500/10",
              iconColor: "text-cyan-400",
              borderColor: "border-cyan-500/20",
            },
            {
              icon: Mail,
              title: "Email Automation",
              desc: "SMTP via Nodemailer",
              color: "from-fuchsia-500/20 to-purple-500/10",
              iconColor: "text-fuchsia-400",
              borderColor: "border-fuchsia-500/20",
            },
            {
              icon: Paintbrush,
              title: "Live UI Styling",
              desc: "Theme, colors & fonts",
              color: "from-amber-500/20 to-orange-500/10",
              iconColor: "text-amber-400",
              borderColor: "border-amber-500/20",
            },
            {
              icon: Bot,
              title: "Function Calling",
              desc: "Zod-validated tool calls",
              color: "from-emerald-500/20 to-teal-500/10",
              iconColor: "text-emerald-400",
              borderColor: "border-emerald-500/20",
            },
          ].map((card) => (
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
          <span className="flex items-center gap-1 text-cyan-400">
            <Sparkles className="h-3.5 w-3.5" /> User Prompt
          </span>
          <ArrowRight className="h-3.5 w-3.5" />
          <span className="flex items-center gap-1 text-fuchsia-400">
            <Bot className="h-3.5 w-3.5" /> GPT Intent Parsing
          </span>
          <ArrowRight className="h-3.5 w-3.5" />
          <span className="flex items-center gap-1 text-amber-400">
            <Paintbrush className="h-3.5 w-3.5" /> Tool Execution
          </span>
          <ArrowRight className="h-3.5 w-3.5" />
          <span className="flex items-center gap-1 text-emerald-400">
            <Navigation className="h-3.5 w-3.5" /> Live Action
          </span>
        </div>
      </div>
      <div
        className="mx-auto grid w-full max-w-6xl gap-4 rounded-3xl border p-3 shadow-2xl md:p-5 lg:grid-cols-[1.5fr_1fr]"
        style={{
          borderColor: "color-mix(in srgb, var(--agent-primary) 40%, #334155)",
          background: shellBackground,
          height: "calc(100vh - 200px)",
          minHeight: 380,
        }}
      >
        <AIAgentsChatPanel
          messages={messages}
          inputValue={inputValue}
          isThinking={isThinking}
          errorMessage={errorMessage}
          micError={micError}
          isSpeechSupported={isSpeechSupported}
          isListening={isListening}
          isLightTheme={isLightTheme}
          borderSoft={borderSoft}
          panelBackground={panelBackground}
          subtleTextColor={subtleTextColor}
          styleState={styleState}
          chatEndRef={chatEndRef}
          onInputChange={setInputValue}
          onSendPrompt={sendPrompt}
          onToggleMic={toggleMic}
          onResetStyles={resetStyles}
        />

        <aside
          className="flex flex-col gap-3 overflow-hidden rounded-xl"
          style={{
            borderColor: borderSoft,
          }}
        >
          <HowToUseDemo
            isLightTheme={isLightTheme}
            borderSoft={borderSoft}
            cardBackground={cardBackground}
            subtleTextColor={subtleTextColor}
          />
          <AIPipelineMonitor
            isThinking={isThinking}
            actionLogs={actionLogs}
            isLightTheme={isLightTheme}
            borderSoft={borderSoft}
            cardBackground={cardBackground}
            subtleTextColor={subtleTextColor}
            monitorScrollRef={monitorScrollRef}
          />
        </aside>
      </div>
    </main>
  );
}
