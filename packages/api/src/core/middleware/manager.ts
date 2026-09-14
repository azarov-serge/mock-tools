import type { ApiCall, Middleware } from '../../types';

/**
 * Named middleware slots: order of `use` + replace-in-place.
 * Api.use / remove / runCall / HttpRouter.handle delegate here (SRS §1.1).
 */
export class MiddlewareManager {
  private readonly order: string[] = [];
  private readonly map = new Map<string, Middleware>();

  use(name: string, mw: Middleware): void {
    if (!this.map.has(name)) {
      this.order.push(name);
    }
    this.map.set(name, mw);
  }

  remove(name: string): void {
    if (!this.map.has(name)) return;
    this.map.delete(name);
    const i = this.order.indexOf(name);
    if (i >= 0) this.order.splice(i, 1);
  }

  async runOnRequest(call: ApiCall): Promise<void> {
    for (const name of this.order) {
      await this.map.get(name)?.onRequest?.(call);
    }
  }

  async runOnResponse(call: ApiCall, data: unknown): Promise<void> {
    for (const name of this.order) {
      await this.map.get(name)?.onResponse?.(call, data);
    }
  }

  async runOnError(call: ApiCall, error: unknown): Promise<void> {
    for (const name of this.order) {
      await this.map.get(name)?.onError?.(call, error);
    }
  }
}
