import { describe, expect, it } from 'vitest';
import { Api } from '../api';

type Store = {
  accessToken: string | null;
  lastSeenToken: string | null;
};

class SecureResource {
  constructor(private ctx: Store) {}

  ping(): string {
    this.ctx.lastSeenToken = this.ctx.accessToken;
    if (!this.ctx.accessToken) throw new Error('Unauthorized');
    return `ok:${this.ctx.accessToken}`;
  }

  echo(msg: string): string {
    return msg;
  }
}

describe('interceptors', () => {
  it('request interceptor can set context before call', async () => {
    const token = { value: null as string | null };
    const api = new Api({
      context: { accessToken: null, lastSeenToken: null },
      delay: false,
    });

    api.interceptors.request.use((call) => {
      api.context.accessToken = token.value;
      return call;
    });

    api.register('secure', SecureResource);

    await expect(api.secure.ping()).rejects.toThrow('Unauthorized');

    token.value = 'abc';
    await expect(api.secure.ping()).resolves.toBe('ok:abc');
    expect(api.context.lastSeenToken).toBe('abc');
  });

  it('request interceptor can rewrite args', async () => {
    const api = new Api({
      context: { accessToken: 'x', lastSeenToken: null },
      delay: false,
    });
    api.register('secure', SecureResource);

    api.interceptors.request.use((call) => {
      if (call.method === 'echo') {
        return { ...call, args: ['rewritten'] };
      }
      return call;
    });

    await expect(api.secure.echo('orig')).resolves.toBe('rewritten');
  });

  it('response interceptor can map data', async () => {
    const api = new Api({
      context: { accessToken: 't', lastSeenToken: null },
      delay: false,
    });
    api.register('secure', SecureResource);

    api.interceptors.response.use((result) => ({
      ...result,
      data: `mapped:${result.data}`,
    }));

    await expect(api.secure.ping()).resolves.toBe('mapped:ok:t');
  });

  it('response error interceptor can recover or rethrow', async () => {
    const api = new Api({
      context: { accessToken: null, lastSeenToken: null },
      delay: false,
    });
    api.register('secure', SecureResource);

    const id = api.interceptors.response.use(
      (r) => r,
      (error) => {
        if ((error as Error).message === 'Unauthorized') {
          return 'guest';
        }
        return Promise.reject(error);
      },
    );

    await expect(api.secure.ping()).resolves.toBe('guest');

    api.interceptors.response.eject(id);
    await expect(api.secure.ping()).rejects.toThrow('Unauthorized');
  });

  it('eject removes request interceptor', async () => {
    const api = new Api({
      context: { accessToken: null, lastSeenToken: null },
      delay: false,
    });
    api.register('secure', SecureResource);

    const id = api.interceptors.request.use((call) => {
      api.context.accessToken = 'from-interceptor';
      return call;
    });
    api.interceptors.request.eject(id);

    await expect(api.secure.ping()).rejects.toThrow('Unauthorized');
  });
});
