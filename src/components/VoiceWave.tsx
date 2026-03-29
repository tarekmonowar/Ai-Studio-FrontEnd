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
      const centerY = height / 2;
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

      const bars = 58;
      const gap = width / bars;
      const barWidth = Math.max(2, gap * 0.6);

      for (let i = 0; i < bars; i += 1) {
        const x = i * gap;
        const normalizedX = i / bars;
        const waveA = Math.sin(normalizedX * Math.PI * 8 + time * 0.008);
        const waveB = Math.sin(normalizedX * Math.PI * 16 - time * 0.004);
        const envelope = Math.sin(normalizedX * Math.PI);

        const strength = 0.45 + Math.abs(waveA * 0.7 + waveB * 0.3);
        const barHeight = 8 + envelope * amplitude * 120 * strength;

        const gradient = context.createLinearGradient(
          x,
          centerY - barHeight,
          x,
          centerY + barHeight,
        );
        gradient.addColorStop(0, "rgba(45, 212, 191, 0.08)");
        gradient.addColorStop(0.35, "rgba(45, 212, 191, 0.95)");
        gradient.addColorStop(0.65, "rgba(125, 211, 252, 0.95)");
        gradient.addColorStop(1, "rgba(125, 211, 252, 0.08)");

        context.fillStyle = gradient;
        context.fillRect(x, centerY - barHeight / 2, barWidth, barHeight);
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
      <div className="absolute inset-x-8 top-1/2 h-24 -translate-y-1/2 rounded-full bg-cyan-400/20 blur-2xl" />
      <canvas
        ref={canvasRef}
        className="relative h-[180px] w-full rounded-2xl border border-cyan-400/25 bg-slate-950/55"
      />
    </div>
  );
}
