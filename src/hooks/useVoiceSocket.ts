"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { resolveVoiceSocketUrl } from "@/config/runtime";
import type { ServerEvent } from "@/types/voice";

type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

interface UseVoiceSocketOptions {
  onAudioChunk: (chunk: ArrayBuffer) => void;
  onServerEvent: (event: ServerEvent) => void;
}

interface UseVoiceSocketResult {
  status: ConnectionStatus;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  sendAudioChunk: (chunk: ArrayBuffer) => void;
  cancelAssistant: () => void;
  requestResponse: () => void;
}

function withHint(message: string, hint?: string): string {
  if (!hint) return message;
  return `${message} ${hint}`;
}

function normalizeBackendError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("require is not defined")) {
    return "Backend SDK runtime error while creating voice session.";
  }

  if (
    normalized.includes("401") ||
    normalized.includes("403") ||
    normalized.includes("unauthorized") ||
    normalized.includes("forbidden")
  ) {
    return "Azure authentication failed.";
  }

  return message;
}

function mapTransportError(wsUrl: string): string {
  return withHint(
    "Could not connect to the voice backend server.",
    `Make sure backend is running and NEXT_PUBLIC_BACKEND_HTTP_URL or NEXT_PUBLIC_BACKEND_WS_URL points to ${wsUrl}.`,
  );
}

function mapCloseError(code: number, reason: string, wsUrl: string): string {
  if (code === 1011) {
    return withHint(
      "Backend failed while creating voice session.",
      "Check backend logs for Azure SDK or credential issues.",
    );
  }

  if (code === 1006) {
    return withHint(
      "Connection to backend closed unexpectedly.",
      `Confirm backend is reachable at ${wsUrl}.`,
    );
  }

  if (reason) {
    return withHint(`Connection closed: ${reason}.`, `Close code: ${code}.`);
  }

  return withHint(
    "Connection closed before session was ready.",
    `Close code: ${code}.`,
  );
}

export function useVoiceSocket({
  onAudioChunk,
  onServerEvent,
}: UseVoiceSocketOptions): UseVoiceSocketResult {
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);

  const wsUrl = useMemo(() => {
    return resolveVoiceSocketUrl();
  }, []);

  const connect = useCallback(async () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      return;
    }

    if (!wsUrl) {
      const message =
        "Voice backend URL is missing. Configure NEXT_PUBLIC_BACKEND_HTTP_URL or NEXT_PUBLIC_BACKEND_WS_URL.";
      setStatus("error");
      setError(message);
      throw new Error(message);
    }

    setStatus("connecting");
    setError(null);

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const socket = new WebSocket(wsUrl);
      socket.binaryType = "arraybuffer";

      const rejectOnce = (message: string) => {
        if (settled) return;
        settled = true;
        reject(new Error(message));
      };

      socket.onopen = () => {
        settled = true;
        socketRef.current = socket;
        setStatus("connected");
        socket.send(JSON.stringify({ type: "session.start" }));
        resolve();
      };

      socket.onerror = () => {
        const message = mapTransportError(wsUrl);
        setStatus("error");
        setError(message);
        rejectOnce(message);
      };

      socket.onclose = (event) => {
        socketRef.current = null;

        if (!settled) {
          const message = mapCloseError(event.code, event.reason, wsUrl);
          setStatus("error");
          setError(message);
          rejectOnce(message);
          return;
        }

        setStatus((current) =>
          current === "error" ? "error" : "disconnected",
        );
      };

      socket.onmessage = (message) => {
        if (message.data instanceof ArrayBuffer) {
          onAudioChunk(message.data);
          return;
        }

        if (message.data instanceof Blob) {
          void message.data.arrayBuffer().then(onAudioChunk);
          return;
        }

        try {
          const parsed = JSON.parse(message.data as string) as ServerEvent;
          if (parsed.type === "error") {
            const readable = withHint(
              normalizeBackendError(parsed.message),
              parsed.hint,
            );
            setError(readable);
            setStatus("error");
            onServerEvent({ ...parsed, message: readable });
            return;
          }
          onServerEvent(parsed);
        } catch {
          setError(
            "Invalid message received from backend. Check backend logs and restart the server.",
          );
        }
      };
    });
  }, [onAudioChunk, onServerEvent, wsUrl]);

  const disconnect = useCallback(() => {
    if (!socketRef.current) {
      return;
    }

    socketRef.current.close();
    socketRef.current = null;
    setStatus("disconnected");
  }, []);

  const sendAudioChunk = useCallback((chunk: ArrayBuffer) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    socketRef.current.send(chunk);
  }, []);

  const cancelAssistant = useCallback(() => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    socketRef.current.send(JSON.stringify({ type: "response.cancel" }));
  }, []);

  const requestResponse = useCallback(() => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    socketRef.current.send(JSON.stringify({ type: "response.create" }));
  }, []);

  return {
    status,
    error,
    connect,
    disconnect,
    sendAudioChunk,
    cancelAssistant,
    requestResponse,
  };
}
