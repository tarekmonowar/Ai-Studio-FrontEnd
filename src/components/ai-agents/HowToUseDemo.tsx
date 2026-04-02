import { useEffect, useRef, useState } from "react";

const DEMO_COMMANDS = [
  { text: "navigate to generative ai page", label: "Navigation" },
  { text: "change background color to navy", label: "Page Style" },
  { text: "change your background color to #2d1b69", label: "Chat Style" },
  { text: "send welcome email to example@gmail.com", label: "Email" },
  { text: "set theme light", label: "Theme" },
];

const DEMO_RESPONSES: Record<string, string> = {
  "navigate to generative ai page": "Navigating to Generative AI page…",
  "change background color to navy": "Updated page background to navy.",
  "change your background color to #2d1b69":
    "Updated chat background to #2d1b69.",
  "send welcome email to example@gmail.com":
    "Email sent to example@gmail.com ✓",
  "set theme light": "Applied light theme to the page.",
};

interface HowToUseDemoProps {
  isLightTheme: boolean;
  borderSoft: string;
  cardBackground: string;
  subtleTextColor: string;
}

export function HowToUseDemo({
  isLightTheme,
  borderSoft,
  cardBackground,
  subtleTextColor,
}: HowToUseDemoProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [phase, setPhase] = useState<
    "typing" | "sending" | "response" | "pause"
  >("typing");
  const [response, setResponse] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const cmd = DEMO_COMMANDS[currentIdx];
    if (!cmd) return;
    const fullText = cmd.text;

    if (phase === "typing") {
      if (typedText.length < fullText.length) {
        timerRef.current = setTimeout(
          () => {
            setTypedText(fullText.slice(0, typedText.length + 1));
          },
          45 + Math.random() * 30,
        );
      } else {
        timerRef.current = setTimeout(() => setPhase("sending"), 600);
      }
    } else if (phase === "sending") {
      timerRef.current = setTimeout(() => {
        setResponse(DEMO_RESPONSES[fullText] ?? "Done.");
        setPhase("response");
      }, 800);
    } else if (phase === "response") {
      timerRef.current = setTimeout(() => setPhase("pause"), 2200);
    } else if (phase === "pause") {
      timerRef.current = setTimeout(() => {
        const next = (currentIdx + 1) % DEMO_COMMANDS.length;
        setCurrentIdx(next);
        setTypedText("");
        setResponse("");
        setPhase("typing");
      }, 400);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [phase, typedText, currentIdx]);

  const currentCmd = DEMO_COMMANDS[currentIdx];

  return (
    <div
      className="flex flex-col overflow-hidden rounded-xl border"
      style={{
        borderColor: borderSoft,
        background: cardBackground,
        flex: "1 1 50%",
        minHeight: 0,
      }}
    >
      <div
        className="flex items-center gap-2 border-b px-3 py-2"
        style={{ borderColor: borderSoft, flexShrink: 0 }}
      >
        <span
          style={{
            display: "inline-block",
            height: 6,
            width: 6,
            borderRadius: "50%",
            background: "var(--agent-primary)",
            opacity: 0.7,
          }}
        />
        <p
          className="text-[10px] font-bold uppercase tracking-[0.18em]"
          style={{ color: subtleTextColor, opacity: 0.8 }}
        >
          How to Use
        </p>
        <span
          className="ml-auto rounded-full px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider"
          style={{
            background:
              "color-mix(in srgb, var(--agent-primary) 12%, transparent)",
            color: "var(--agent-primary)",
            border:
              "1px solid color-mix(in srgb, var(--agent-primary) 25%, transparent)",
          }}
        >
          {currentCmd?.label}
        </span>
      </div>

      <div
        className="flex flex-1 flex-col justify-between overflow-hidden px-3 py-3"
        style={{ minHeight: 0 }}
      >
        <div className="flex flex-wrap gap-1" style={{ flexShrink: 0 }}>
          {DEMO_COMMANDS.map((cmd, i) => (
            <span
              key={cmd.text}
              className="rounded-full px-2 py-0.5 text-[9px] font-medium transition-all duration-300"
              style={{
                background:
                  i === currentIdx
                    ? "color-mix(in srgb, var(--agent-primary) 20%, transparent)"
                    : isLightTheme
                      ? "rgba(0,0,0,0.04)"
                      : "rgba(255,255,255,0.04)",
                color:
                  i === currentIdx ? "var(--agent-primary)" : subtleTextColor,
                border: `1px solid ${
                  i === currentIdx
                    ? "color-mix(in srgb, var(--agent-primary) 35%, transparent)"
                    : "transparent"
                }`,
                opacity: i === currentIdx ? 1 : 0.5,
              }}
            >
              {cmd.label}
            </span>
          ))}
        </div>

        <div
          className="flex flex-1 flex-col justify-end overflow-hidden"
          style={{ minHeight: 0, gap: 4 }}
        >
          {response && (
            <div
              className="self-start rounded-lg px-3 py-2 text-[12px]"
              style={{
                animation: "agent-log-fade-in 0.3s ease-out",
                background: isLightTheme
                  ? "rgba(241,245,249,0.9)"
                  : "rgba(15,23,42,0.6)",
                border: `1px solid ${
                  isLightTheme
                    ? "rgba(148,163,184,0.25)"
                    : "rgba(148,163,184,0.12)"
                }`,
                color: isLightTheme ? "#1e293b" : "#e2e8f0",
                maxWidth: "85%",
              }}
            >
              <span
                className="text-[9px] font-bold uppercase tracking-wider"
                style={{ color: subtleTextColor, opacity: 0.6 }}
              >
                Agent
              </span>
              <p className="mt-0.5 leading-relaxed">{response}</p>
            </div>
          )}

          {phase === "sending" && (
            <div
              className="flex items-center gap-1.5 self-start rounded-lg px-3 py-2"
              style={{
                animation: "agent-log-fade-in 0.2s ease-out",
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
              <div className="flex gap-[2px]">
                <span
                  className="agent-thinking-dot agent-thinking-dot-1 inline-block h-[4px] w-[4px] rounded-full"
                  style={{ background: "var(--agent-primary)" }}
                />
                <span
                  className="agent-thinking-dot agent-thinking-dot-2 inline-block h-[4px] w-[4px] rounded-full"
                  style={{ background: "var(--agent-primary)" }}
                />
                <span
                  className="agent-thinking-dot agent-thinking-dot-3 inline-block h-[4px] w-[4px] rounded-full"
                  style={{ background: "var(--agent-primary)" }}
                />
              </div>
            </div>
          )}
        </div>

        <div
          className="relative flex flex-col gap-1.5"
          style={{ flexShrink: 0 }}
        >
          <div
            className="rounded-lg border px-3 py-2 text-[12px]"
            style={{
              borderColor: `color-mix(in srgb, var(--agent-primary) 15%, ${borderSoft})`,
              background: isLightTheme
                ? "rgba(248,250,252,0.5)"
                : "rgba(8,15,35,0.4)",
              color: isLightTheme ? "#0f172a" : "#f8fafc",
              minHeight: 30,
            }}
          >
            {typedText}
            {phase === "typing" && (
              <span
                className="inline-block"
                style={{
                  width: 1,
                  height: "1em",
                  background: "var(--agent-primary)",
                  marginLeft: 1,
                  animation: "agent-cursor-blink 0.8s step-end infinite",
                  verticalAlign: "text-bottom",
                }}
              />
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="rounded-md px-3 py-1.5 text-[11px] font-semibold transition-all duration-300"
              style={{
                backgroundColor:
                  phase === "sending"
                    ? "color-mix(in srgb, var(--agent-primary) 60%, transparent)"
                    : "var(--agent-primary)",
                color: "#020617",
                transform: phase === "sending" ? "scale(0.95)" : "scale(1)",
                opacity: typedText.length === 0 && phase === "typing" ? 0.4 : 1,
                cursor: "default",
                pointerEvents: "none",
              }}
            >
              Send
            </button>
            <span
              className="text-[9px]"
              style={{ color: subtleTextColor, opacity: 0.4 }}
            >
              Demo — commands cycle automatically
            </span>
          </div>

          {(phase === "sending" ||
            (phase === "typing" &&
              typedText.length === DEMO_COMMANDS[currentIdx]?.text.length)) && (
            <svg
              width="16"
              height="20"
              viewBox="0 0 16 20"
              fill="none"
              style={{
                position: "absolute",
                left: 36,
                bottom: 8,
                filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.4))",
                animation:
                  phase === "sending"
                    ? "agent-cursor-click 0.4s ease-out"
                    : "agent-cursor-arrive 0.5s ease-out forwards",
                zIndex: 10,
              }}
            >
              <path
                d="M1 1L1 14L4.5 10.5L8 17L10 16L6.5 9.5L11 9L1 1Z"
                fill="white"
                stroke="#1e293b"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}
