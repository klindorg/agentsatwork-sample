# agentsatwork-sample

A small task list API over HTTP, with notes next to the tasks, kept in memory. It is the sample target repository for
AgentsAtWork: the repository the pipeline opens pull requests against in its own end-to-end test
and in an adopter's first run. It is small on purpose, so a job is cheap and fast.

## The API

| Method | Path | What it does |
|---|---|---|
| GET | `/health` | Says the server is up |
| GET | `/tasks` | Lists every task. Takes `?done=true` or `?done=false` to list only the tasks that are done, or only those that are not. Takes `?q=...` to list only the tasks whose title contains it, ignoring case; it works together with `done`, and an empty `q` is ignored. Takes `?sort=title` to sort those by title, A to Z, ignoring case, or `?sort=-title` to sort them Z to A; any other `sort` answers 400. Takes `?limit=n` to list at most the first `n` of those, after `done`, `q`, and `sort`; a `limit` that is not a whole number above zero answers 400 |
| POST | `/tasks` | Adds a task, body `{"title": "..."}` |
| GET | `/tasks/count` | Says how many tasks there are, how many are done, how many are not, and what share are done: `{"total": n, "done": d, "open": o, "donePercent": p}`. `p` is a whole number from 0 to 100, rounded down, and 0 when there are no tasks. Takes `?q=...` to count only the tasks whose title contains it, ignoring case, in all four numbers; an empty `q` is ignored |
| GET | `/tasks/oldest` | Returns the task that is not done and was added first, in the same shape as `GET /tasks/:id`. Answers 404 with `{"error": "no open task"}` when there is none |
| DELETE | `/tasks/done` | Removes every task that is done, and says how many |
| GET | `/tasks/:id` | Returns one task |
| PATCH | `/tasks/:id` | Changes a task's title, body `{"title": "..."}` |
| POST | `/tasks/:id/complete` | Marks a task done |
| POST | `/tasks/:id/reopen` | Marks a task not done |
| DELETE | `/tasks/:id` | Removes a task |

A title is at most 200 characters, after leading and trailing spaces are trimmed. Adding or
renaming a task with a longer title answers 400 and changes nothing.

### Notes

Notes live next to the tasks and are kept apart from them: a note has an `id` and a `text`, and
its ids are its own.

| Method | Path | What it does |
|---|---|---|
| POST | `/notes` | Adds a note, body `{"text": "..."}`, and answers 201 with it: `{"id": n, "text": "..."}` |
| GET | `/notes` | Lists every note, in the order they were added: `{"notes": [...]}` |
| DELETE | `/notes/:id` | Removes a note and answers 204, or 404 with `{"error": "not found"}` when there is no such note |

The text is trimmed of leading and trailing spaces, must not then be empty, and may be at most 500
characters. Otherwise `POST /notes` answers 400 with an error and adds nothing.

## Working on it

Node 24 or newer. The source is TypeScript and runs as it is; there is no compile step.

```
npm ci
npm run build    # type-checks the source and the tests
npm test
npm start        # serves on http://localhost:3000, or the port in PORT
```

## How AgentsAtWork sees it

`.agentsatwork.yml` at the root states the stack, the base branch, and the build and test
commands. CI (`.github/workflows/ci.yml`) runs the same build and tests on every pull request, as
the check named `build`.
