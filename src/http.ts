import type { IncomingMessage, ServerResponse } from 'node:http';

/** Input a client sent that the API refuses. The server answers 400 with the message. */
export class ValidationError extends Error {}

/** One request, as every module's handlers see it. */
export interface Route {
  method: string;
  /** The path split at `/`, with empty parts left out: `/notes/3` is `['notes', '3']`. */
  parts: string[];
  query: URLSearchParams;
  request: IncomingMessage;
  response: ServerResponse;
}

/** A handler answers the request and says true, or leaves it alone and says false. */
export type Handler = (route: Route) => Promise<boolean>;

export function send(response: ServerResponse, status: number, payload?: unknown): void {
  if (payload === undefined) {
    response.writeHead(status).end();
    return;
  }
  response.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(payload));
}

/** The request's body as a JSON object. Throws a ValidationError when it is not one. */
export async function body(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(chunk as Buffer);
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new ValidationError('the body must be JSON');
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new ValidationError('the body must be a JSON object');
  return parsed as Record<string, unknown>;
}
