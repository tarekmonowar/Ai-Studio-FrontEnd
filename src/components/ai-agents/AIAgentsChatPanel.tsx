import { Mic, MicOff } from "lucide-react";
import type { RefObject } from "react";
import type { AgentUIMessage } from "@/types/AiAgent.type";
import type { AgentStyleState } from "./logic";

interface AIAgentsChatPanelProps {
  messages: AgentUIMessage[];
  inputValue: string;
  isThinking: boolean;
  errorMessage: string | null;
  micError: string | null;
  isSpeechSupported: boolean;
  isListening: boolean;
  isLightTheme: boolean;
  borderSoft: string;
  panelBackground: string;
  subtleTextColor: string;
  styleState: AgentStyleState;
  chatEndRef: RefObject<HTMLDivElement>;
  onInputChange: (value: string) => void;
  onSendPrompt: (prompt: string) => Promise<void>;
  onToggleMic: () => void;
  onResetStyles: () => void;
}

export function AIAgentsChatPanel({
  messages,
  inputValue,
  isThinking,
  errorMessage,
  micError,
  isSpeechSupported,
  isListening,
  isLightTheme,
  borderSoft,
  panelBackground,
  subtleTextColor,
  styleState,
  chatEndRef,
  onInputChange,
  onSendPrompt,
  onToggleMic,
  onResetStyles,
}: AIAgentsChatPanelProps) {
  return (
    <section
      className="flex flex-col overflow-hidden rounded-2xl border p-3 transition-all duration-500 md:p-4"
      style={{
        borderColor: `color-mix(in srgb, var(--agent-primary) 30%, ${borderSoft})`,
        background: styleState.chatBackgroundColor
          ? styleState.chatBackgroundColor
          : panelBackground,
        color: isLightTheme ? "#0f172a" : "#e2e8f0",
        fontSize: "calc(1rem * var(--agent-font-scale))",
      }}
    >
      <div
        className="mb-2 border-b pb-2"
        style={{
          borderColor: `color-mix(in srgb, var(--agent-primary) 15%, ${borderSoft})`,
        }}
      >
        <h1
          className="text-lg font-semibold leading-tight md:text-xl"
          style={{ fontSize: "calc(1.15rem * var(--agent-font-scale))" }}
        >
          AI Agents Automation
        </h1>
        <p
          className="mt-0.5 text-[11px] leading-relaxed"
          style={{ color: subtleTextColor, opacity: 0.6 }}
        >
          Navigate pages, send emails, and customize this UI — all via AI
          function calling.
        </p>
      </div>

      <div
        className="agent-monitor-scroll flex-1 space-y-2 overflow-y-auto overflow-x-hidden py-2 pr-1"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: isLightTheme
            ? "rgba(71,85,105,0.3) transparent"
            : "rgba(148,163,184,0.2) transparent",
        }}
      >
        {messages.length === 0 && !isThinking ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-8 text-center">
            <p
              className="text-[11px] font-medium"
              style={{ color: subtleTextColor, opacity: 0.5 }}
            >
              Try: &ldquo;navigate to analytical ai&rdquo; or &ldquo;set theme
              light&rdquo;
            </p>
          </div>
        ) : null}

        {messages.map((message) => {
          const isUser = message.role === "user";
          const isSystem = message.role === "system";

          return (
            <div
              key={message.id}
              className={`flex ${
                isUser
                  ? "justify-end"
                  : isSystem
                    ? "justify-center"
                    : "justify-start"
              }`}
              style={{ animation: "agent-log-fade-in 0.3s ease-out" }}
            >
              <div
                className="max-w-[88%] rounded-xl px-3.5 py-2 text-[13px] leading-relaxed text-left"
                style={{
                  fontSize: "calc(0.82rem * var(--agent-font-scale))",
                  background: isUser
                    ? "color-mix(in srgb, var(--agent-primary) 18%, transparent)"
                    : isSystem
                      ? isLightTheme
                        ? "rgba(14,116,144,0.08)"
                        : "rgba(34,211,238,0.06)"
                      : isLightTheme
                        ? "rgba(241,245,249,0.9)"
                        : "rgba(15,23,42,0.6)",
                  border: `1px solid ${
                    isUser
                      ? "color-mix(in srgb, var(--agent-primary) 35%, transparent)"
                      : isSystem
                        ? isLightTheme
                          ? "rgba(14,116,144,0.2)"
                          : "rgba(34,211,238,0.15)"
                        : isLightTheme
                          ? "rgba(148,163,184,0.25)"
                          : "rgba(148,163,184,0.12)"
                  }`,
                  color: isSystem
                    ? isLightTheme
                      ? "#0e7490"
                      : "#67e8f9"
                    : isLightTheme
                      ? "#1e293b"
                      : "#e2e8f0",
                }}
              >
                {!isSystem && (
                  <p
                    className="mb-0.5 text-[9px] font-bold uppercase tracking-[0.1em]"
                    style={{
                      color: isUser
                        ? "var(--agent-primary)"
                        : isLightTheme
                          ? "#64748b"
                          : "#94a3b8",
                    }}
                  >
                    {isUser ? "You" : "Agent"}
                  </p>
                )}
                {isSystem && (
                  <p
                    className="mb-0.5 text-[9px] font-bold uppercase tracking-wider"
                    style={{
                      color: isLightTheme ? "#0891b2" : "#22d3ee",
                      opacity: 0.8,
                    }}
                  >
                    System
                  </p>
                )}
                <p>{message.content}</p>
              </div>
            </div>
          );
        })}

        {isThinking ? (
          <div
            className="flex justify-start"
            style={{ animation: "agent-log-fade-in 0.3s ease-out" }}
          >
            <div
              className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2"
              style={{
                background: isLightTheme
                  ? "rgba(241,245,249,0.9)"
                  : "rgba(15,23,42,0.6)",
                border: `1px solid ${
                  isLightTheme
                    ? "rgba(148,163,184,0.25)"
                    : "rgba(148,163,184,0.12)"
                }`,
              }}
            >
              <div className="flex gap-[3px]">
                <span
                  className="agent-thinking-dot agent-thinking-dot-1 inline-block h-[5px] w-[5px] rounded-full"
                  style={{ background: "var(--agent-primary)" }}
                />
                <span
                  className="agent-thinking-dot agent-thinking-dot-2 inline-block h-[5px] w-[5px] rounded-full"
                  style={{ background: "var(--agent-primary)" }}
                />
                <span
                  className="agent-thinking-dot agent-thinking-dot-3 inline-block h-[5px] w-[5px] rounded-full"
                  style={{ background: "var(--agent-primary)" }}
                />
              </div>
              <span
                className="text-[11px] font-medium"
                style={{ color: subtleTextColor }}
              >
                Thinking…
              </span>
            </div>
          </div>
        ) : null}
        <div ref={chatEndRef} aria-hidden="true" />
      </div>

      <div
        className="mt-2 space-y-1.5 border-t pt-2"
        style={{
          borderColor: `color-mix(in srgb, var(--agent-primary) 12%, ${borderSoft})`,
        }}
      >
        <textarea
          value={inputValue}
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void onSendPrompt(inputValue);
            }
          }}
          placeholder="Ask the AI agent anything…"
          rows={2}
          className="w-full resize-none rounded-lg border px-3 py-2 text-[13px] outline-none transition placeholder:text-[12px]"
          style={{
            fontSize: "calc(0.82rem * var(--agent-font-scale))",
            borderColor: `color-mix(in srgb, var(--agent-primary) 15%, ${borderSoft})`,
            background: isLightTheme
              ? "rgba(248,250,252,0.8)"
              : "rgba(8,15,35,0.5)",
            color: isLightTheme ? "#0f172a" : "#f8fafc",
          }}
        />

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              void onSendPrompt(inputValue);
            }}
            disabled={isThinking || inputValue.trim().length === 0}
            className="rounded-lg px-3.5 py-1.5 text-[12px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              backgroundColor: "var(--agent-primary)",
              color: "#020617",
            }}
          >
            Send
          </button>

          <button
            type="button"
            onClick={onToggleMic}
            disabled={!isSpeechSupported}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              borderColor: `color-mix(in srgb, var(--agent-primary) 25%, ${borderSoft})`,
              color: isLightTheme ? "#334155" : "#cbd5e1",
            }}
          >
            {isListening ? <MicOff size={13} /> : <Mic size={13} />}
            {isListening ? "Stop" : "Mic"}
          </button>

          <button
            type="button"
            onClick={onResetStyles}
            className="rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] transition"
            style={{
              borderColor: borderSoft,
              color: subtleTextColor,
              opacity: 0.7,
            }}
          >
            Reset
          </button>
        </div>

        {errorMessage ? (
          <p className="text-[11px] text-rose-400">{errorMessage}</p>
        ) : null}
        {micError ? (
          <p
            className="text-[11px]"
            style={{ color: isLightTheme ? "#b45309" : "#fcd34d" }}
          >
            {micError}
          </p>
        ) : null}
      </div>
    </section>
  );
}
