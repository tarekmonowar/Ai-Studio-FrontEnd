import { Sparkles } from "lucide-react";
import type { RefObject } from "react";
import type { AgentActionLog } from "./logic";

interface AIPipelineMonitorProps {
  isThinking: boolean;
  actionLogs: AgentActionLog[];
  isLightTheme: boolean;
  borderSoft: string;
  cardBackground: string;
  subtleTextColor: string;
  monitorScrollRef: RefObject<HTMLDivElement>;
}

export function AIPipelineMonitor({
  isThinking,
  actionLogs,
  isLightTheme,
  borderSoft,
  cardBackground,
  subtleTextColor,
  monitorScrollRef,
}: AIPipelineMonitorProps) {
  return (
    <div
      className="flex flex-col rounded-xl border"
      style={{
        borderColor: borderSoft,
        background: cardBackground,
        overflow: "hidden",
        flex: "1 1 50%",
        minHeight: 0,
      }}
    >
      <div
        className="flex items-center gap-2.5 border-b px-4 py-2.5"
        style={{ borderColor: borderSoft, flexShrink: 0 }}
      >
        <span
          className={isThinking ? "agent-monitor-pulse" : ""}
          style={{
            display: "inline-block",
            height: 7,
            width: 7,
            borderRadius: "50%",
            background: isThinking ? "#22d3ee" : "var(--agent-primary)",
            boxShadow: isThinking
              ? "0 0 8px rgba(34,211,238,0.8), 0 0 20px rgba(34,211,238,0.35)"
              : "0 0 6px color-mix(in srgb, var(--agent-primary) 55%, transparent)",
          }}
        />
        <p
          className="text-[11px] font-bold uppercase tracking-[0.2em]"
          style={{ color: "var(--agent-primary)" }}
        >
          AI Pipeline
        </p>
        <span
          className="ml-auto rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
          style={{
            background: isThinking
              ? "rgba(34,211,238,0.15)"
              : "rgba(16,185,129,0.12)",
            color: isThinking
              ? isLightTheme
                ? "#0e7490"
                : "#67e8f9"
              : isLightTheme
                ? "#065f46"
                : "#6ee7b7",
            border: `1px solid ${
              isThinking ? "rgba(34,211,238,0.3)" : "rgba(16,185,129,0.25)"
            }`,
          }}
        >
          {isThinking ? "⟳ Processing" : "● Idle"}
        </span>
      </div>

      <div
        className="agent-monitor-scroll flex-1 overflow-y-auto px-3 py-2"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: isLightTheme
            ? "rgba(71,85,105,0.3) transparent"
            : "rgba(148,163,184,0.2) transparent",
        }}
        ref={monitorScrollRef}
      >
        {actionLogs.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-8 text-center">
            <div
              className="agent-monitor-idle-icon flex h-9 w-9 items-center justify-center rounded-full"
              style={{
                background: isLightTheme
                  ? "rgba(34,211,238,0.06)"
                  : "rgba(34,211,238,0.04)",
                border: `1px solid ${
                  isLightTheme
                    ? "rgba(34,211,238,0.15)"
                    : "rgba(34,211,238,0.12)"
                }`,
              }}
            >
              <Sparkles
                size={16}
                style={{
                  color: isLightTheme ? "#0891b2" : "#22d3ee",
                  opacity: 0.7,
                }}
              />
            </div>
            <p
              className="text-[11px] font-medium"
              style={{ color: subtleTextColor, opacity: 0.7 }}
            >
              Awaiting AI Activity
            </p>
            <p
              className="max-w-[200px] text-[10px] leading-relaxed"
              style={{ color: subtleTextColor, opacity: 0.4 }}
            >
              Send a prompt to see how the AI thinks, decides, and calls tools
              in real time
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {actionLogs.map((log, idx) => {
              const isLatest = idx === actionLogs.length - 1;
              const titleLower = log.title.toLowerCase();

              const isInput =
                titleLower.includes("prompt") || titleLower.includes("user");
              const isThinkingStep =
                titleLower.includes("thinking") ||
                titleLower.includes("sending");
              const isReceived =
                titleLower.includes("received") ||
                titleLower.includes("response received");
              const isDecision =
                titleLower.includes("plan") ||
                titleLower.includes("decision") ||
                titleLower.includes("assistant response");
              const isInvoke =
                titleLower.includes("invoking") ||
                titleLower.includes("function call");
              const isResult =
                titleLower.includes("success") ||
                titleLower.includes("complete") ||
                titleLower.includes("reset");
              const isError = log.status === "error";

              let icon = "›";
              let label = "STEP";
              let accentColor = isLightTheme ? "#64748b" : "#64748b";

              if (isError) {
                icon = "✕";
                label = "ERROR";
                accentColor = "#ef4444";
              } else if (isInput) {
                icon = "⏵";
                label = "INPUT";
                accentColor = isLightTheme ? "#0891b2" : "#22d3ee";
              } else if (isThinkingStep) {
                icon = "◐";
                label = "THINKING";
                accentColor = isLightTheme ? "#0891b2" : "#67e8f9";
              } else if (isReceived) {
                icon = "◉";
                label = "RECEIVED";
                accentColor = isLightTheme ? "#0d9488" : "#5eead4";
              } else if (isDecision) {
                icon = "⚡";
                label = "DECISION";
                accentColor = isLightTheme ? "#d97706" : "#fbbf24";
              } else if (isInvoke) {
                icon = "ƒ";
                label = "FUNCTION";
                accentColor = isLightTheme ? "#7c3aed" : "#a78bfa";
              } else if (isResult) {
                icon = "✓";
                label = "RESULT";
                accentColor = isLightTheme ? "#059669" : "#34d399";
              }

              return (
                <div
                  key={log.id}
                  className="agent-log-entry flex gap-2.5 rounded-md px-2 py-2"
                  style={{
                    animation: isLatest
                      ? "agent-log-fade-in 0.35s ease-out"
                      : "none",
                    background: isLatest
                      ? `color-mix(in srgb, ${accentColor} 6%, transparent)`
                      : "transparent",
                  }}
                >
                  <div
                    className="flex flex-col items-center"
                    style={{ width: 18, flexShrink: 0 }}
                  >
                    <span
                      className="flex h-[18px] w-[18px] items-center justify-center rounded-full text-[9px] font-bold"
                      style={{
                        background: `color-mix(in srgb, ${accentColor} 16%, transparent)`,
                        color: accentColor,
                        border: `1.5px solid color-mix(in srgb, ${accentColor} 35%, transparent)`,
                        boxShadow: isLatest
                          ? `0 0 8px color-mix(in srgb, ${accentColor} 25%, transparent)`
                          : "none",
                      }}
                    >
                      {icon}
                    </span>
                    {idx < actionLogs.length - 1 && (
                      <div
                        style={{
                          width: 1.5,
                          flex: 1,
                          minHeight: 8,
                          background: `color-mix(in srgb, ${accentColor} 20%, transparent)`,
                        }}
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1 pb-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-[9px] font-bold uppercase tracking-[0.12em]"
                        style={{ color: accentColor }}
                      >
                        {label}
                      </span>
                      {log.status === "pending" && (
                        <span
                          className="agent-monitor-pulse inline-block h-1 w-1 rounded-full"
                          style={{ background: accentColor }}
                        />
                      )}
                      <span
                        className="ml-auto text-[9px] tabular-nums"
                        style={{ color: subtleTextColor, opacity: 0.5 }}
                      >
                        {new Date(log.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                    </div>
                    <p
                      className="mt-0.5 text-[11px] font-semibold leading-tight"
                      style={{ color: isLightTheme ? "#1e293b" : "#e2e8f0" }}
                    >
                      {log.title}
                    </p>
                    <p
                      className="mt-0.5 text-[10px] leading-snug"
                      style={{
                        color: subtleTextColor,
                        opacity: 0.75,
                        fontFamily: isInvoke
                          ? "'SF Mono','Cascadia Code','Fira Code',monospace"
                          : "inherit",
                        wordBreak: "break-word",
                      }}
                    >
                      {log.detail}
                    </p>
                  </div>
                </div>
              );
            })}

            {isThinking && (
              <div
                className="flex items-center gap-2.5 rounded-md px-2 py-2"
                style={{ animation: "agent-log-fade-in 0.3s ease-out" }}
              >
                <div className="flex h-[18px] w-[18px] items-center justify-center">
                  <div className="flex gap-[3px]">
                    <span
                      className="agent-thinking-dot agent-thinking-dot-1 inline-block h-[4px] w-[4px] rounded-full"
                      style={{
                        background: isLightTheme ? "#0891b2" : "#22d3ee",
                      }}
                    />
                    <span
                      className="agent-thinking-dot agent-thinking-dot-2 inline-block h-[4px] w-[4px] rounded-full"
                      style={{
                        background: isLightTheme ? "#0891b2" : "#22d3ee",
                      }}
                    />
                    <span
                      className="agent-thinking-dot agent-thinking-dot-3 inline-block h-[4px] w-[4px] rounded-full"
                      style={{
                        background: isLightTheme ? "#0891b2" : "#22d3ee",
                      }}
                    />
                  </div>
                </div>
                <span
                  className="text-[10px] font-medium"
                  style={{ color: isLightTheme ? "#0891b2" : "#67e8f9" }}
                >
                  Processing…
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
