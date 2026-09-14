import { afterEach, describe, expect, it } from 'vitest';
import { Api } from '../core/api';
import { createMockTransport, installMockTransport } from './mock-transport';

describe('SSE / WebSocket', () => {
  let restore: (() => void) | undefined;

  afterEach(() => {
    restore?.();
    restore = undefined;
  });

  it('EventSource receives SSE messages and closes', async () => {
    const api = new Api({ delay: false });
    api.sse('/tasks/stream', (connection) => {
      connection.send({ type: 'created', id: 1 });
      connection.send({ type: 'ping' }, 'ping');
    });

    const { EventSource } = createMockTransport(api);
    const es = new EventSource('https://api.mock/tasks/stream');

    const [message, ping] = await Promise.all([
      new Promise<MessageEvent>((resolve, reject) => {
        es.onerror = () => reject(new Error('SSE error'));
        es.onmessage = (ev) => resolve(ev);
      }),
      new Promise<MessageEvent>((resolve) => {
        es.addEventListener('ping', (ev) => resolve(ev as MessageEvent));
      }),
    ]);

    expect(JSON.parse(message.data as string)).toEqual({
      type: 'created',
      id: 1,
    });
    expect(JSON.parse(ping.data as string)).toEqual({ type: 'ping' });

    es.close();
    expect(es.readyState).toBe(EventSource.CLOSED);
  });

  it('es.close() runs connection.onClose', async () => {
    const api = new Api({ delay: false });
    let closed = false;

    api.sse('/stream', (connection) => {
      connection.onClose(() => {
        closed = true;
      });
    });

    const { EventSource } = createMockTransport(api);
    const es = new EventSource('https://api.mock/stream');

    await new Promise<void>((resolve, reject) => {
      es.onopen = () => resolve();
      es.onerror = () => reject(new Error('SSE error'));
    });

    es.close();
    expect(closed).toBe(true);
  });

  it('WebSocket echo via installMockTransport', async () => {
    const api = new Api({ delay: false });
    api.ws('/tasks', (socket) => {
      socket.send({ type: 'hello' });
      socket.onMessage((msg) => {
        socket.send({ echo: JSON.parse(msg) });
      });
    });

    restore = installMockTransport(api);
    const WS = globalThis.WebSocket as unknown as new (url: string) => WebSocket;
    const ws = new WS('wss://api.mock/tasks');

    const hello = await new Promise<MessageEvent>((resolve, reject) => {
      ws.onerror = () => reject(new Error('WS error'));
      ws.onmessage = (ev) => resolve(ev);
    });
    expect(JSON.parse(hello.data as string)).toEqual({ type: 'hello' });

    const echo = await new Promise<MessageEvent>((resolve) => {
      ws.onmessage = (ev) => resolve(ev);
      ws.send(JSON.stringify({ id: 7 }));
    });
    expect(JSON.parse(echo.data as string)).toEqual({ echo: { id: 7 } });

    ws.close();
    expect(ws.readyState).toBe(WS.CLOSED);
  });

  it('unknown SSE path fires error', async () => {
    const api = new Api({ delay: false });
    const { EventSource } = createMockTransport(api);
    const es = new EventSource('https://api.mock/missing');

    await new Promise<void>((resolve) => {
      es.onerror = () => resolve();
    });
    expect(es.readyState).toBe(EventSource.CLOSED);
  });

  it('sse handler receives path params on connection', async () => {
    const api = new Api({ delay: false });
    api.sse('/rooms/:id/stream', (connection) => {
      connection.send({ id: connection.params.id });
    });

    const { EventSource } = createMockTransport(api);
    const es = new EventSource('https://api.mock/rooms/42/stream');

    const message = await new Promise<MessageEvent>((resolve, reject) => {
      es.onerror = () => reject(new Error('SSE error'));
      es.onmessage = (ev) => resolve(ev);
    });

    expect(JSON.parse(message.data as string)).toEqual({ id: '42' });
    es.close();
  });

  it('listPushRoutes returns sse and ws paths', () => {
    const api = new Api({ delay: false });
    api.sse('/metrics', () => undefined);
    api.ws('/feed', () => undefined);
    expect(api.listPushRoutes()).toEqual([
      { kind: 'sse', path: '/metrics' },
      { kind: 'ws', path: '/feed' },
    ]);
  });

  it('enabled push channel ticks payload and skips app handler', async () => {
    const api = new Api({ delay: false });
    let handlerCalls = 0;
    api.sse('/tick', () => {
      handlerCalls += 1;
    });

    api.setPushChannel('sse', '/tick', {
      enabled: true,
      periodMs: 50,
      payload: { n: 1 },
    });

    const { EventSource } = createMockTransport(api);
    const es = new EventSource('https://api.mock/tick');
    const messages: unknown[] = [];

    await new Promise<void>((resolve, reject) => {
      es.onerror = () => reject(new Error('SSE error'));
      es.onopen = () => resolve();
    });

    await new Promise<void>((resolve) => {
      es.onmessage = (ev) => {
        messages.push(JSON.parse(ev.data as string));
        if (messages.length >= 2) resolve();
      };
    });

    expect(handlerCalls).toBe(0);
    expect(messages[0]).toEqual({ n: 1 });
    expect(messages[1]).toEqual({ n: 1 });

    api.clearPushChannel('sse', '/tick');
    es.close();
  });

  it('disabled push channel uses app handler', async () => {
    const api = new Api({ delay: false });
    api.sse('/live', (connection) => {
      connection.send({ from: 'handler' });
    });
    api.setPushChannel('sse', '/live', {
      enabled: false,
      periodMs: 1000,
      payload: { from: 'devtools' },
    });

    const { EventSource } = createMockTransport(api);
    const es = new EventSource('https://api.mock/live');
    const message = await new Promise<MessageEvent>((resolve, reject) => {
      es.onerror = () => reject(new Error('SSE error'));
      es.onmessage = (ev) => resolve(ev);
    });
    expect(JSON.parse(message.data as string)).toEqual({ from: 'handler' });
    es.close();
  });
});
