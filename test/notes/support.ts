import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before } from 'node:test';
import type { Handler } from '../../src/http.ts';
import { createApp } from '../../src/server.ts';
import type { Answer } from '../support.ts';

/**
 * A copy of `startApp` from `test/support.ts` that serves the given handlers in place of the
 * registered modules, so the notes features can be tested together over one store while the notes
 * module's route table does not list them yet.
 */
export function startAppWith(handlers: Handler[]): (method: string, path: string, body?: unknown) => Promise<Answer> {
  let server: Server;
  let base = '';
  before(async () => {
    server = createApp(undefined, handlers);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  after(() => new Promise<void>((resolve) => server.close(() => resolve())));

  return async (method, path, body) => {
    const response = await fetch(`${base}${path}`, {
      method,
      ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
    });
    const text = await response.text();
    return { status: response.status, json: text === '' ? undefined : (JSON.parse(text) as Record<string, unknown>) };
  };
}
