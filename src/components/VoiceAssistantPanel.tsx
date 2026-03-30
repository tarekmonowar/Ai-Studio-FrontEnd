"use client";

import { Mic, MicOff, Radio, ShieldCheck } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useMicrophoneVad } from "@/hooks/useMicrophoneVad";
import { useVoiceSocket } from "@/hooks/useVoiceSocket";
import { AudioPlayer } from "@/lib/audioPlayer";
import { pcm16Level } from "@/lib/pcm";
import type {
  AssistantState,
  InstructionMode,
  ServerEvent,
  SpeakerProfile,
  TranscriptItem,
} from "@/types/voice";
import { VoiceWave } from "./VoiceWave";

const MAX_TRANSCRIPTS = 8;
const DEFAULT_INSTRUCTION_MODE: InstructionMode = "interview-prep";
const DEFAULT_SPEAKER_PROFILE: SpeakerProfile = "muntaha";
const INTERVIEW_FLOW_STEPS = [
  "Interpersonal block: 4-5 unique questions",
  "HTML 3-4, CSS 3-4, JavaScript 7-8",
  "TypeScript 3-4, React 6-7, Next.js 5-6",
  "Node.js, Express.js, MongoDB, PostgreSQL, Docker: 4-8 each",
  "Specific topic request: 10-15 from requested technology",
] as const;

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${seconds}`;
}

function getStatusLabels(
  assistantName: string,
): Record<AssistantState, string> {
  return {
    "idle": "Idle",
    "connecting": "Connecting",
    "listening": "Listening",
    "user-speaking": "You are speaking",
    "thinking": `${assistantName} is thinking`,
    "assistant-speaking": `${assistantName} is speaking`,
    "error": "Connection issue",
    "disconnected": "Disconnected",
  };
}

function nextTranscript(
  items: TranscriptItem[],
  item: TranscriptItem,
): TranscriptItem[] {
  const merged = [...items, item];
  if (merged.length <= MAX_TRANSCRIPTS) {
    return merged;
  }
  return merged.slice(merged.length - MAX_TRANSCRIPTS);
}

export function VoiceAssistantPanel() {
  const [started, setStarted] = useState(false);
  const [assistantState, setAssistantState] = useState<AssistantState>("idle");
  const [sessionReady, setSessionReady] = useState(false);
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [clientError, setClientError] = useState<string | null>(null);
  const [aiLevel, setAiLevel] = useState(0);
  const [selectedInstructionMode, setSelectedInstructionMode] =
    useState<InstructionMode>(DEFAULT_INSTRUCTION_MODE);
  const [appliedInstructionMode, setAppliedInstructionMode] =
    useState<InstructionMode>(DEFAULT_INSTRUCTION_MODE);
  const [selectedSpeakerProfile, setSelectedSpeakerProfile] =
    useState<SpeakerProfile>(DEFAULT_SPEAKER_PROFILE);
  const [appliedSpeakerProfile, setAppliedSpeakerProfile] =
    useState<SpeakerProfile>(DEFAULT_SPEAKER_PROFILE);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const playerRef = useRef(new AudioPlayer());
  const assistantStateRef = useRef<AssistantState>("idle");
  const responseActiveRef = useRef(false);
  const assistantDoneAtRef = useRef(0);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const sessionStartedAtRef = useRef<number | null>(null);

  const assistantName = useMemo(
    () => (appliedInstructionMode === "english-learning" ? "Ava" : "Omi"),
    [appliedInstructionMode],
  );
  const statusLabels = useMemo(
    () => getStatusLabels(assistantName),
    [assistantName],
  );

  const handleServerEvent = useCallback((event: ServerEvent) => {
    switch (event.type) {
      case "session.ready":
        setSessionReady(true);
        if (
          assistantStateRef.current === "idle" ||
          assistantStateRef.current === "connecting"
        ) {
          setAssistantState("listening");
        }
        break;
      case "assistant.thinking":
        responseActiveRef.current = true;
        assistantDoneAtRef.current = 0;
        setAssistantState("thinking");
        break;
      case "assistant.speaking":
        responseActiveRef.current = true;
        setAssistantState("assistant-speaking");
        break;
      case "assistant.cancelled":
        responseActiveRef.current = false;
        void playerRef.current.stop();
        setAssistantState("listening");
        setAiLevel(0);
        break;
      case "assistant.done":
        responseActiveRef.current = false;
        assistantDoneAtRef.current = Date.now();
        setAssistantState("listening");
        break;
      case "vad.server.speech_started": {
        const msSinceDone = Date.now() - assistantDoneAtRef.current;
        if (msSinceDone < 1500 && !responseActiveRef.current) {
          break;
        }
        responseActiveRef.current = false;
        void playerRef.current.stop();
        setAssistantState("user-speaking");
        break;
      }
      case "vad.server.speech_stopped":
        setAssistantState("thinking");
        break;
      case "session.closed":
        responseActiveRef.current = false;
        setSessionReady(false);
        setAssistantState("disconnected");
        break;
      case "transcript.user":
        setTranscripts((prev) =>
          nextTranscript(prev, {
            id: crypto.randomUUID(),
            role: "user",
            text: event.text,
          }),
        );
        break;
      case "transcript.assistant":
        setTranscripts((prev) =>
          nextTranscript(prev, {
            id: crypto.randomUUID(),
            role: "assistant",
            text: event.text,
          }),
        );
        break;
      case "error":
        responseActiveRef.current = false;
        setSessionReady(false);
        setAssistantState("error");
        setClientError(event.message);
        break;
      default:
        break;
    }
  }, []);

  const {
    status,
    error: socketError,
    connect,
    disconnect,
    sendAudioChunk,
  } = useVoiceSocket({
    onAudioChunk: (chunk) => {
      if (!responseActiveRef.current) return;
      void playerRef.current.enqueuePcm16(chunk);
      setAiLevel(Math.min(1, pcm16Level(chunk) * 5.5));
      if (assistantStateRef.current !== "user-speaking") {
        setAssistantState("assistant-speaking");
      }
    },
    onServerEvent: handleServerEvent,
  });

  const {
    level: userLevel,
    speaking: micSpeaking,
    error: micError,
    isSecureContext,
  } = useMicrophoneVad({
    isActive: started && status === "connected" && sessionReady,
    onPcmChunk: sendAudioChunk,
    onSpeechStart: () => {
      if (assistantStateRef.current === "listening") {
        setAssistantState("user-speaking");
      }
    },
    onSpeechEnd: () => {},
  });

  useEffect(() => {
    assistantStateRef.current = assistantState;
  }, [assistantState]);

  useEffect(() => {
    if (!started || status !== "connected") {
      return;
    }

    if (
      micSpeaking &&
      (assistantStateRef.current === "listening" ||
        assistantStateRef.current === "user-speaking")
    ) {
      setAssistantState("user-speaking");
    }
  }, [micSpeaking, started, status]);

  useEffect(() => {
    if (status !== "connected") {
      setSessionReady(false);
    }
  }, [status]);

  useEffect(() => {
    if (!started) {
      return;
    }

    if (status === "connecting") {
      setAssistantState("connecting");
    }

    if (status === "disconnected" && assistantState !== "error") {
      setAssistantState("disconnected");
    }
  }, [assistantState, started, status]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setAiLevel((current) => Math.max(0, current - 0.06));
    }, 90);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const player = playerRef.current;

    return () => {
      disconnect();
      void player.destroy();
    };
  }, [disconnect]);

  useEffect(() => {
    if (!started) {
      sessionStartedAtRef.current = null;
      setElapsedSeconds(0);
      return;
    }

    if (sessionStartedAtRef.current === null) {
      sessionStartedAtRef.current = Date.now();
    }

    const timer = window.setInterval(() => {
      if (sessionStartedAtRef.current === null) {
        return;
      }

      const elapsed = Math.floor(
        (Date.now() - sessionStartedAtRef.current) / 1000,
      );
      setElapsedSeconds(elapsed);
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [started]);

  const startConversation = useCallback(
    async (
      instructionMode: InstructionMode,
      speakerProfile: SpeakerProfile,
    ) => {
      setClientError(null);
      setAssistantState("connecting");
      setSessionReady(false);

      try {
        await playerRef.current.init();
        await connect(instructionMode, speakerProfile);
        setStarted(true);
      } catch (error) {
        setStarted(false);
        setAssistantState("error");
        const message =
          error instanceof Error
            ? error.message
            : "Unable to start voice session. Check frontend and backend connectivity settings.";
        setClientError(message);
      }
    },
    [connect],
  );

  const stopConversation = useCallback(async () => {
    responseActiveRef.current = false;
    disconnect();
    await playerRef.current.stop();
    setStarted(false);
    sessionStartedAtRef.current = null;
    setElapsedSeconds(0);
    setAssistantState("idle");
    setSessionReady(false);
    setAiLevel(0);
    setClientError(null);
  }, [disconnect]);

  const toggleConversation = useCallback(async () => {
    if (started) {
      await stopConversation();
      return;
    }

    await startConversation(appliedInstructionMode, appliedSpeakerProfile);
  }, [
    appliedInstructionMode,
    appliedSpeakerProfile,
    startConversation,
    started,
    stopConversation,
  ]);

  const applyInstructionChange = useCallback(async () => {
    const noInstructionChange =
      selectedInstructionMode === appliedInstructionMode;
    const noSpeakerChange = selectedSpeakerProfile === appliedSpeakerProfile;

    if (noInstructionChange && noSpeakerChange) {
      return;
    }

    setAppliedInstructionMode(selectedInstructionMode);
    setAppliedSpeakerProfile(selectedSpeakerProfile);
    setTranscripts([]);
    setClientError(null);
    setAiLevel(0);

    if (!started) {
      return;
    }

    await stopConversation();
    await startConversation(selectedInstructionMode, selectedSpeakerProfile);
  }, [
    appliedInstructionMode,
    appliedSpeakerProfile,
    selectedInstructionMode,
    selectedSpeakerProfile,
    startConversation,
    started,
    stopConversation,
  ]);

  useLayoutEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcripts]);

  const combinedLevel = useMemo(
    () => Math.max(userLevel, aiLevel),
    [aiLevel, userLevel],
  );
  const hasPendingInstructionChange =
    selectedInstructionMode !== appliedInstructionMode ||
    selectedSpeakerProfile !== appliedSpeakerProfile;
  const displayedError = clientError ?? socketError ?? micError;
  const assistantQuestionCount = useMemo(
    () =>
      transcripts.filter(
        (item) => item.role === "assistant" && item.text.includes("?"),
      ).length,
    [transcripts],
  );
  const userResponseCount = useMemo(
    () => transcripts.filter((item) => item.role === "user").length,
    [transcripts],
  );
  const interviewPhaseLabel = useMemo(() => {
    if (appliedInstructionMode !== "interview-prep") {
      return "Language coaching";
    }

    if (assistantQuestionCount === 0) {
      return "Opening";
    }

    if (assistantQuestionCount <= 5) {
      return "Interpersonal round";
    }

    return "Technical round";
  }, [appliedInstructionMode, assistantQuestionCount]);

  return (
    <main className="min-h-screen bg-app px-4 py-8 text-slate-100 sm:px-8 lg:px-10">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-3xl border border-cyan-400/20 bg-slate-900/65 p-5 shadow-2xl shadow-cyan-950/20 backdrop-blur md:p-8">
          <div className="mb-6 xl:mb-7">
            <div>
              <p className="text-xs  tracking-[0.24em] text-cyan-300">
                <a
                  href="https://www.linkedin.com/in/tarekmonowar/"
                  target="_blank"
                  className="hover:underline"
                >
                  Tarek Monowar&apos;s
                </a>{" "}
                AI STUDIO
              </p>
              <h1 className="mt-4 xl:mt-6 text-2xl font-semibold text-slate-100 md:text-3xl">
                {assistantName == "Omi"
                  ? "Interview Prep Practice with"
                  : "English Speaking Practice with"}{" "}
                <span className="font-bold text-fuchsia-600">
                  {" "}
                  {assistantName}.
                </span>
              </h1>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-cyan-500/25 bg-slate-950/70 p-4 md:p-6">
            <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.14em] text-cyan-200/90">
              <span className="flex items-center gap-2">
                <Radio className="h-4 w-4" />
                Real-time voice practice
              </span>
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                {isSecureContext ? "Secure context ready" : "HTTPS required"}
              </span>
            </div>

            <div className="voice-orb-frame">
              <div
                className={`voice-orb ${
                  assistantState === "thinking"
                    ? "voice-orb-thinking"
                    : assistantState === "assistant-speaking"
                      ? "voice-orb-speaking"
                      : "voice-orb-listening"
                }`}
              />
              <div className="voice-wave-layer">
                <VoiceWave level={combinedLevel} state={assistantState} />
              </div>
            </div>
            <div className="mt-4 flex justify-center">
              <div className="inline-flex items-center gap-2 rounded-md border border-[rgba(51,65,85,0.85)] bg-[rgba(2,6,23,0.72)] px-4 py-1 text-md font-medium tracking-[0.16em] ">
                {statusLabels[assistantState]}
                <span className="relative flex w-2 h-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75 animate-ping"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 xl:mt-6 flex flex-col gap-3">
            <div className="flex justify-center">
              <button
                onClick={() => void toggleConversation()}
                className="inline-flex items-center gap-2 rounded-full border border-cyan-300/50 bg-cyan-400/15 px-5 py-3 text-sm font-semibold  tracking-[0.12em] text-cyan-100 transition hover:bg-cyan-300/20"
              >
                {started ? (
                  <Mic className="h-4 w-4" />
                ) : (
                  <MicOff className="h-4 w-4" />
                )}
                {started ? "Stop " : "Start "}
              </button>
            </div>

            <div className="flex mt-4 justify-center">
              <div className="inline-flex overflow-hidden rounded-full border border-slate-700/80 bg-slate-900/70 p-1 text-xs  tracking-[0.12em]">
                <button
                  onClick={() => setSelectedSpeakerProfile("monowar")}
                  className={`rounded-full px-4 py-2 transition ${
                    selectedSpeakerProfile === "monowar"
                      ? "bg-cyan-400/20 text-cyan-100"
                      : "text-slate-300 hover:text-slate-100"
                  }`}
                >
                  Monowar
                </button>
                <button
                  onClick={() => setSelectedSpeakerProfile("muntaha")}
                  className={`rounded-full px-4 py-2 transition ${
                    selectedSpeakerProfile === "muntaha"
                      ? "bg-cyan-400/20 text-cyan-100"
                      : "text-slate-300 hover:text-slate-100"
                  }`}
                >
                  Muntaha
                </button>
              </div>
            </div>

            <div className="flex justify-center">
              <div className="inline-flex overflow-hidden rounded-full border border-slate-700/80 bg-slate-900/70 p-1 text-xs  tracking-[0.12em]">
                <button
                  onClick={() => setSelectedInstructionMode("interview-prep")}
                  className={`rounded-full px-4 py-2 transition ${
                    selectedInstructionMode === "interview-prep"
                      ? "bg-cyan-400/20 text-cyan-100"
                      : "text-slate-300 hover:text-slate-100"
                  }`}
                >
                  Interview Prep
                </button>
                <button
                  onClick={() => setSelectedInstructionMode("english-learning")}
                  className={`rounded-full px-4 py-2 transition ${
                    selectedInstructionMode === "english-learning"
                      ? "bg-cyan-400/20 text-cyan-100"
                      : "text-slate-300 hover:text-slate-100"
                  }`}
                >
                  Learning English
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => void applyInstructionChange()}
                disabled={!hasPendingInstructionChange}
                className={`inline-flex items-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold  tracking-[0.12em] transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  hasPendingInstructionChange
                    ? "border-cyan-300/50 bg-cyan-400/15 text-cyan-100 hover:bg-cyan-300/20"
                    : "border-slate-500/70 bg-slate-800/85 text-slate-100"
                }`}
              >
                Apply Change
              </button>
            </div>
          </div>

          {displayedError ? (
            <p className="mt-4 rounded-xl border border-rose-400/40 bg-rose-950/35 px-4 py-3 text-sm text-rose-200">
              <span className="font-semibold">Connection error:</span>{" "}
              {displayedError}
            </p>
          ) : null}
        </section>

        <aside className="flex max-h-[calc(100vh-4rem)] flex-col rounded-3xl border border-slate-700/70 bg-slate-900/60 p-5 backdrop-blur md:p-6">
          <h2 className="text-lg font-semibold text-slate-100">
            Conversation Feed
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            Your speech and {assistantName}&apos;s response transcripts appear
            here in real-time.
          </p>

          {appliedInstructionMode === "interview-prep" ? (
            <section className="mt-4 rounded-2xl border border-cyan-400/25 bg-slate-950/55 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">
                  Interview room brief
                </p>
                <span
                  className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.12em] ${
                    sessionReady
                      ? "bg-emerald-500/20 text-emerald-200"
                      : "bg-slate-700/60 text-slate-300"
                  }`}
                >
                  {sessionReady ? "Live" : "Standby"}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border border-slate-700/80 bg-slate-900/70 p-2">
                  <p className="text-slate-400">Phase</p>
                  <p className="mt-1 font-semibold text-slate-100">
                    {interviewPhaseLabel}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-700/80 bg-slate-900/70 p-2">
                  <p className="text-slate-400">Session time</p>
                  <p className="mt-1 font-semibold text-slate-100">
                    {formatDuration(elapsedSeconds)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-700/80 bg-slate-900/70 p-2">
                  <p className="text-slate-400">Questions asked</p>
                  <p className="mt-1 font-semibold text-cyan-100">
                    {assistantQuestionCount}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-700/80 bg-slate-900/70 p-2">
                  <p className="text-slate-400">Your responses</p>
                  <p className="mt-1 font-semibold text-emerald-100">
                    {userResponseCount}
                  </p>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-slate-700/80 bg-slate-900/65 p-3">
                <p className="text-[11px] uppercase tracking-[0.12em] text-slate-300">
                  Structured flow
                </p>
                <ol className="mt-2 space-y-1 text-xs text-slate-200">
                  {INTERVIEW_FLOW_STEPS.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>
            </section>
          ) : null}

          <div className="mt-5 flex-1 space-y-3 overflow-y-auto pr-1">
            {transcripts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/55 p-4 text-sm text-slate-400">
                Start a conversation to see the live transcript.
              </div>
            ) : (
              transcripts.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-2xl p-3 text-sm leading-relaxed ${
                    item.role === "user"
                      ? "border border-cyan-500/30 bg-cyan-500/10 text-cyan-100"
                      : "border border-emerald-500/25 bg-emerald-500/10 text-emerald-100"
                  }`}
                >
                  <p className="mb-1 text-[11px] uppercase tracking-[0.14em] opacity-75">
                    {item.role === "user" ? "Monowar" : assistantName}
                  </p>
                  <p>{item.text}</p>
                </div>
              ))
            )}
            <div ref={transcriptEndRef} />
          </div>
        </aside>
      </div>
    </main>
  );
}
