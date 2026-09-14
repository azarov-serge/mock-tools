import { InternalError, isHttpError } from '../../errors';
import {
  SseConnectionImpl,
  WsSocketImpl,
  type SseClientSink,
  type SseHandler,
  type WsClientSink,
  type WsHandler,
} from '../../push/connection';
import { compilePath, matchPath, parseRequestUrl } from '../../utils/path';
import { delay as wait } from '../../utils/delay';
import type { MiddlewareManager } from '../middleware/manager';
import { hasFailRule, resolveFailRule, shouldFail } from '../fail';
import {
  buildRequest,
  isApiResponse,
  normalizeMethod,
  resolveDelayMs,
  toRequestConfig,
  toResponse,
} from './helpers';
import type {
  ApiRequest,
  ApiResponse,
  HandleConfig,
  HttpMethod,
  OnRequestHook,
  OnResponseHook,
  RouteCall,
  RouteConfig,
  RouteHandler,
  RouteMiddleware,
  RouteOptions,
  EndpointInfo,
  ResponseOverride,
  ResponseOverrideInfo,
  PushKind,
  PushRouteInfo,
  PushChannelConfig,
  PushChannelInfo,
} from '../../types';
import type { PathPattern } from '../../utils/path';

type StoredRoute<TContext> = {
  method: HttpMethod;
  pattern: PathPattern;
  handler: RouteHandler<TContext>;
  options: RouteOptions<TContext>;
  table?: string;
  callCount: number;
};

type StoredSseRoute<TContext> = {
  pattern: PathPattern;
  handler: SseHandler<TContext>;
};

type StoredWsRoute<TContext> = {
  pattern: PathPattern;
  handler: WsHandler<TContext>;
};

type StoredOverride = {
  method: HttpMethod;
  pattern: PathPattern;
  status: number;
  body?: unknown;
};

type StoredPushChannel = {
  kind: PushKind;
  pattern: PathPattern;
  enabled: boolean;
  periodMs: number;
  payload?: unknown;
  timer?: ReturnType<typeof setInterval>;
};

type LivePushSink =
  | { kind: 'sse'; conn: SseConnectionImpl }
  | { kind: 'ws'; sock: WsSocketImpl };

const FAIL_BODY = { message: 'Forced failure (failEvery/failNth)' };
const MIN_PUSH_PERIOD_MS = 50;

function pushChannelKey(kind: PushKind, pathPattern: string): string {
  return `${kind}:${compilePath(pathPattern).pattern}`;
}

function clampPeriodMs(ms: number): number {
  if (!Number.isFinite(ms) || ms < MIN_PUSH_PERIOD_MS) return MIN_PUSH_PERIOD_MS;
  return Math.floor(ms);
}

export type HttpRouterDeps<TContext> = {
  context: TContext;
  delay: number | false | undefined;
  failEvery?: number;
  failNth?: number;
  middleware: MiddlewareManager;
};

/**
 * HTTP routes + handle + SSE/WS (former backend surface).
 * Public API: `api.route.*` / `api.handle`; facade `api.sse` / `api.ws`.
 */
export class HttpRouter<TContext = unknown> {
  private readonly routes: StoredRoute<TContext>[] = [];
  private readonly sseRoutes: StoredSseRoute<TContext>[] = [];
  private readonly wsRoutes: StoredWsRoute<TContext>[] = [];
  private readonly overrides: StoredOverride[] = [];
  private readonly pushChannels = new Map<string, StoredPushChannel>();
  private readonly livePush = new Map<string, Set<LivePushSink>>();
  private readonly globalMiddleware: RouteMiddleware<TContext>[] = [];
  private readonly onRequestHooks: OnRequestHook<TContext>[] = [];
  private readonly onResponseHooks: OnResponseHook<TContext>[] = [];
  private globalCallCount = 0;

  constructor(private readonly deps: HttpRouterDeps<TContext>) {}

  use(mw: RouteMiddleware<TContext>): this {
    this.globalMiddleware.push(mw);
    return this;
  }

