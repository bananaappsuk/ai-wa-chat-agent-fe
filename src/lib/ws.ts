import { WS_BASE, tokenStore } from "./api";

export type WSEvent = { event: string; data: unknown };

export class ChatSocket {
  private ws: WebSocket | null = null;
  private listeners = new Set<(e: WSEvent) => void>();
  private reconnectTimer: number | null = null;
  private pollTimer: number | null = null;
  private pollFn: (() => void) | null = null;
  private retries = 0;

  connect(pollFallback?: () => void) {
    this.pollFn = pollFallback || null;
    const token = tokenStore.get();
    if (!token) return;
    try {
      const ws = new WebSocket(`${WS_BASE}/ws/chat?token=${encodeURIComponent(token)}`);
      this.ws = ws;
      ws.onopen = () => {
        this.retries = 0;
        this.stopPolling();
      };
      ws.onmessage = (msg) => {
        try {
          const parsed = JSON.parse(msg.data) as WSEvent;
          if (parsed.event === "ping") return;
          this.listeners.forEach((cb) => cb(parsed));
        } catch {
          /* ignore */
        }
      };
      ws.onclose = () => {
        this.scheduleReconnect();
        this.startPolling();
      };
      ws.onerror = () => {
        try {
          ws.close();
        } catch {
          /* ignore */
        }
      };
    } catch {
      this.startPolling();
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    const delay = Math.min(30000, 1000 * Math.pow(2, this.retries++));
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect(this.pollFn || undefined);
    }, delay);
  }

  private startPolling() {
    if (this.pollTimer || !this.pollFn) return;
    this.pollTimer = window.setInterval(() => this.pollFn && this.pollFn(), 5000);
  }

  private stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  on(cb: (e: WSEvent) => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  close() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopPolling();
    this.listeners.clear();
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        /* ignore */
      }
      this.ws = null;
    }
  }
}
