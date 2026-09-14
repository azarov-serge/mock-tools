export type HealthCheckResult = {
  status: 'ok' | 'error';
  description: string;
};

export type HealthCheck = () => HealthCheckResult | Promise<HealthCheckResult>;

export type HealthChecks = Record<string, HealthCheck>;

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export type CreateApiOptions<TContext = unknown> = {
  /** Default delay for resource calls / handle. `0` / `false` = none. Default `300`. */
  delay?: number | false;
  failEvery?: number;
  failNth?: number;
  context?: TContext;
  /**
   * Named health-checks. Strongly recommended (store / idb / …).
   * See `Api.health()` / `Api.setHealth()`.
   */
  health?: HealthChecks;
  /**
   * DevTools Settings: DB name / status / table counts.
   * See `Api.getDbStatus()`.
   */
  dbStatus?: DbStatusProvider;
  /**
   * DevTools Mocks Generate: read/write tables without guessing store shape.
   * See `Api.getStoreAdapter()`.
   */
  storeAdapter?: StoreAdapter;
  /**
   * DevTools Mocks Generate: produce N rows for a table (factory / app models).
   * See `Api.getSeedGenerator()`.
   */
  seedGenerator?: SeedGenerator;
};

/** One table row in `dbStatus` (Settings / Mocks counters). */
export type DbTableStat = {
  name: string;
  count: number;
};

/** Snapshot for DevTools Database block. */
export type DbStatus = {
  name: string;
  status: 'ok' | 'error';
  description?: string;
  tables: DbTableStat[];
};

export type DbStatusProvider = () => DbStatus | Promise<DbStatus>;

/** Opaque row for storeAdapter; app defines the real shape. */
export type StoreRow = Record<string, unknown>;

/**
 * DevTools writes via this adapter (not by poking `context` fields).
 * Table names must match `dbStatus.tables[].name`.
 */
export type StoreAdapter = {
  list(table: string): StoreRow[] | Promise<StoreRow[]>;
  clear(table: string): void | Promise<void>;
  put(table: string, rows: StoreRow[]): void | Promise<void>;
};

/**
 * App-owned row factory for DevTools «Generate N».
 * Table names match `dbStatus.tables[].name` / endpoint `table` meta.
 */
export type SeedGenerator = {
  generate(table: string, count: number): StoreRow[] | Promise<StoreRow[]>;
};

/**
 * DevTools: force status+body for a method+path pattern (overrides route handler).
 * See `Api.setResponseOverride()`.
 */
export type ResponseOverride = {
  status: number;
  body?: unknown;
};

export type ResponseOverrideInfo = {
  httpMethod: HttpMethod;
  path: string;
  status: number;
  body?: unknown;
};

/** SSE or WebSocket route kind (DevTools Push Live). */
export type PushKind = 'sse' | 'ws';

export type PushRouteInfo = {
  kind: PushKind;
  path: string;
};

/**
 * DevTools Push Live: when `enabled`, api ticks `payload` to open connections
 * and skips the app SSE/WS handler for new connections.
 */
export type PushChannelConfig = {
  enabled: boolean;
  /** Tick interval in ms (clamped ≥ 50). */
  periodMs: number;
  payload?: unknown;
};

export type PushChannelInfo = PushRouteInfo & PushChannelConfig;

/** Endpoint meta on a resource method (`@endpoint` / `register` meta). */
export type EndpointMeta = {
  method: HttpMethod;
  path: string;
  table: string;
};

/** Discovered endpoint for DevTools (resources + routes). */
export type EndpointInfo = {
  httpMethod: HttpMethod;
  path: string;
  /** Absent when route registered without `table`. */
  table?: string;
  kind: 'resource' | 'route';
  /** Resource name when `kind: 'resource'`. */
  resource?: string;
  /** Method name on the resource class. */
  resourceMethod?: string;
};

export type RegisterOptions = {
  /**
   * Per-method endpoint meta (escape hatch without decorators).
   * Merged over `@endpoint` on the same method (register wins).
   */
  meta?: Record<string, EndpointMeta>;
};

export type RequestConfig = {
  status?: number;
  error?: unknown;
  delay?: number | false;
  failEvery?: number;
  failNth?: number;
};

/**
 * Second arg of `api.handle(url, config)` — like `fetch(url, init)` / axios:
 * method, body, headers + mock knobs in one object.
 */
export type HandleConfig = RequestConfig & {
  /** Default `GET`. */
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
};

export type ApiRequest<TContext = unknown> = {
  method: HttpMethod;
  url: string;
  path: string;
  params: Record<string, string>;
  query: Record<string, string>;
  body: unknown;
  headers: Record<string, string>;
  /** Mock knobs only (delay / fail* / status) — not method/body. */
  config: RequestConfig;
  context: TContext;
  user?: { sub: string; [key: string]: unknown };
};

export type ApiResponse<TBody = unknown> = {
  status: number;
  body: TBody;
  headers?: Record<string, string>;
};

export type RouteHandler<TContext = unknown> = (
  request: ApiRequest<TContext>,
) => unknown | Promise<unknown>;

/** Fastify-like: may short-circuit with ApiResponse */
export type RouteMiddleware<TContext = unknown> = (
  request: ApiRequest<TContext>,
) => void | Promise<void> | ApiResponse | Promise<ApiResponse>;

export type RouteOptions<TContext = unknown> = {
  preHandler?: RouteMiddleware<TContext>[];
  failEvery?: number;
  failNth?: number;
};

/** Single arg for `route.get/post/…` — no overloads. */
export type RouteConfig<TContext = unknown> = RouteOptions<TContext> & {
  handler: RouteHandler<TContext>;
  /** DevTools / Mocks: store table name (same as `dbStatus.tables[].name`). */
  table?: string;
};

export type OnRequestHook<TContext = unknown> = (
  request: ApiRequest<TContext>,
) => void | Promise<void>;

export type OnResponseHook<TContext = unknown> = (
  request: ApiRequest<TContext>,
  response: ApiResponse,
) => void | Promise<void>;

/** Marker from created() / noContent() */
export type ExplicitResponse<TBody = unknown> = {
  __apiResponse: true;
  status: number;
  body: TBody;
  headers?: Record<string, string>;
};

/** One resource call (pipeline / named middleware). */
export type ResourceCall = {
  type: 'resource';
  resource: string;
  method: string;
  args: unknown[];
};

export type RouteCall = {
  type: 'route';
  method: string;
  path: string;
  url: string;
  body?: unknown;
};

export type ApiCall = ResourceCall | RouteCall;

/** Wrapper for response interceptors; callers still get bare `data`. */
export type ResourceResult<T = unknown> = {
  data: T;
  call: ResourceCall;
  durationMs?: number;
};

export type ResourceClass<TContext, I extends object = object> = new (ctx: TContext) => I;

export type BoundInstance<I> = {
  [K in keyof I as I[K] extends (...args: never[]) => unknown ? K : never]: I[K] extends (
    ...args: infer A
  ) => infer R
    ? (...args: A) => Promise<Awaited<R>>
    : never;
};

export type Middleware = {
  onRequest?(call: ApiCall): void | Promise<void>;
  onResponse?(call: ApiCall, data: unknown): void | Promise<void>;
  /** Resource: throw. Route: also when status >= 400 (data = ApiResponse). */
  onError?(call: ApiCall, error: unknown): void | Promise<void>;
};
