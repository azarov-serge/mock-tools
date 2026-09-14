import type { SseClientSink, WsClientSink } from './connection';

/** Минимальный хост для mock EventSource / WebSocket. */
export type PushHost = {
  connectSse(
    url: string,
    headers: Record<string, string>,
    sink: SseClientSink,
  ): { close: () => void } | null;

  connectWs(
    url: string,
    headers: Record<string, string>,
    sink: WsClientSink,
  ): {
    send: (data: string) => void;
    close: (code?: number, reason?: string) => void;
  } | null;
};

type ListenerMap = Map<string, Set<EventListenerOrEventListenerObject>>;

function createCloseEvent(
  type: string,
  init: { code: number; reason: string; wasClean: boolean },
): CloseEvent {
  if (typeof CloseEvent !== 'undefined') {
    return new CloseEvent(type, init);
  }
  const ev = new Event(type) as CloseEvent;
  Object.defineProperties(ev, {
    code: { value: init.code },
    reason: { value: init.reason },
    wasClean: { value: init.wasClean },
  });
  return ev;
}

function createMessageEvent(type: string, data: string): MessageEvent {
  if (typeof MessageEvent !== 'undefined') {
    return new MessageEvent(type, { data });
  }
  const ev = new Event(type) as MessageEvent;
  Object.defineProperty(ev, 'data', { value: data });
  return ev;
}

function addListener(
  map: ListenerMap,
  type: string,
  listener: EventListenerOrEventListenerObject,
): void {
  let set = map.get(type);
  if (!set) {
    set = new Set();
    map.set(type, set);
  }
  set.add(listener);
}

function removeListener(
  map: ListenerMap,
  type: string,
  listener: EventListenerOrEventListenerObject,
): void {
  map.get(type)?.delete(listener);
}

function dispatch(
  map: ListenerMap,
  type: string,
  event: Event,
  also?: ((ev: Event) => void) | null,
): void {
  if (also) also(event);
  const set = map.get(type);
  if (!set) return;
  for (const listener of set) {
    if (typeof listener === 'function') listener(event);
    else listener.handleEvent(event);
  }
}

/** EventSource-совместимый клиент → api.sse */
export class MockEventSource {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;

  readonly CONNECTING = 0;
  readonly OPEN = 1;
  readonly CLOSED = 2;

  readonly url: string;
  readonly withCredentials: boolean;
  readyState: number = MockEventSource.CONNECTING;

  onopen: ((ev: Event) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;

  private readonly listeners: ListenerMap = new Map();
  private dispose: (() => void) | null = null;

  constructor(host: PushHost, url: string, eventSourceInitDict?: EventSourceInit) {
    this.url = url;
    this.withCredentials = eventSourceInitDict?.withCredentials ?? false;

    queueMicrotask(() => {
      if (this.readyState === MockEventSource.CLOSED) return;

      const attached = host.connectSse(
        url,
        {},
        {
          onOpen: () => {
            this.readyState = MockEventSource.OPEN;
            dispatch(this.listeners, 'open', new Event('open'), this.onopen);
          },
          onMessage: (eventType, data) => {
            const ev = createMessageEvent(eventType, data);
            if (eventType === 'message') {
              dispatch(
                this.listeners,
                'message',
                ev,
                this.onmessage as ((e: Event) => void) | null,
              );
            } else {
              dispatch(this.listeners, eventType, ev, null);
            }
          },
          onError: () => {
            this.readyState = MockEventSource.CLOSED;
            dispatch(this.listeners, 'error', new Event('error'), this.onerror);
          },
        },
      );

      if (!attached) {
        this.readyState = MockEventSource.CLOSED;
        dispatch(this.listeners, 'error', new Event('error'), this.onerror);
        return;
      }

      this.dispose = attached.close;
    });
  }

  close(): void {
    if (this.readyState === MockEventSource.CLOSED) return;
    this.readyState = MockEventSource.CLOSED;
    this.dispose?.();
    this.dispose = null;
  }

  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    _options?: boolean | AddEventListenerOptions,
  ): void {
    addListener(this.listeners, type, listener);
  }

  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    _options?: boolean | EventListenerOptions,
  ): void {
    removeListener(this.listeners, type, listener);
  }

  dispatchEvent(_event: Event): boolean {
    return false;
  }
}