  onRequest(hook: OnRequestHook<TContext>): this {
    this.onRequestHooks.push(hook);
    return this;
  }

  onResponse(hook: OnResponseHook<TContext>): this {
    this.onResponseHooks.push(hook);
    return this;
  }

  register(fn: (route: HttpRouter<TContext>) => void): this {
    fn(this);
    return this;
  }

  get(path: string, config: RouteConfig<TContext>): this {
    return this.addRoute('GET', path, config);
  }

  post(path: string, config: RouteConfig<TContext>): this {
    return this.addRoute('POST', path, config);
  }

  put(path: string, config: RouteConfig<TContext>): this {
    return this.addRoute('PUT', path, config);
  }

  patch(path: string, config: RouteConfig<TContext>): this {
    return this.addRoute('PATCH', path, config);
  }

  delete(path: string, config: RouteConfig<TContext>): this {
    return this.addRoute('DELETE', path, config);
  }

  sse(path: string, handler: SseHandler<TContext>): this {
    this.sseRoutes.push({
      pattern: compilePath(path),
      handler,
    });
    return this;
  }

  ws(path: string, handler: WsHandler<TContext>): this {
    this.wsRoutes.push({
      pattern: compilePath(path),
      handler,
    });
    return this;
  }

  /**
   * Mock transport: open SSE by URL.
   * UI uses `EventSource` after `installMockTransport`.
   */
  connectSse(
    url: string,
    _headers: Record<string, string>,
    sink: SseClientSink,
  ): { close: () => void } | null {
    const { path } = parseRequestUrl(url);
    let params: Record<string, string> | null = null;
    const route = this.sseRoutes.find((r) => {
      params = matchPath(r.pattern, path);
      return params !== null;
    });
    if (!route || !params) return null;

    const connection = new SseConnectionImpl(sink, params);
    const channelKey = pushChannelKey('sse', route.pattern.pattern);

    queueMicrotask(() => {
      if (connection.isClosed) return;
      sink.onOpen();
      const channel = this.pushChannels.get(channelKey);
      if (channel?.enabled) {
        this.registerLivePush(channelKey, { kind: 'sse', conn: connection });
        connection.onClose(() => this.unregisterLivePush(channelKey, connection));
        this.ensurePushTicker(channelKey);
        this.emitPushTick(channelKey);
        return;
      }
      void Promise.resolve(route.handler(connection, this.deps.context)).catch(() => {
        sink.onError();
        connection.close();
      });
    });
    return { close: () => connection.close() };
  }

  /**
   * Mock transport: open WebSocket by URL.
   * UI uses `WebSocket` after `installMockTransport`.
   */
  connectWs(
    url: string,
    _headers: Record<string, string>,
    sink: WsClientSink,
  ): {
    send: (data: string) => void;
    close: (code?: number, reason?: string) => void;
  } | null {
    const { path } = parseRequestUrl(url);
    let params: Record<string, string> | null = null;
    const route = this.wsRoutes.find((r) => {
      params = matchPath(r.pattern, path);
      return params !== null;
    });
    if (!route || !params) return null;

    const socket = new WsSocketImpl(sink, params);
    const channelKey = pushChannelKey('ws', route.pattern.pattern);

    queueMicrotask(() => {
      if (socket.isClosed) return;
      sink.onOpen();
      const channel = this.pushChannels.get(channelKey);
      if (channel?.enabled) {
        this.registerLivePush(channelKey, { kind: 'ws', sock: socket });
        socket.onClose(() => this.unregisterLivePush(channelKey, socket));
        this.ensurePushTicker(channelKey);
        this.emitPushTick(channelKey);
        return;
      }
      void Promise.resolve(route.handler(socket, this.deps.context)).catch(() => {
        sink.onError();
        socket.close(1011, 'handler error');
      });
    });
    return {
      send: (data) => socket.receiveFromClient(data),
      close: (code, reason) => socket.close(code, reason),
    };
  }

