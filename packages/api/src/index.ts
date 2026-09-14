/**
 * Публичный API `@mock-tools/api` (v2).
 *
 *   core/api.ts                 — фасад Api
 *   core/http/                  — router + helpers
 *   core/middleware/manager.ts
 *   core/interceptors/ | health/
 *   middleware/console-logger.ts
 *   errors/ / push/ / utils/
 */

export { Api } from './core/api';
export { endpoint, attachEndpointMeta, getEndpointMeta } from './core/endpoint';
export { delay } from './utils/delay';
export { created, noContent } from './utils/responses';
export { ConsoleLogger } from './middleware/console-logger';
export type { ConsoleLoggerLevel, ConsoleLoggerOptions } from './middleware/console-logger';

export {
  BadRequestError,
  ForbiddenError,
  HttpError,
  InternalError,
  isHttpError,
  NotFoundError,
  UnauthorizedError,
} from './errors';

export {
  createMockTransport,
  installMockTransport,
  MockEventSource,
  MockWebSocket,
} from './push/mock-transport';
export type { MockTransport, PushHost } from './push/mock-transport';
export type {
  SseClientSink,
  SseConnection,
  SseHandler,
  WsClientSink,
  WsHandler,
  WsSocket,
} from './push/connection';

export type {
  ApiCall,
  ApiRequest,
  ApiResponse,
  BoundInstance,
  CreateApiOptions,
  DbStatus,
  DbStatusProvider,
  DbTableStat,
  EndpointInfo,
  EndpointMeta,
  ExplicitResponse,
  HandleConfig,
  HealthCheck,
  HealthCheckResult,
  HealthChecks,
  HttpMethod,
  Middleware,
  OnRequestHook,
  OnResponseHook,
  RegisterOptions,
  RequestConfig,
  ResourceCall,
  ResourceClass,
  ResourceResult,
  RouteCall,
  RouteConfig,
  RouteHandler,
  RouteMiddleware,
  RouteOptions,
  StoreAdapter,
  StoreRow,
  SeedGenerator,
  ResponseOverride,
  ResponseOverrideInfo,
  PushKind,
  PushRouteInfo,
  PushChannelConfig,
  PushChannelInfo,
} from './types';
