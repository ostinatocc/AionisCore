import { useEffect, useRef, useState } from "preact/hooks";

/**
 * Reconnect-aware WebSocket hook for the Workbench daemon.
 *
 * Contract with the daemon:
 *  - Every message is JSON with at least `{"id": number, "type": string}`
 *  - On reconnect the hook reopens the socket with `?since=<lastId>`; the
 *    daemon replays buffered events (up to 500 per channel).
 *  - The hook never processes the same event id twice.
 *
 * The hook is deliberately transport-focused. Page state, grouping, and
 * reducers live in the consumer.
 */

export interface WebSocketEvent {
  id?: number;
  type?: string;
  [key: string]: unknown;
}

export interface UseWebSocketOptions {
  url: string | null;
  /** Called for every parsed event, in daemon order. */
  onEvent?: (event: WebSocketEvent) => void;
  /** Token, added as `?token=` if the URL does not already carry one. */
  token?: string;
  /** Milliseconds between reconnect attempts. Defaults to 2000. */
  reconnectDelayMs?: number;
  /** Max reconnect attempts before the hook gives up and surfaces `error`. */
  maxReconnectAttempts?: number;
  /** If true, the hook is inert (useful when the page is hidden). */
  paused?: boolean;
}

export type WebSocketStatus =
  | "idle"
  | "connecting"
  | "open"
  | "closing"
  | "closed"
  | "error";

export interface WebSocketHandle {
  status: WebSocketStatus;
  lastEventId: number | null;
  attempts: number;
  send: (payload: unknown) => void;
  close: () => void;
}

export function useWebSocket(options: UseWebSocketOptions): WebSocketHandle {
  const {
    url,
    onEvent,
    token,
    reconnectDelayMs = 2000,
    maxReconnectAttempts = 10,
    paused = false,
  } = options;

  const [status, setStatus] = useState<WebSocketStatus>("idle");
  const [attempts, setAttempts] = useState(0);
  const [lastEventId, setLastEventId] = useState<number | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const lastEventIdRef = useRef<number | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimer();
      closeSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (paused || !url) {
      closeSocket();
      setStatus("idle");
      return;
    }
    connect(0);
    return () => {
      clearTimer();
      closeSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, token, paused]);

  function clearTimer() {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function closeSocket() {
    const socket = socketRef.current;
    socketRef.current = null;
    if (!socket) return;
    try {
      setStatus("closing");
      socket.close();
    } catch {
      // best-effort
    }
  }

  function connect(attempt: number) {
    if (!url || paused) return;
    setAttempts(attempt);
    setStatus("connecting");
    const since = lastEventIdRef.current;
    const resolved = buildUrl(url, { token, since });
    let socket: WebSocket;
    try {
      socket = new WebSocket(resolved);
    } catch (err) {
      scheduleReconnect(attempt, err);
      return;
    }
    socketRef.current = socket;

    socket.onopen = () => {
      if (!mountedRef.current) return;
      setStatus("open");
      setAttempts(0);
    };

    socket.onmessage = (event) => {
      if (!mountedRef.current) return;
      const data = event.data;
      if (typeof data !== "string") return;
      let parsed: WebSocketEvent | null = null;
      try {
        parsed = JSON.parse(data) as WebSocketEvent;
      } catch {
        return;
      }
      if (!parsed || typeof parsed !== "object") return;
      const id = typeof parsed.id === "number" ? parsed.id : null;
      if (id !== null) {
        if (lastEventIdRef.current !== null && id <= lastEventIdRef.current) {
          return;
        }
        lastEventIdRef.current = id;
        setLastEventId(id);
      }
      try {
        onEventRef.current?.(parsed);
      } catch (err) {
        // Subscriber-side error should never break the socket.
        if (typeof console !== "undefined" && console.error) {
          console.error("useWebSocket onEvent handler threw", err);
        }
      }
    };

    socket.onerror = () => {
      if (!mountedRef.current) return;
      setStatus("error");
    };

    socket.onclose = () => {
      if (!mountedRef.current) return;
      setStatus("closed");
      if (!paused) scheduleReconnect(attempt);
    };
  }

  function scheduleReconnect(attempt: number, _err?: unknown) {
    if (!mountedRef.current) return;
    const next = attempt + 1;
    if (next > maxReconnectAttempts) {
      setStatus("error");
      return;
    }
    clearTimer();
    timerRef.current = setTimeout(() => {
      connect(next);
    }, reconnectDelayMs);
  }

  return {
    status,
    lastEventId,
    attempts,
    send: (payload) => {
      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) return;
      socket.send(typeof payload === "string" ? payload : JSON.stringify(payload));
    },
    close: () => {
      clearTimer();
      closeSocket();
    },
  };
}

function buildUrl(url: string, params: { token?: string; since?: number | null }): string {
  try {
    const u = new URL(url);
    if (params.token && !u.searchParams.has("token")) u.searchParams.set("token", params.token);
    if (params.since !== null && params.since !== undefined) {
      u.searchParams.set("since", String(params.since));
    }
    return u.toString();
  } catch {
    // `url` may be relative (e.g. "/v1/events") — fall back to string concat.
    const joiner = url.includes("?") ? "&" : "?";
    const parts: string[] = [];
    if (params.token) parts.push(`token=${encodeURIComponent(params.token)}`);
    if (params.since !== null && params.since !== undefined) {
      parts.push(`since=${encodeURIComponent(String(params.since))}`);
    }
    return parts.length > 0 ? `${url}${joiner}${parts.join("&")}` : url;
  }
}
