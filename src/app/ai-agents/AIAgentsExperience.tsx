"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";
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
