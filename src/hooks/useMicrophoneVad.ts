"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { downsampleBuffer, rmsLevel, toPcm16 } from "@/lib/pcm";
import type {
  UseMicrophoneVadOptions,
  UseMicrophoneVadResult,
} from "@/types/useMicrophoneVad.type";

const TARGET_SAMPLE_RATE = 24000;

export function useMicrophoneVad({
  isActive,
  vadThreshold = 0.006,
  silenceMs = 800,
  onPcmChunk,
  onSpeechStart,
  onSpeechEnd,
}: UseMicrophoneVadOptions): UseMicrophoneVadResult {
  const [level, setLevel] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const speakingRef = useRef(false);
  const silenceStartRef = useRef<number | null>(null);
  const noiseFloorRef = useRef(0.006);

  const onPcmChunkRef = useRef(onPcmChunk);
  const onSpeechStartRef = useRef(onSpeechStart);
  const onSpeechEndRef = useRef(onSpeechEnd);
  const vadThresholdRef = useRef(vadThreshold);
  const silenceMsRef = useRef(silenceMs);

  useEffect(() => {
    onPcmChunkRef.current = onPcmChunk;
  }, [onPcmChunk]);
  useEffect(() => {
    onSpeechStartRef.current = onSpeechStart;
  }, [onSpeechStart]);
  useEffect(() => {
    onSpeechEndRef.current = onSpeechEnd;
  }, [onSpeechEnd]);
  useEffect(() => {
    vadThresholdRef.current = vadThreshold;
  }, [vadThreshold]);
  useEffect(() => {
    silenceMsRef.current = silenceMs;
  }, [silenceMs]);

  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const silentGainRef = useRef<GainNode | null>(null);

  const isSecureContextValue = useMemo(() => {
    if (typeof window === "undefined") {
      return true;
    }

    return window.isSecureContext || window.location.hostname === "localhost";
  }, []);

  const stopAudioPipeline = useCallback(async () => {
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    silentGainRef.current?.disconnect();

    processorRef.current = null;
    sourceRef.current = null;
    silentGainRef.current = null;

    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }

    if (contextRef.current) {
      await contextRef.current.close();
      contextRef.current = null;
    }

    speakingRef.current = false;
    silenceStartRef.current = null;
    noiseFloorRef.current = 0.006;
    setSpeaking(false);
    setLevel(0);
  }, []);

  useEffect(() => {
    if (!isActive) {
      void stopAudioPipeline();
      return;
    }

    if (!isSecureContextValue) {
      setError(
        "Microphone requires HTTPS on mobile and production environments.",
      );
      return;
    }

    let mounted = true;

    const setupAudio = async () => {
      try {
        setError(null);

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            noiseSuppression: true,
            echoCancellation: true,
            autoGainControl: true,
          },
        });

        if (!mounted) {
          for (const track of mediaStream.getTracks()) {
            track.stop();
          }
          return;
        }

        const audioContext = new AudioContext({ latencyHint: "interactive" });
        if (audioContext.state === "suspended") {
          await audioContext.resume();
        }

        const sourceNode = audioContext.createMediaStreamSource(mediaStream);
        const processorNode = audioContext.createScriptProcessor(2048, 1, 1);
        const silentGain = audioContext.createGain();
        silentGain.gain.value = 0;

        sourceNode.connect(processorNode);
        processorNode.connect(silentGain);
        silentGain.connect(audioContext.destination);

        processorNode.onaudioprocess = (event) => {
          const input = event.inputBuffer.getChannelData(0);
          const inputCopy = new Float32Array(input);
          const frameRms = rmsLevel(inputCopy);
          const normalizedLevel = Math.min(1, frameRms * 15);

          const currentVadThreshold = vadThresholdRef.current;
          const currentSilenceMs = silenceMsRef.current;

          if (!speakingRef.current) {
            noiseFloorRef.current =
              noiseFloorRef.current * 0.95 + frameRms * 0.05;
          }

          const dynamicThreshold = Math.max(
            currentVadThreshold,
            noiseFloorRef.current * 2.5 + 0.002,
          );
          const startThreshold = dynamicThreshold * 1.2;
          const stopThreshold = dynamicThreshold * 0.7;

          const isSpeech = speakingRef.current
            ? frameRms > stopThreshold
            : frameRms > startThreshold;

          const displayLevel = isSpeech
            ? normalizedLevel
            : Math.min(0.012, normalizedLevel * 0.08);

          const smoothing = isSpeech ? 0.25 : 0.08;
          const decay = isSpeech ? 0.75 : 0.55;

          setLevel((prev) => prev * decay + displayLevel * smoothing);
          const now = performance.now();

          if (isSpeech) {
            silenceStartRef.current = null;

            if (!speakingRef.current) {
              speakingRef.current = true;
              setSpeaking(true);
              onSpeechStartRef.current?.();
            }
          } else if (speakingRef.current) {
            if (silenceStartRef.current === null) {
              silenceStartRef.current = now;
            }

            if (now - silenceStartRef.current >= currentSilenceMs) {
              speakingRef.current = false;
              setSpeaking(false);
              silenceStartRef.current = null;
              onSpeechEndRef.current?.();
            }
          }

          const resampled =
            audioContext.sampleRate === TARGET_SAMPLE_RATE
              ? inputCopy
              : downsampleBuffer(
                  inputCopy,
                  audioContext.sampleRate,
                  TARGET_SAMPLE_RATE,
                );

          const pcm16 = toPcm16(resampled);
          const payload = new ArrayBuffer(pcm16.byteLength);
          new Int16Array(payload).set(pcm16);
          onPcmChunkRef.current(payload);
        };

        streamRef.current = mediaStream;
        contextRef.current = audioContext;
        sourceRef.current = sourceNode;
        processorRef.current = processorNode;
        silentGainRef.current = silentGain;
      } catch (setupError) {
        const message =
          setupError instanceof Error
            ? setupError.message
            : "Failed to access microphone. Please check browser permissions.";

        setError(message);
      }
    };

    void setupAudio();

    return () => {
      mounted = false;
      void stopAudioPipeline();
    };
  }, [isActive, isSecureContextValue, stopAudioPipeline]);

  return {
    level,
    speaking,
    error,
    isSecureContext: isSecureContextValue,
  };
}
