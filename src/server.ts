import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { body, send, ValidationError, type Handler } from './http.ts';
import { notes } from './notes/module.ts';
import { TaskList } from './tasks.ts';

/** Every module of the API besides the tasks, asked in turn, fresh for each server. A new module is one more line here. */
function modules(): Handler[] {
  return [notes()];
}

/**
 * The HTTP API over a task list:
 *
 *   GET    /health              is the server up
 *   GET    /tasks               every task, or with ?done=true or ?done=false only those that are or are not done,
 *                                and with ?q=... only those whose title contains it, ignoring case,
 *                                and with ?sort=title sorted by title, A to Z, ignoring case, or with ?sort=-title Z to A,
 *                                and with ?limit=n at most the first n of those, after the sort
 *   POST   /tasks               add a task, body {"title": "..."}
 *   DELETE /tasks               remove every task, done or not, and say how many
 *   GET    /tasks/count         how many tasks, how many are done, how many are not, and the share done as a percentage,
 *                                and with ?q=... counting only those whose title contains it, ignoring case
 *   GET    /tasks/oldest        the task that is not done and was added first
 *   DELETE /tasks/done          remove every task that is done, and say how many
 *   POST   /tasks/complete-all  mark every task that is not done as done, and say how many
 *   GET    /tasks/:id           one task
 *   PATCH  /tasks/:id           change a task's title, body {"title": "..."}
 *   POST   /tasks/:id/complete  mark a task done
 *   POST   /tasks/:id/reopen    mark a task not done
 *   POST   /tasks/:id/toggle    mark a task done if it is not, and not done if it is
 *   DELETE /tasks/:id           remove a task
 */
export function createApp(tasks: TaskList = new TaskList(), handlers: Handler[] = modules()): Server {
  return createServer((request, response) => {
    handle(tasks, handlers, request, response).catch((error: unknown) => {
      if (error instanceof ValidationError) send(response, 400, { error: error.message });
      else send(response, 500, { error: 'internal error' });
    });
  });
}

async function handle(tasks: TaskList, handlers: Handler[], request: IncomingMessage, response: ServerResponse): Promise<void> {
  const { pathname, searchParams } = new URL(request.url ?? '/', 'http://localhost');
  const parts = pathname.split('/').filter(Boolean);
  const method = request.method ?? 'GET';

  if (method === 'GET' && pathname === '/health') return send(response, 200, { status: 'ok' });

  const route = { method, parts, query: searchParams, request, response };
  for (const handler of handlers) if (await handler(route)) return;

  if (parts[0] !== 'tasks') return send(response, 404, { error: 'not found' });

  if (parts.length === 1) {
    if (method === 'GET') return send(response, 200, { tasks: tasks.all(doneFilter(searchParams), searchFilter(searchParams), limitFilter(searchParams), sortOrder(searchParams)) });
    if (method === 'POST') return send(response, 201, tasks.add((await body(request)).title));
    if (method === 'DELETE') return send(response, 200, { removed: tasks.removeAll() });
    return send(response, 405, { error: 'method not allowed' });
  }

  if (parts.length === 2 && parts[1] === 'count' && method === 'GET') return send(response, 200, tasks.count(searchFilter(searchParams)));
  if (parts.length === 2 && parts[1] === 'oldest' && method === 'GET') {
    const task = tasks.oldestOpen();
    return task === undefined ? send(response, 404, { error: 'no open task' }) : send(response, 200, task);
  }
  if (parts.length === 2 && parts[1] === 'done' && method === 'DELETE') return send(response, 200, { removed: tasks.removeDone() });
  if (parts.length === 2 && parts[1] === 'complete-all' && method === 'POST') return send(response, 200, { completed: tasks.completeAll() });

  const id = Number(parts[1]);
  if (!Number.isInteger(id) || id < 1) return send(response, 404, { error: 'not found' });

  if (parts.length === 2 && method === 'GET') return found(response, tasks.get(id));
  if (parts.length === 2 && method === 'PATCH') return found(response, tasks.rename(id, (await body(request)).title));
  if (parts.length === 2 && method === 'DELETE') {
    return tasks.remove(id) ? send(response, 204) : send(response, 404, { error: 'not found' });
  }
  if (parts.length === 3 && parts[2] === 'complete' && method === 'POST') return found(response, tasks.complete(id));
  if (parts.length === 3 && parts[2] === 'reopen' && method === 'POST') return found(response, tasks.reopen(id));
  if (parts.length === 3 && parts[2] === 'toggle' && method === 'POST') return found(response, tasks.toggle(id));

  return send(response, 404, { error: 'not found' });
}

function found(response: ServerResponse, task: unknown): void {
  if (task === undefined) send(response, 404, { error: 'not found' });
  else send(response, 200, task);
}

/** The `done` query parameter: undefined when it is absent. Throws when it is not exactly one `true` or `false`. */
function doneFilter(searchParams: URLSearchParams): boolean | undefined {
  const values = searchParams.getAll('done');
  if (values.length === 0) return undefined;
  if (values.length === 1 && values[0] === 'true') return true;
  if (values.length === 1 && values[0] === 'false') return false;
  throw new ValidationError('done must be true or false');
}

/** The `q` query parameter: undefined when it is absent or empty. */
function searchFilter(searchParams: URLSearchParams): string | undefined {
  return searchParams.get('q') || undefined;
}

/** The `limit` query parameter: undefined when it is absent. Throws when it is not exactly one whole number above zero. */
function limitFilter(searchParams: URLSearchParams): number | undefined {
  const values = searchParams.getAll('limit');
  if (values.length === 0) return undefined;
  const [value] = values;
  if (values.length === 1 && value !== undefined && /^\d+$/.test(value) && Number(value) >= 1) return Number(value);
  throw new ValidationError('limit must be a whole number above zero');
}

/** The `sort` query parameter: undefined when it is absent. Throws when it is not exactly one `title` or `-title`. */
function sortOrder(searchParams: URLSearchParams): 'title' | '-title' | undefined {
  const values = searchParams.getAll('sort');
  if (values.length === 0) return undefined;
  if (values.length === 1 && values[0] === 'title') return 'title';
  if (values.length === 1 && values[0] === '-title') return '-title';
  throw new ValidationError('sort must be title or -title');
}
