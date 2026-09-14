import type { ApiCall, Middleware } from '../types';

export type ConsoleLoggerLevel = 'log' | 'warn' | 'error';

export type ConsoleLoggerOptions = {
  /** Default `log` → console.log for →/←. Errors always use console.error. */
  level?: ConsoleLoggerLevel;
};

function labelOf(call: ApiCall): string {
  if (call.type === 'resource') {
    return `${call.resource}.${call.method}`;
  }
  return `${call.method} ${call.path}`;
}

function requestPayload(call: ApiCall): unknown {
  if (call.type === 'resource') return call.args;
  return call.body;
}

/**
 * Optional middleware: logs resource and route calls to console.
 * Not attached by default — `api.use('logger', new ConsoleLogger())`.
 */
export class ConsoleLogger implements Middleware {
  private readonly level: ConsoleLoggerLevel;

  constructor(options: ConsoleLoggerOptions = {}) {
    this.level = options.level ?? 'log';
  }

  onRequest(call: ApiCall): void {
    this.write('→', labelOf(call), requestPayload(call));
  }

  onResponse(call: ApiCall, data: unknown): void {
    this.write('←', labelOf(call), data);
  }

  onError(call: ApiCall, error: unknown): void {
    console.error('[mock-api]', '✕', labelOf(call), error);
  }

  private write(arrow: '→' | '←', label: string, payload: unknown): void {
    console[this.level]('[mock-api]', arrow, label, payload);
  }
}
