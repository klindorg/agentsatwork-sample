import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before } from 'node:test';
import type { Handler } from '../src/http.ts';
import { createApp } from '../src/server.ts';

export interface Answer {
  status: number;
  json: Record<string, unknown> | undefined;
}

/**
 * Starts a server of its own for the test file on a free port, closes it after, and gives the call
 * that talks to it. Every test file calls this once, so tests never share data.
 */
export function startApp(): (method: string, path: string, body?: unknown) => Promise<Answer> {
  return startAppWith(undefined);
}

/**
 * Like `startApp`, but the server serves only the given handlers in place of the registered
 * modules, so a feature can be tested over HTTP against a store the test holds.
 */
export function startAppWith(handlers: Handler[] | undefined): (method: string, path: string, body?: unknown) => Promise<Answer> {
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
