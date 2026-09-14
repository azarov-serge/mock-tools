export type SseConnection = {
  /** Path params from the SSE route pattern (e.g. `/servers/:id/metrics`). */
  params: Record<string, string>;
  send(data: unknown, event?: string): void;
  close(): void;
  onClose(cb: () => void): void;
};

export type WsSocket = {
  params: Record<string, string>;
  send(data: unknown): void;
  close(code?: number, reason?: string): void;
  onMessage(cb: (data: string) => void): void;
  onClose(cb: () => void): void;
};

export type SseHandler<TContext = unknown> = (
  connection: SseConnection,
  ctx: TContext,
) => void | Promise<void>;

export type WsHandler<TContext = unknown> = (
  socket: WsSocket,
  ctx: TContext,
) => void | Promise<void>;

export type SseClientSink = {
  onOpen: () => void;
  onMessage: (eventType: string, data: string) => void;
  onError: () => void;
};

export type WsClientSink = {
  onOpen: () => void;
  onMessage: (data: string) => void;
  onClose: (code: number, reason: string) => void;
  onError: () => void;
};

export function encodePushPayload(data: unknown): string {
  if (typeof data === 'string') return data;
  return JSON.stringify(data);
}

export class SseConnectionImpl implements SseConnection {
  private closed = false;
  private readonly closeListeners: Array<() => void> = [];
  readonly params: Record<string, string>;

  constructor(
    private readonly sink: SseClientSink,
    params: Record<string, string> = {},
  ) {
    this.params = params;
  }

  send(data: unknown, event = 'message'): void {
    if (this.closed) return;
    this.sink.onMessage(event, encodePushPayload(data));
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    for (const cb of this.closeListeners) cb();
  }

  onClose(cb: () => void): void {
    if (this.closed) {
      cb();
      return;
    }
    this.closeListeners.push(cb);
  }

  get isClosed(): boolean {
    return this.closed;
  }
}

export class WsSocketImpl implements WsSocket {
  private closed = false;
  private readonly messageListeners: Array<(data: string) => void> = [];
  private readonly closeListeners: Array<() => void> = [];
  readonly params: Record<string, string>;

  constructor(
    private readonly sink: WsClientSink,
    params: Record<string, string> = {},
  ) {
    this.params = params;
  }

  send(data: unknown): void {
    if (this.closed) return;
    this.sink.onMessage(encodePushPayload(data));
  }

  close(code = 1000, reason = ''): void {
    if (this.closed) return;
    this.closed = true;
    for (const cb of this.closeListeners) cb();
    this.sink.onClose(code, reason);
  }

  onMessage(cb: (data: string) => void): void {
    this.messageListeners.push(cb);
  }

  onClose(cb: () => void): void {
    if (this.closed) {
      cb();
      return;
    }
    this.closeListeners.push(cb);
  }

  /** Сообщение от клиентского WebSocket.send */
  receiveFromClient(data: string): void {
    if (this.closed) return;
    for (const cb of this.messageListeners) cb(data);
  }

  get isClosed(): boolean {
    return this.closed;
  }
}
