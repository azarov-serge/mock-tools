export type InterceptorFulfilled<V> = (value: V) => V | Promise<V>;

export type InterceptorRejected = (error: unknown) => unknown | Promise<unknown>;

type Handler<V> = {
  fulfilled?: InterceptorFulfilled<V>;
  rejected?: InterceptorRejected;
} | null;

/**
 * Axios-like interceptor chain: `use()` → id, `eject(id)`.
 */
export class InterceptorManager<V> {
  private handlers: Handler<V>[] = [];

  use(fulfilled?: InterceptorFulfilled<V>, rejected?: InterceptorRejected): number {
    this.handlers.push({ fulfilled, rejected });
    return this.handlers.length - 1;
  }

  eject(id: number): void {
    if (id >= 0 && id < this.handlers.length) {
      this.handlers[id] = null;
    }
  }

  /** @internal */
  async runFulfilled(value: V): Promise<V> {
    let current = value;
    for (const h of this.handlers) {
      if (!h?.fulfilled) continue;
      current = await h.fulfilled(current);
    }
    return current;
  }

  /**
   * @internal
   * If a rejected handler returns a value → recovery (resolve).
   * If all throw/reject → throw last error.
   */
  async runRejected(error: unknown): Promise<unknown> {
    let current: unknown = error;
    for (const h of this.handlers) {
      if (!h?.rejected) continue;
      try {
        return await h.rejected(current);
      } catch (e) {
        current = e;
      }
    }
    throw current;
  }
}
