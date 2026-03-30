"use client";

import { useEffect, useRef } from "react";
import type { AssistantState } from "@/types/voice";

interface VoiceWaveProps {
  level: number;
  state: AssistantState;
}

const MODE_BASELINE: Record<AssistantState, number> = {
  "idle": 0.03,
  "connecting": 0.05,
  "listening": 0.06,
  "user-speaking": 0.16,
  "thinking": 0.11,
  "assistant-speaking": 0.24,
  "error": 0.05,
  "disconnected": 0.03,
};

export function VoiceWave({ level, state }: VoiceWaveProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const levelRef = useRef(level);
  const stateRef = useRef(state);
  const smoothLevelRef = useRef(level);

  useEffect(() => {
    levelRef.current = level;
    stateRef.current = state;
  }, [level, state]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    let frameId = 0;
    const startedAt = performance.now();

    const draw = (time: number) => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const baselineY = Math.floor(height * 0.5);
      const currentState = stateRef.current;
      const targetLevel = Math.max(
        MODE_BASELINE[currentState],
        levelRef.current,
      );

      smoothLevelRef.current =
        smoothLevelRef.current * 0.84 + targetLevel * 0.16;

      context.clearRect(0, 0, width, height);

      const normalized = Math.min(1, smoothLevelRef.current * 1.85);
      const pulse = 0.74 + Math.sin((time - startedAt) * 0.0055) * 0.26;
      const thinkingMod =
        currentState === "thinking"
          ? 0.82 + Math.sin(time * 0.004) * 0.18
          : currentState === "assistant-speaking"
            ? 1.14
            : currentState === "user-speaking"
              ? 1.08
              : 1;
      const amplitude =
        Math.max(MODE_BASELINE[currentState], normalized) * pulse * thinkingMod;

      const bars = 64;
      const gap = width / bars;
      const spikeWidth = Math.max(1.35, gap * 0.48);
      context.lineWidth = spikeWidth;
      context.lineCap = "round";

      for (let i = 0; i < bars; i += 1) {
        const x = i * gap;
        const lineX = x + spikeWidth / 2;
        const normalizedX = i / bars;
        const waveA = Math.sin(normalizedX * Math.PI * 8 + time * 0.008);
        const waveB = Math.sin(normalizedX * Math.PI * 16 - time * 0.004);
        const envelope = Math.sin(normalizedX * Math.PI);

        const strength = 0.45 + Math.abs(waveA * 0.7 + waveB * 0.3);
        const barHeight = 3 + envelope * amplitude * 48 * strength;

        const fullGradient = context.createLinearGradient(
          x,
          baselineY - barHeight,
          x,
          baselineY + barHeight,
        );
        fullGradient.addColorStop(0, "rgba(255, 62, 182, 0.98)");
        fullGradient.addColorStop(0.45, "rgba(221, 74, 255, 0.95)");
        fullGradient.addColorStop(0.55, "rgba(77, 186, 255, 0.95)");
        fullGradient.addColorStop(1, "rgba(43, 233, 255, 0.98)");

        context.strokeStyle = fullGradient;
        context.beginPath();
        context.moveTo(lineX, baselineY - barHeight);
        context.lineTo(lineX, baselineY + barHeight);
        context.stroke();
      }

      frameId = requestAnimationFrame(draw);
    };

    frameId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className="relative w-full">
      <div className="absolute inset-x-8 top-1/2 h-20 -translate-y-1/2 rounded-full bg-cyan-400/20 blur-2xl" />
      <canvas
        ref={canvasRef}
        className="relative h-[150px] w-full rounded-2xl border border-indigo-900 bg-[#090e38]"
      />
    </div>
  );
}