  /**
   * Like `fetch(url, init)`: url first, method/body/headers + mock knobs in config.
   * Default method: GET.
   */
  async handle<TBody = unknown>(url: string, config?: HandleConfig): Promise<ApiResponse<TBody>> {
    const method = normalizeMethod(config?.method ?? 'GET');
    const { path, query } = parseRequestUrl(url);
    const requestConfig = toRequestConfig(config);

    const override = this.findOverride(method, path);
    if (override) {
      const params = matchPath(override.pattern, path) ?? {};
      const request = buildRequest(
        url,
        config,
        method,
        path,
        query,
        params,
        requestConfig,
        this.deps.context,
      );
      const route =
        this.routes.find(
          (r) => r.method === method && matchPath(r.pattern, path) !== null,
        ) ?? null;
      return (await this.runPipeline(
        request,
        route,
        null,
        {
          status: override.status,
          body: override.body,
        },
      )) as ApiResponse<TBody>;
    }

    const pathMatches = this.routes.filter((r) => matchPath(r.pattern, path) !== null);

    if (pathMatches.length === 0) {
      const request = buildRequest(
        url,
        config,
        method,
        path,
        query,
        {},
        requestConfig,
        this.deps.context,
      );
      return (await this.runPipeline(request, null, {
        status: 404,
        body: { message: 'Not Found' },
      })) as ApiResponse<TBody>;
    }

    const allow = [...new Set(pathMatches.map((r) => r.method))];
    const route = pathMatches.find((r) => r.method === method);

    if (!route) {
      const request = buildRequest(
        url,
        config,
        method,
        path,
        query,
        {},
        requestConfig,
        this.deps.context,
      );
      return (await this.runPipeline(request, null, {
        status: 405,
        body: { message: 'Method Not Allowed' },
        headers: { Allow: allow.join(', ') },
      })) as ApiResponse<TBody>;
    }

    const params = matchPath(route.pattern, path) ?? {};
    const request = buildRequest(
      url,
      config,
      method,
      path,
      query,
      params,
      requestConfig,
      this.deps.context,
    );

    return (await this.runPipeline(request, route, null)) as ApiResponse<TBody>;
  }

  /**
   * DevTools: force status+body for method+path pattern (takes precedence over handler).
   * Per-call `handle(url, { status })` still wins inside the pipeline.
   */
  setResponseOverride(method: string, pathPattern: string, override: ResponseOverride): void {
    const httpMethod = normalizeMethod(method);
    const pattern = compilePath(pathPattern);
    const key = pattern.pattern;
    const idx = this.overrides.findIndex((o) => o.method === httpMethod && o.pattern.pattern === key);
    const entry: StoredOverride = {
      method: httpMethod,
      pattern,
      status: override.status,
      body: override.body,
    };
    if (idx >= 0) this.overrides[idx] = entry;
    else this.overrides.push(entry);
  }

  clearResponseOverride(method: string, pathPattern: string): void {
    const httpMethod = normalizeMethod(method);
    const key = compilePath(pathPattern).pattern;
    const idx = this.overrides.findIndex((o) => o.method === httpMethod && o.pattern.pattern === key);
    if (idx >= 0) this.overrides.splice(idx, 1);
  }

  getResponseOverride(method: string, pathPattern: string): ResponseOverride | undefined {
    const httpMethod = normalizeMethod(method);
    const key = compilePath(pathPattern).pattern;
    const found = this.overrides.find((o) => o.method === httpMethod && o.pattern.pattern === key);
    if (!found) return undefined;
    return { status: found.status, body: found.body };
  }

  listResponseOverrides(): ResponseOverrideInfo[] {
    return this.overrides.map((o) => ({
      httpMethod: o.method,
      path: o.pattern.pattern,
      status: o.status,
      body: o.body,
    }));
  }

  listPushRoutes(): PushRouteInfo[] {
    const sse = this.sseRoutes.map((r) => ({
      kind: 'sse' as const,
      path: r.pattern.pattern,
    }));
    const ws = this.wsRoutes.map((r) => ({
      kind: 'ws' as const,
      path: r.pattern.pattern,
    }));
    return [...sse, ...ws];
  }

