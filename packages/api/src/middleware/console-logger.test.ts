import { describe, expect, it, vi, afterEach } from 'vitest';
import { Api } from '../core/api';
import { ConsoleLogger } from './console-logger';

type Store = { n: number };

class CounterResource {
  constructor(private ctx: Store) {}

  bump(): number {
    return ++this.ctx.n;
  }

  fail(): never {
    throw new Error('nope');
  }
}

describe('ConsoleLogger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs request and response as resource.method', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const api = new Api({ context: { n: 0 }, delay: false });
    api.use('logger', new ConsoleLogger({ level: 'log' }));
    api.register('counter', CounterResource);

    await api.counter.bump();

    expect(log).toHaveBeenCalledWith('[mock-api]', '→', 'counter.bump', []);
    expect(log).toHaveBeenCalledWith('[mock-api]', '←', 'counter.bump', 1);
  });

  it('does not log when not used', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const api = new Api({ context: { n: 0 }, delay: false });
    api.register('counter', CounterResource);

    await api.counter.bump();
    expect(log).not.toHaveBeenCalled();
  });

  it('logs errors with console.error', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const api = new Api({ context: { n: 0 }, delay: false });
    api.use('logger', new ConsoleLogger());
    api.register('counter', CounterResource);

    await expect(api.counter.fail()).rejects.toThrow('nope');
    expect(error).toHaveBeenCalledWith('[mock-api]', '✕', 'counter.fail', expect.any(Error));
  });

  it('remove stops logging; replace swaps level', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const api = new Api({ context: { n: 0 }, delay: false });
    api.register('counter', CounterResource);

    api.use('logger', new ConsoleLogger({ level: 'log' }));
    await api.counter.bump();
    expect(log).toHaveBeenCalled();

    log.mockClear();
    api.remove('logger');
    await api.counter.bump();
    expect(log).not.toHaveBeenCalled();

    api.use('logger', new ConsoleLogger({ level: 'warn' }));
    await api.counter.bump();
    expect(warn).toHaveBeenCalledWith('[mock-api]', '→', 'counter.bump', []);
  });
});
