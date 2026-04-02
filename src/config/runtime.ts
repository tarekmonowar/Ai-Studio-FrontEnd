function toWsUrl(httpBaseUrl: string): string {
  const parsed = new URL(httpBaseUrl);
  parsed.protocol = parsed.protocol === "https:" ? "wss:" : "ws:";
  parsed.pathname = "/ws";
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString();
}

function normalizeHttpBase(httpBaseUrl: string): string {
  const parsed = new URL(httpBaseUrl);
  parsed.pathname = "";
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString().replace(/\/$/, "");
}

export function resolveBackendHttpUrl(): string {
  const httpBase = process.env.NEXT_PUBLIC_BACKEND_HTTP_URL;
  if (httpBase && httpBase.length > 0) {
    try {
      return normalizeHttpBase(httpBase);
    } catch {
      // Fall through to same-host development default.
    }
  }

  if (typeof window === "undefined") {
    return "http://localhost:8787";
  }

  return `${window.location.protocol}//${window.location.hostname}:8787`;
}

export function resolveVoiceSocketUrl(): string {
  if (typeof window === "undefined") {
    return "";
  }

  const wsOverride = process.env.NEXT_PUBLIC_BACKEND_WS_URL;
  if (wsOverride && wsOverride.length > 0) {
    return wsOverride;
  }

  const httpBase = process.env.NEXT_PUBLIC_BACKEND_HTTP_URL;
  if (httpBase && httpBase.length > 0) {
    try {
      return toWsUrl(httpBase);
    } catch {
      // Fall back to same-host development defaults when env is malformed.
    }
  }

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.hostname}:8787/ws`;
}
