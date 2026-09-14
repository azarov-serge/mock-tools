export class HttpError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, message?: string, body?: unknown) {
    super(message ?? `HTTP ${status}`);
    this.name = 'HttpError';
    this.status = status;
    this.body = body ?? { message: this.message };
  }
}

export class BadRequestError extends HttpError {
  constructor(message = 'Bad Request', body?: unknown) {
    super(400, message, body);
    this.name = 'BadRequestError';
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = 'Unauthorized', body?: unknown) {
    super(401, message, body);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = 'Forbidden', body?: unknown) {
    super(403, message, body);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'Not Found', body?: unknown) {
    super(404, message, body);
    this.name = 'NotFoundError';
  }
}

export class InternalError extends HttpError {
  constructor(message = 'Internal Server Error', body?: unknown) {
    super(500, message, body);
    this.name = 'InternalError';
  }
}

export function isHttpError(value: unknown): value is HttpError {
  return value instanceof HttpError;
}