  setPushChannel(kind: PushKind, pathPattern: string, config: PushChannelConfig): void {
    const pattern = compilePath(pathPattern);
    const key = pushChannelKey(kind, pattern.pattern);
    const prev = this.pushChannels.get(key);
    if (prev?.timer) {
      clearInterval(prev.timer);
      prev.timer = undefined;
    }
    const next: StoredPushChannel = {
      kind,
      pattern,
      enabled: Boolean(config.enabled),
      periodMs: clampPeriodMs(config.periodMs),
      payload: config.payload,
    };
    this.pushChannels.set(key, next);
    if (next.enabled) {
      this.ensurePushTicker(key);
      this.emitPushTick(key);
    }
  }

  clearPushChannel(kind: PushKind, pathPattern: string): void {
    const key = pushChannelKey(kind, pathPattern);
    const prev = this.pushChannels.get(key);
    if (prev?.timer) clearInterval(prev.timer);
    this.pushChannels.delete(key);
  }

  getPushChannel(kind: PushKind, pathPattern: string): PushChannelConfig | undefined {
    const found = this.pushChannels.get(pushChannelKey(kind, pathPattern));
    if (!found) return undefined;
    return {
      enabled: found.enabled,
      periodMs: found.periodMs,
      payload: found.payload,
    };
  }

  listPushChannels(): PushChannelInfo[] {
    return [...this.pushChannels.values()].map((c) => ({
      kind: c.kind,
      path: c.pattern.pattern,
      enabled: c.enabled,
      periodMs: c.periodMs,
      payload: c.payload,
    }));
  }

  private registerLivePush(key: string, sink: LivePushSink): void {
    let set = this.livePush.get(key);
    if (!set) {
      set = new Set();
      this.livePush.set(key, set);
    }
    set.add(sink);
  }

  private unregisterLivePush(
    key: string,
    target: SseConnectionImpl | WsSocketImpl,
  ): void {
    const set = this.livePush.get(key);
    if (!set) return;
    for (const sink of set) {
      if (
        (sink.kind === 'sse' && sink.conn === target) ||
        (sink.kind === 'ws' && sink.sock === target)
      ) {
        set.delete(sink);
        break;
      }
    }
    if (set.size === 0) this.livePush.delete(key);
  }

  private ensurePushTicker(key: string): void {
    const channel = this.pushChannels.get(key);
    if (!channel?.enabled) return;
    if (channel.timer) return;
    channel.timer = setInterval(() => this.emitPushTick(key), channel.periodMs);
  }

  private emitPushTick(key: string): void {
    const channel = this.pushChannels.get(key);
    if (!channel?.enabled) return;
    const set = this.livePush.get(key);
    if (!set || set.size === 0) return;
    const payload = channel.payload ?? null;
    for (const sink of [...set]) {
      if (sink.kind === 'sse') {
        if (sink.conn.isClosed) {
          set.delete(sink);
          continue;
        }
        sink.conn.send(payload);
      } else {
        if (sink.sock.isClosed) {
          set.delete(sink);
          continue;
        }
        sink.sock.send(payload);
      }
    }
  }

  /** Exact pattern match against registered HTTP routes (not URL instance). */
  hasRoute(method: string, pathPattern: string): boolean {
    const httpMethod = normalizeMethod(method);
    const key = compilePath(pathPattern).pattern;
    return this.routes.some((r) => r.method === httpMethod && r.pattern.pattern === key);
  }

  private findOverride(method: HttpMethod, path: string): StoredOverride | undefined {
    return this.overrides.find((o) => o.method === method && matchPath(o.pattern, path) !== null);
  }

  private addRoute(method: HttpMethod, path: string, config: RouteConfig<TContext>): this {
    const { handler, table, ...options } = config;
    this.routes.push({
      method,
      pattern: compilePath(path),
      handler,
      options,
      table,
      callCount: 0,
    });
    return this;
  }

