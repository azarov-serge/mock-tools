import { describe, expect, it } from 'vitest';
import {
  BadRequestError,
  ForbiddenError,
  HttpError,
  InternalError,
  isHttpError,
  NotFoundError,
  UnauthorizedError,
} from './index';
import { Api } from '../core/api';

describe('HttpError*', () => {
  it('sets status and default body', () => {
    const err = new NotFoundError('missing');
    expect(err).toBeInstanceOf(HttpError);
    expect(err.status).toBe(404);
    expect(err.message).toBe('missing');
    expect(err.body).toEqual({ message: 'missing' });
    expect(isHttpError(err)).toBe(true);
  });

  it('status codes for subclasses', () => {
    expect(new BadRequestError().status).toBe(400);
    expect(new UnauthorizedError().status).toBe(401);
    expect(new ForbiddenError().status).toBe(403);
    expect(new NotFoundError().status).toBe(404);
    expect(new InternalError().status).toBe(500);
  });

  it('isHttpError is false for plain Error', () => {
    expect(isHttpError(new Error('x'))).toBe(false);
  });

  it('resource can throw NotFoundError through pipeline', async () => {
    class Tasks {
      constructor(_ctx: unknown) {}
      get(id: number) {
        if (id < 0) throw new NotFoundError('Not found');
        return { id };
      }
    }

    const api = new Api({ delay: false, context: {} });
    api.register('tasks', Tasks);

    await expect(api.tasks.get(1)).resolves.toEqual({ id: 1 });
    try {
      await api.tasks.get(-1);
      expect.fail('expected reject');
    } catch (e) {
      expect(isHttpError(e)).toBe(true);
      expect((e as HttpError).status).toBe(404);
    }
  });
});
