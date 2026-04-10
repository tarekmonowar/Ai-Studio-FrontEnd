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
import {
  DEFAULT_INSTRUCTION_MODE,
  DEFAULT_SPEAKER_PROFILE,
  getStatusLabels,
  nextTranscript,
  resolvePhaseLabel,
} from "./voicePanel.constants";

// ─── Hook Return Type ────────────────────────────────────────────────────────

export interface VoicePanelState {
  // Session state
  started: boolean;
  isTogglingConversation: boolean;
  assistantState: AssistantState;
  sessionReady: boolean;
  transcripts: TranscriptItem[];
  clientError: string | null;
  aiLevel: number;
  remainingSeconds: number | null;
  backendPhase: string;

  // Mode selectors (pending = not yet applied)
  selectedInstructionMode: InstructionMode;
  setSelectedInstructionMode: (mode: InstructionMode) => void;
  appliedInstructionMode: InstructionMode;
  selectedSpeakerProfile: SpeakerProfile;
  setSelectedSpeakerProfile: (profile: SpeakerProfile) => void;
  appliedSpeakerProfile: SpeakerProfile;

  // Derived/computed values
  assistantName: string;
  statusLabels: Record<AssistantState, string>;
  combinedLevel: number;
  hasPendingInstructionChange: boolean;
  displayedError: string | null;
  assistantQuestionCount: number;
  userResponseCount: number;
  interviewPhaseLabel: string;
  hasReachedTimeLimit: boolean;
  remainingTimeTextClass: string;
  isSecureContext: boolean;

  // Scroll refs
  transcriptEndRef: React.RefObject<HTMLDivElement>;

  // Actions
  toggleConversation: () => Promise<void>;
  applyInstructionChange: () => Promise<void>;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Custom hook that manages all state and logic for the VoiceAssistantPanel.
 * Separates business logic from the presentational component.
 */
export function useVoicePanel(): VoicePanelState {
  const [started, setStarted] = useState(false);
  const [isTogglingConversation, setIsTogglingConversation] = useState(false);
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
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [backendPhase, setBackendPhase] = useState("interview-prep");

  const playerRef = useRef(new AudioPlayer());
  const assistantStateRef = useRef<AssistantState>("idle");
  const manualStopRef = useRef(false);
  const responseActiveRef = useRef(false);
  const assistantDoneAtRef = useRef(0);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  // ─── Derived Values ──────────────────────────────────────────────────────

  const assistantName = useMemo(
    () => (appliedInstructionMode === "english-learning" ? "Ava" : "Omi"),
    [appliedInstructionMode],
  );
  const statusLabels = useMemo(
    () => getStatusLabels(assistantName),
    [assistantName],
  );

  // ─── Server Event Handler ────────────────────────────────────────────────

  const handleServerEvent = useCallback((event: ServerEvent) => {
    switch (event.type) {
      case "session.ready":
        manualStopRef.current = false;
        setSessionReady(true);
        setRemainingSeconds(
          typeof event.rateLimitRemainingSeconds === "number"
            ? event.rateLimitRemainingSeconds
            : null,
        );
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
        if (!manualStopRef.current) {
          setAssistantState("disconnected");
        }
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
      case "phase.update":
        setBackendPhase(event.phase);
        break;
      case "error":
        responseActiveRef.current = false;
        setSessionReady(false);
        if (manualStopRef.current) {
          break;
        }
        setAssistantState("error");
        setClientError(event.message);
        break;
      default:
        break;
    }
  }, []);

  // ─── Socket & Microphone ─────────────────────────────────────────────────

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

  // ─── Effects ─────────────────────────────────────────────────────────────

  // Keep the ref in sync with state so callbacks don't become stale
  useEffect(() => {
    assistantStateRef.current = assistantState;
  }, [assistantState]);

  // Mirror microphone speaking state into assistantState
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

  // Reset session ready flag when socket disconnects
  useEffect(() => {
    if (status !== "connected") {
      setSessionReady(false);
    }
  }, [status]);

  // Sync connection status changes into assistantState
  useEffect(() => {
    if (!started) {
      return;
    }
    if (status === "connecting") {
      setAssistantState("connecting");
    }
    if (
      status === "disconnected" &&
      assistantState !== "error" &&
      !manualStopRef.current
    ) {
      setAssistantState("disconnected");
    }
  }, [assistantState, started, status]);

  // Gradually decay the AI audio level indicator
  useEffect(() => {
    const timer = window.setInterval(() => {
      setAiLevel((current) => Math.max(0, current - 0.06));
    }, 90);
    return () => {
      window.clearInterval(timer);
    };
  }, []);

  // Disconnect and destroy audio player on unmount
  useEffect(() => {
    const player = playerRef.current;
    return () => {
      disconnect();
      void player.destroy();
    };
  }, [disconnect]);

  // Decrement the session timer every second while connected
  useEffect(() => {
    if (!started || !sessionReady) {
      return;
    }
    const timer = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current === null) {
          return null;
        }
        return Math.max(0, current - 1);
      });
    }, 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, [sessionReady, started]);

  // Auto-scroll transcript to the bottom on new messages
  useLayoutEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcripts]);

  // ─── Session Actions ─────────────────────────────────────────────────────

  const startConversation = useCallback(
    async (instructionMode: InstructionMode, speakerProfile: SpeakerProfile) => {
      manualStopRef.current = false;
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
    manualStopRef.current = true;
    responseActiveRef.current = false;
    setStarted(false);
    setAssistantState("idle");
    setSessionReady(false);
    setAiLevel(0);
    setClientError(null);
    setRemainingSeconds(null);
    disconnect();
    await playerRef.current.stop();
    manualStopRef.current = false;
  }, [disconnect]);

  const toggleConversation = useCallback(async () => {
    if (isTogglingConversation) {
      return;
    }
    setIsTogglingConversation(true);
    try {
      if (started) {
        await stopConversation();
        return;
      }
      await startConversation(appliedInstructionMode, appliedSpeakerProfile);
    } finally {
      setIsTogglingConversation(false);
    }
  }, [
    appliedInstructionMode,
    appliedSpeakerProfile,
    isTogglingConversation,
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
    setRemainingSeconds(null);
    setClientError(null);
    setAiLevel(0);
    setBackendPhase(
      selectedInstructionMode === "english-learning"
        ? "english-learning"
        : "interview-prep",
    );

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

  // ─── Computed State ──────────────────────────────────────────────────────

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

  const interviewPhaseLabel = useMemo(
    () => resolvePhaseLabel(backendPhase),
    [backendPhase],
  );

  const hasReachedTimeLimit =
    started && (remainingSeconds === null || remainingSeconds <= 0);

  const remainingTimeTextClass = hasReachedTimeLimit
    ? "mt-1 font-semibold text-rose-400"
    : "mt-1 font-semibold text-cyan-100";

  return {
    started,
    isTogglingConversation,
    assistantState,
    sessionReady,
    transcripts,
    clientError,
    aiLevel,
    remainingSeconds,
    backendPhase,
    selectedInstructionMode,
    setSelectedInstructionMode,
    appliedInstructionMode,
    selectedSpeakerProfile,
    setSelectedSpeakerProfile,
    appliedSpeakerProfile,
    assistantName,
    statusLabels,
    combinedLevel,
    hasPendingInstructionChange,
    displayedError,
    assistantQuestionCount,
    userResponseCount,
    interviewPhaseLabel,
    hasReachedTimeLimit,
    remainingTimeTextClass,
    isSecureContext,
    transcriptEndRef,
    toggleConversation,
    applyInstructionChange,
  };
}