  /** Endpoints registered via `route.*` (for DevTools `listEndpoints`). */
  listEndpoints(): EndpointInfo[] {
    return this.routes.map((r) => ({
      httpMethod: r.method,
      path: r.pattern.pattern,
      table: r.table,
      kind: 'route' as const,
    }));
  }

  private routeCall(request: ApiRequest<TContext>): RouteCall {
    return {
      type: 'route',
      method: request.method,
      path: request.path,
      url: request.url,
      body: request.body,
    };
  }

  /**
   * Shared pipeline for matched routes and early 404/405.
   * `forced` — skip handler (404/405 already decided).
   * `override` — DevTools response override (after per-call `config.status`).
   */
  private async runPipeline(
    request: ApiRequest<TContext>,
    route: StoredRoute<TContext> | null,
    forced: ApiResponse | null,
    override: ApiResponse | null = null,
  ): Promise<ApiResponse> {
    const call = this.routeCall(request);

    try {
      for (const hook of this.onRequestHooks) {
        await hook(request);
      }

      await this.deps.middleware.runOnRequest(call);

      if (forced) {
        return await this.finish(request, call, forced);
      }

      if (request.config.status !== undefined) {
        return await this.finish(request, call, {
          status: request.config.status,
          body: request.config.error ?? {
            message: `Forced status ${request.config.status}`,
          },
        });
      }
      if (request.config.error !== undefined) {
        return await this.finish(request, call, {
          status: 500,
          body: request.config.error,
        });
      }

      if (override) {
        return await this.finish(request, call, override);
      }

      if (route) {
        const failRes = this.evaluateFail(request, route);
        if (failRes) {
          return await this.finish(request, call, failRes);
        }

        for (const mw of this.globalMiddleware) {
          const early = await mw(request);
          if (isApiResponse(early)) {
            return await this.finish(request, call, early);
          }
        }

        for (const mw of route.options.preHandler ?? []) {
          const early = await mw(request);
          if (isApiResponse(early)) {
            return await this.finish(request, call, early);
          }
        }

        const result = await route.handler(request);
        return await this.finish(request, call, toResponse(result));
      }

      return await this.finish(request, call, {
        status: 500,
        body: { message: 'Internal Server Error' },
      });
    } catch (err) {
      if (isHttpError(err)) {
        return await this.finish(request, call, {
          status: err.status,
          body: err.body,
        });
      }
      const internal = new InternalError(
        err instanceof Error ? err.message : 'Internal Server Error',
      );
      return await this.finish(request, call, {
        status: internal.status,
        body: internal.body,
      });
    }
  }

  private evaluateFail(
    request: ApiRequest<TContext>,
    route: StoredRoute<TContext>,
  ): ApiResponse | null {
    const routeRule = {
      failEvery: route.options.failEvery,
      failNth: route.options.failNth,
    };
    const globalRule = {
      failEvery: this.deps.failEvery,
      failNth: this.deps.failNth,
    };
    const requestRule = {
      failEvery: request.config.failEvery,
      failNth: request.config.failNth,
    };

    const effective = resolveFailRule(requestRule, routeRule, globalRule);
    if (!hasFailRule(effective)) return null;

    const useRouteCounter = hasFailRule(routeRule) || hasFailRule(requestRule);
    let count: number;
    if (useRouteCounter) {
      route.callCount += 1;
      count = route.callCount;
    } else {
      this.globalCallCount += 1;
      count = this.globalCallCount;
    }

    if (!shouldFail(count, effective)) return null;
    return { status: 500, body: FAIL_BODY };
  }

  private async finish(
    request: ApiRequest<TContext>,
    call: RouteCall,
    response: ApiResponse,
  ): Promise<ApiResponse> {
    if (response.status >= 400) {
      await this.deps.middleware.runOnError(call, response);
    } else {
      await this.deps.middleware.runOnResponse(call, response);
    }

    const ms = resolveDelayMs(this.deps.delay, request.config.delay);
    await wait(ms);

    for (const hook of this.onResponseHooks) {
      await hook(request, response);
    }
    return response;
  }
}
