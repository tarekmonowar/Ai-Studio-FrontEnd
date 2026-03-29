"use client";

import {
  BrainCircuit,
  Mic,
  MicOff,
  Radio,
  ShieldCheck,
  Volume2,
} from "lucide-react";
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
  ServerEvent,
  TranscriptItem,
} from "@/types/voice";
import { VoiceWave } from "./VoiceWave";

const MAX_TRANSCRIPTS = 8;

const STATUS_LABELS: Record<AssistantState, string> = {
  "idle": "Idle",
  "connecting": "Connecting",
  "listening": "Listening",
  "user-speaking": "You are speaking",
  "thinking": "Tasnim is thinking",
  "assistant-speaking": "Tasnim is speaking",
  "error": "Connection issue",
  "disconnected": "Disconnected",
};

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

  const playerRef = useRef(new AudioPlayer());
  const assistantStateRef = useRef<AssistantState>("idle");
  const micSpeakingRef = useRef(false);
  const responseActiveRef = useRef(false);
  const assistantDoneAtRef = useRef(0);
  const lastResponseRequestAtRef = useRef(0);
  const requestAssistantResponseRef = useRef<() => void>(() => {});
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

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
    requestResponse,
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

  const requestAssistantResponse = useCallback(() => {
    const now = Date.now();
    if (now - lastResponseRequestAtRef.current < 500) {
      return;
    }

    lastResponseRequestAtRef.current = now;
    requestResponse();
    setAssistantState("thinking");
  }, [requestResponse]);

  useEffect(() => {
    requestAssistantResponseRef.current = requestAssistantResponse;
  }, [requestAssistantResponse]);

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
    micSpeakingRef.current = micSpeaking;
  }, [micSpeaking]);

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

  const toggleConversation = useCallback(async () => {
    if (started) {
      responseActiveRef.current = false;
      disconnect();
      await playerRef.current.stop();
      setStarted(false);
      setAssistantState("idle");
      setSessionReady(false);
      setAiLevel(0);
      setClientError(null);
      return;
    }

    setClientError(null);
    setAssistantState("connecting");
    setSessionReady(false);

    try {
      await playerRef.current.init();
      await connect();
      setStarted(true);
    } catch (error) {
      setAssistantState("error");
      const message =
        error instanceof Error
          ? error.message
          : "Unable to start voice session. Check frontend and backend connectivity settings.";
      setClientError(message);
    }
  }, [connect, disconnect, started]);

  useLayoutEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcripts]);

  const combinedLevel = useMemo(
    () => Math.max(userLevel, aiLevel),
    [aiLevel, userLevel],
  );
  const displayedError = clientError ?? socketError ?? micError;

  return (
    <main className="min-h-screen bg-app px-4 py-8 text-slate-100 sm:px-8 lg:px-10">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-3xl border border-cyan-400/20 bg-slate-900/65 p-5 shadow-2xl shadow-cyan-950/20 backdrop-blur md:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">
                Seaking AI Interview Studio
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-slate-100 md:text-3xl">
                Real-time Voice Practice with Tasnim
              </h1>
            </div>
            <div className="rounded-full border border-cyan-400/30 bg-slate-900/75 px-4 py-2 text-xs font-medium uppercase tracking-[0.16em] text-cyan-200">
              {STATUS_LABELS[assistantState]}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-cyan-500/25 bg-slate-950/70 p-4 md:p-6">
            <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.14em] text-cyan-200/90">
              <span className="flex items-center gap-2">
                <Radio className="h-4 w-4" />
                Live Audio Stream
              </span>
              <span className="flex items-center gap-2">
                <BrainCircuit className="h-4 w-4" />
                Barge-in Enabled
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
              <VoiceWave level={combinedLevel} state={assistantState} />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={() => void toggleConversation()}
              className="inline-flex items-center gap-2 rounded-full border border-cyan-300/50 bg-cyan-400/15 px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-cyan-100 transition hover:bg-cyan-300/20"
            >
              {started ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
              {started ? "Stop Conversation" : "Start Conversation"}
            </button>

            <div className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/70 px-4 py-2 text-xs uppercase tracking-[0.12em] text-slate-300">
              <Volume2 className="h-4 w-4" />
              Low latency playback
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/70 px-4 py-2 text-xs uppercase tracking-[0.12em] text-slate-300">
              <ShieldCheck className="h-4 w-4" />
              {isSecureContext ? "Secure context ready" : "HTTPS required"}
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
            Your speech and Tasnim&apos;s response transcripts appear here in
            real-time.
          </p>

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
                    {item.role === "user" ? "Monowar" : "Tasnim"}
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
