import { DEFAULT_DELAY_MS } from './constants';
import { getEndpointMeta } from './endpoint';
import { shouldFail } from './fail';
import { aggregateHealth } from './health/health';
import { HttpRouter } from './http/router';
import { InterceptorManager } from './interceptors/interceptors';
import { MiddlewareManager } from './middleware/manager';
import { methodsOf } from './methods';
import type { SseClientSink, SseHandler, WsClientSink, WsHandler } from '../push/connection';
import { delay } from '../utils/delay';
import { normalizePath } from '../utils/path';
import type {
  BoundInstance,
  CreateApiOptions,
  DbStatus,
  DbStatusProvider,
  EndpointInfo,
  EndpointMeta,
  HandleConfig,
  HealthCheckResult,
  HealthChecks,
  Middleware,
  RegisterOptions,
  ResourceCall,
  ResourceClass,
  ResourceResult,
  ResponseOverride,
  ResponseOverrideInfo,
  PushKind,
  PushRouteInfo,
  PushChannelConfig,
  PushChannelInfo,
  StoreAdapter,
  SeedGenerator,
  ApiResponse,
} from '../types';

/**
 * Api v2: facade — register + pipeline; HTTP/push via HttpRouter.
 */
export class Api<TContext = unknown> {
  readonly context: TContext;

  readonly interceptors = {
    request: new InterceptorManager<ResourceCall>(),
    response: new InterceptorManager<ResourceResult>(),
  };

  private readonly delayMs: number | false;
  private readonly failEvery?: number;
  private readonly failNth?: number;

  private callCount = 0;
  private readonly middleware = new MiddlewareManager();
  /** HTTP routes + SSE/WS (former backend). */
  readonly route: HttpRouter<TContext>;
  private healthChecks: HealthChecks;
  private dbStatusProvider?: DbStatusProvider;
  private storeAdapter?: StoreAdapter;
  private seedGenerator?: SeedGenerator;
  private resourceEndpoints: EndpointInfo[] = [];

  /** Dynamic resource slots: api.tasks after register('tasks', …) */
  [name: string]: unknown;

  constructor(options: CreateApiOptions<TContext> = {}) {
    this.context = options.context as TContext;
    this.delayMs = options.delay === undefined ? DEFAULT_DELAY_MS : options.delay;
    this.failEvery = options.failEvery;
    this.failNth = options.failNth;
    this.healthChecks = { ...(options.health ?? {}) };
    this.dbStatusProvider = options.dbStatus;
    this.storeAdapter = options.storeAdapter;
    this.seedGenerator = options.seedGenerator;
    this.route = new HttpRouter<TContext>({
      context: this.context,
      delay: this.delayMs,
      failEvery: this.failEvery,
      failNth: this.failNth,
      middleware: this.middleware,
    });
  }

  /**
   * Merge named health-checks (`new Api({ health })`).
   * Strongly recommended to configure store / idb / … checks.
   */
  setHealth(checks: HealthChecks): this {
    this.healthChecks = { ...this.healthChecks, ...checks };
    return this;
  }

  /** Aggregate all checks — see `aggregateHealth` / SRS §4.6. */
  async health(): Promise<HealthCheckResult> {
    return aggregateHealth(this.healthChecks);
  }

  setDbStatus(provider: DbStatusProvider): this {
    this.dbStatusProvider = provider;
    return this;
  }

  /** DevTools Settings — `undefined` if not configured. */
  async getDbStatus(): Promise<DbStatus | undefined> {
    if (!this.dbStatusProvider) return undefined;
    return this.dbStatusProvider();
  }

  setStoreAdapter(adapter: StoreAdapter): this {
    this.storeAdapter = adapter;
    return this;
  }

  getStoreAdapter(): StoreAdapter | undefined {
    return this.storeAdapter;
  }

  setSeedGenerator(generator: SeedGenerator): this {
    this.seedGenerator = generator;
    return this;
  }

  getSeedGenerator(): SeedGenerator | undefined {
    return this.seedGenerator;
  }

  setResponseOverride(method: string, pathPattern: string, override: ResponseOverride): void {
    this.route.setResponseOverride(method, pathPattern, override);
  }

  clearResponseOverride(method: string, pathPattern: string): void {
    this.route.clearResponseOverride(method, pathPattern);
  }

  getResponseOverride(method: string, pathPattern: string): ResponseOverride | undefined {
    return this.route.getResponseOverride(method, pathPattern);
  }

  listResponseOverrides(): ResponseOverrideInfo[] {
    return this.route.listResponseOverrides();
  }

  listPushRoutes(): PushRouteInfo[] {
    return this.route.listPushRoutes();
  }

  setPushChannel(kind: PushKind, pathPattern: string, config: PushChannelConfig): void {
    this.route.setPushChannel(kind, pathPattern, config);
  }

  clearPushChannel(kind: PushKind, pathPattern: string): void {
    this.route.clearPushChannel(kind, pathPattern);
  }