/** WebSocket-совместимый клиент → api.ws */
export class MockWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readonly CONNECTING = 0;
  readonly OPEN = 1;
  readonly CLOSING = 2;
  readonly CLOSED = 3;

  readonly url: string;
  readonly protocol: string;
  readonly extensions = '';
  readonly bufferedAmount = 0;
  binaryType: BinaryType = 'blob';

  readyState: number = MockWebSocket.CONNECTING;

  onopen: ((ev: Event) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  onclose: ((ev: CloseEvent) => void) | null = null;

  private readonly listeners: ListenerMap = new Map();
  private sendToServer: ((data: string) => void) | null = null;
  private closeServer: ((code?: number, reason?: string) => void) | null = null;

  constructor(host: PushHost, url: string, protocols?: string | string[]) {
    this.url = url;
    if (Array.isArray(protocols)) {
      this.protocol = protocols[0] ?? '';
    } else {
      this.protocol = protocols ?? '';
    }

    queueMicrotask(() => {
      if (this.readyState === MockWebSocket.CLOSED) return;

      const attached = host.connectWs(
        url,
        {},
        {
          onOpen: () => {
            this.readyState = MockWebSocket.OPEN;
            dispatch(this.listeners, 'open', new Event('open'), this.onopen);
          },
          onMessage: (data) => {
            const ev = createMessageEvent('message', data);
            dispatch(this.listeners, 'message', ev, this.onmessage as ((e: Event) => void) | null);
          },
          onClose: (code, reason) => {
            this.readyState = MockWebSocket.CLOSED;
            const ev = createCloseEvent('close', {
              code,
              reason,
              wasClean: code === 1000,
            });
            dispatch(this.listeners, 'close', ev, this.onclose as ((e: Event) => void) | null);
          },
          onError: () => {
            this.readyState = MockWebSocket.CLOSED;
            dispatch(this.listeners, 'error', new Event('error'), this.onerror);
          },
        },
      );

      if (!attached) {
        this.readyState = MockWebSocket.CLOSED;
        dispatch(this.listeners, 'error', new Event('error'), this.onerror);
        return;
      }

      this.sendToServer = attached.send;
      this.closeServer = attached.close;
    });
  }

  send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
    let text: string;
    if (typeof data === 'string') {
      text = data;
    } else if (data instanceof ArrayBuffer) {
      text = new TextDecoder().decode(data);
    } else if (ArrayBuffer.isView(data)) {
      text = new TextDecoder().decode(data);
    } else {
      text = String(data);
    }
    this.sendToServer?.(text);
  }

  close(code?: number, reason?: string): void {
    if (this.readyState === MockWebSocket.CLOSING || this.readyState === MockWebSocket.CLOSED) {
      return;
    }
    this.readyState = MockWebSocket.CLOSING;
    this.closeServer?.(code ?? 1000, reason ?? '');
    this.readyState = MockWebSocket.CLOSED;
  }

  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    _options?: boolean | AddEventListenerOptions,
  ): void {
    addListener(this.listeners, type, listener);
  }

  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    _options?: boolean | EventListenerOptions,
  ): void {
    removeListener(this.listeners, type, listener);
  }

  dispatchEvent(_event: Event): boolean {
    return false;
  }
}

export type MockTransport = {
  EventSource: new (url: string, eventSourceInitDict?: EventSourceInit) => MockEventSource;
  WebSocket: new (url: string, protocols?: string | string[]) => MockWebSocket;
};

/** Фабрики с тем же API, что у браузера, привязанные к api. */
export function createMockTransport(host: PushHost): MockTransport {
  return {
    EventSource: class extends MockEventSource {
      constructor(url: string, eventSourceInitDict?: EventSourceInit) {
        super(host, url, eventSourceInitDict);
      }
    },
    WebSocket: class extends MockWebSocket {
      constructor(url: string, protocols?: string | string[]) {
        super(host, url, protocols);
      }
    },
  };
}

/**
 * Патчит `globalThis.EventSource` / `WebSocket`.
 * Возвращает restore — снять патч.
 */
export function installMockTransport(host: PushHost): () => void {
  const transport = createMockTransport(host);
  const g = globalThis as Record<string, unknown>;
  const prevES = g.EventSource;
  const prevWS = g.WebSocket;
  g.EventSource = transport.EventSource;
  g.WebSocket = transport.WebSocket;
  return () => {
    g.EventSource = prevES;
    g.WebSocket = prevWS;
  };
}
