import type { ExplicitResponse } from '../types';

/** 201 Created */
export function created<T>(body: T, headers?: Record<string, string>): ExplicitResponse<T> {
  return { __apiResponse: true, status: 201, body, headers };
}

/** 204 No Content */
export function noContent(headers?: Record<string, string>): ExplicitResponse<null> {
  return { __apiResponse: true, status: 204, body: null, headers };
}

export function isExplicitResponse(value: unknown): value is ExplicitResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as ExplicitResponse).__apiResponse === true
  );
}
