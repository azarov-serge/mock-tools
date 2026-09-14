import type { EndpointMeta } from '../types';

const ENDPOINT_META = Symbol.for('mock-tools.api.endpointMeta');

export function attachEndpointMeta<T extends (...args: never[]) => unknown>(
  fn: T,
  meta: EndpointMeta,
): T {
  (fn as { [ENDPOINT_META]?: EndpointMeta })[ENDPOINT_META] = { ...meta };
  return fn;
}

export function getEndpointMeta(fn: unknown): EndpointMeta | undefined {
  if (typeof fn !== 'function') return undefined;
  const meta = (fn as { [ENDPOINT_META]?: EndpointMeta })[ENDPOINT_META];
  return meta ? { ...meta } : undefined;
}

/**
 * Method decorator: `@endpoint({ method: 'GET', path: '/tasks', table: 'tasks' })`.
 * Requires `experimentalDecorators` in the consumer tsconfig (or use `register(..., { meta })`).
 */
export function endpoint(meta: EndpointMeta): MethodDecorator {
  return (_target, _propertyKey, descriptor) => {
    if (!descriptor || typeof descriptor.value !== 'function') {
      throw new Error('@endpoint must decorate a method');
    }
    attachEndpointMeta(descriptor.value as (...args: never[]) => unknown, meta);
    return descriptor;
  };
}