  getPushChannel(kind: PushKind, pathPattern: string): PushChannelConfig | undefined {
    return this.route.getPushChannel(kind, pathPattern);
  }

  listPushChannels(): PushChannelInfo[] {
    return this.route.listPushChannels();
  }

  /** True if a resource/route is registered with this exact method+path pattern. */
  hasEndpoint(method: string, pathPattern: string): boolean {
    const m = method.toUpperCase();
    const path = normalizePath(pathPattern);
    if (this.route.hasRoute(method, path)) return true;
    return this.resourceEndpoints.some((ep) => ep.httpMethod === m && ep.path === path);
  }

  /**
   * Endpoints with DevTools meta: resource `@endpoint` / `register` meta + routes.
   */
  listEndpoints(): EndpointInfo[] {
    return [...this.resourceEndpoints, ...this.route.listEndpoints()];
  }

  use(name: string, mw: Middleware): void {
    this.middleware.use(name, mw);
  }

  remove(name: string): void {
    this.middleware.remove(name);
  }

  /**
   * Like `fetch(url, init)` / axios: `handle(url, { method, body, headers, delay, … })`.
   * Default method: GET.
   */
  handle<TBody = unknown>(url: string, config?: HandleConfig): Promise<ApiResponse<TBody>> {
    return this.route.handle(url, config);
  }

  register<I extends object>(
    name: string,
    ResourceClass: ResourceClass<TContext, I>,
    options?: RegisterOptions,
  ): BoundInstance<I> {
    if (this.context === undefined) {
      throw new Error(
        `Api.register('${name}'): context is undefined. Pass context to new Api({ context }).`,
      );
    }

    this.resourceEndpoints = this.resourceEndpoints.filter(
      (e) => !(e.kind === 'resource' && e.resource === name),
    );

    const instance = new ResourceClass(this.context);
    const bound = {} as BoundInstance<I>;

    for (const key of methodsOf(instance)) {
      const fn = (instance as Record<string, unknown>)[key];
      if (typeof fn !== 'function') continue;

      const meta = mergeEndpointMeta(getEndpointMeta(fn), options?.meta?.[key]);
      if (meta) {
        this.resourceEndpoints.push({
          httpMethod: meta.method,
          path: meta.path,
          table: meta.table,
          kind: 'resource',
          resource: name,
          resourceMethod: key,
        });
      }

      (bound as Record<string, unknown>)[key] = async (...args: unknown[]) => {
        return this.runCall(name, key, args, (finalArgs) =>
          (fn as (...a: unknown[]) => unknown).apply(instance, finalArgs),
        );
      };
    }

    this[name] = bound;
    return bound;
  }

  sse(path: string, handler: SseHandler<TContext>): this {
    this.route.sse(path, handler);
    return this;
  }

  ws(path: string, handler: WsHandler<TContext>): this {
    this.route.ws(path, handler);
    return this;
  }

  /** Mock transport → `HttpRouter.connectSse`. */
  connectSse(
    url: string,
    headers: Record<string, string>,
    sink: SseClientSink,
  ): { close: () => void } | null {
    return this.route.connectSse(url, headers, sink);
  }

  /** Mock transport → `HttpRouter.connectWs`. */
  connectWs(
    url: string,
    headers: Record<string, string>,
    sink: WsClientSink,
  ): {
    send: (data: string) => void;
    close: (code?: number, reason?: string) => void;
  } | null {
    return this.route.connectWs(url, headers, sink);
  }

  private async runCall<T>(
    resource: string,
    method: string,
    args: unknown[],
    invoke: (args: unknown[]) => T | Promise<T>,
  ): Promise<T> {
    let call: ResourceCall = { type: 'resource', resource, method, args };

    await this.middleware.runOnRequest(call);

    call = await this.interceptors.request.runFulfilled(call);

    await this.applyDelayAndFail();

    try {
      const data = await invoke(call.args);

      await this.middleware.runOnResponse(call, data);

      const result = await this.interceptors.response.runFulfilled({
        data,
        call,
      });
      return result.data as T;
    } catch (error) {
      await this.middleware.runOnError(call, error);

      try {
        return (await this.interceptors.response.runRejected(error)) as T;
      } catch (e) {
        throw e;
      }
    }
  }

  private async applyDelayAndFail(): Promise<void> {
    this.callCount += 1;

    if (
      shouldFail(this.callCount, {
        failEvery: this.failEvery,
        failNth: this.failNth,
      })
    ) {
      throw new Error('Mock fail (failEvery/failNth)');
    }

    if (this.delayMs !== false && this.delayMs > 0) {
      await delay(this.delayMs);
    }
  }
}

function mergeEndpointMeta(
  fromDecorator: EndpointMeta | undefined,
  fromRegister: EndpointMeta | undefined,
): EndpointMeta | undefined {
  if (!fromDecorator && !fromRegister) return undefined;
  const merged = { ...fromDecorator, ...fromRegister } as Partial<EndpointMeta>;
  if (!merged.method || !merged.path || !merged.table) return undefined;
  return merged as EndpointMeta;
}
