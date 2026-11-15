import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { addNote } from '../../src/notes/features/add/add.ts';
import { deleteNote } from '../../src/notes/features/delete/delete.ts';
import { listNotes } from '../../src/notes/features/list/list.ts';
import { NoteStore } from '../../src/notes/store.ts';
import { startApp } from '../support.ts';
import { startAppWith } from './support.ts';

/**
 * The route table in src/notes/module.ts lists no features yet, so the server answers 404 for every
 * notes endpoint. These tests check what the spec asks of the served API; they are marked todo until
 * the features are wired in, and the marker should go then.
 */
const UNTIL_WIRED = { todo: 'src/notes/module.ts does not list the notes features yet' };

describe('the notes module, as the server serves it', () => {
  const call = startApp();

  it('adds a note, lists it, and deletes it', UNTIL_WIRED, async () => {
    const added = await call('POST', '/notes', { text: '  Buy milk  ' });
    assert.equal(added.status, 201);
    const id = added.json!.id as number;
    assert.deepEqual(added.json, { id, text: 'Buy milk' });

    assert.deepEqual(await call('GET', '/notes'), { status: 200, json: { notes: [{ id, text: 'Buy milk' }] } });
    assert.deepEqual(await call('DELETE', `/notes/${id}`), { status: 204, json: undefined });
    assert.deepEqual(await call('GET', '/notes'), { status: 200, json: { notes: [] } });
    assert.deepEqual(await call('DELETE', `/notes/${id}`), { status: 404, json: { error: 'not found' } });
  });

  it('refuses a bad note with 400 and does not list it', UNTIL_WIRED, async () => {
    const before = await call('GET', '/notes');
    assert.equal(before.status, 200);
    assert.deepEqual(await call('POST', '/notes', { text: '   ' }), { status: 400, json: { error: 'text must be text' } });
    assert.deepEqual(await call('POST', '/notes', { text: 'a'.repeat(501) }), { status: 400, json: { error: 'text must be at most 500 characters' } });
    assert.deepEqual(await call('GET', '/notes'), before);
  });

  it('keeps notes and tasks apart', UNTIL_WIRED, async () => {
    const task = (await call('POST', '/tasks', { title: 'A task' })).json!;
    const note = (await call('POST', '/notes', { text: 'A note' })).json!;

    assert.deepEqual((await call('GET', '/tasks')).json, { tasks: [task] });
    assert.deepEqual((await call('GET', '/notes')).json, { notes: [note] });

    assert.equal((await call('DELETE', `/notes/${note.id}`)).status, 204);
    assert.deepEqual(await call('GET', `/tasks/${task.id}`), { status: 200, json: task });

    await call('DELETE', `/tasks/${task.id}`);
  });

  it('answers 404 for a path or method it does not have', async () => {
    assert.deepEqual(await call('PUT', '/notes', { text: 'x' }), { status: 404, json: { error: 'not found' } });
    assert.deepEqual(await call('GET', '/notes/1'), { status: 404, json: { error: 'not found' } });
    assert.deepEqual(await call('GET', '/notes/1/extra'), { status: 404, json: { error: 'not found' } });
  });

  it('leaves the tasks routes to the tasks', async () => {
    const added = await call('POST', '/tasks', { title: 'Still works' });
    assert.equal(added.status, 201);
    const id = added.json!.id as number;
    assert.deepEqual(await call('GET', `/tasks/${id}`), { status: 200, json: { id, title: 'Still works', done: false } });
    assert.equal((await call('DELETE', `/tasks/${id}`)).status, 204);
  });

  it('leaves the health check to the server', async () => {
    assert.deepEqual(await call('GET', '/health'), { status: 200, json: { status: 'ok' } });
  });
});

describe('the notes features, served together over one store', () => {
  const store = new NoteStore();
  const call = startAppWith([addNote(store), listNotes(store), deleteNote(store)]);

  it('lists the notes it added, their text trimmed, in the order they were added', async () => {
    const first = (await call('POST', '/notes', { text: ' Buy milk ' })).json!;
    const second = (await call('POST', '/notes', { text: 'Call the bank\n' })).json!;
    assert.deepEqual(await call('GET', '/notes'), {
      status: 200,
      json: { notes: [{ id: first.id, text: 'Buy milk' }, { id: second.id, text: 'Call the bank' }] },
    });
  });

  it('does not list a note it refused', async () => {
    const before = (await call('GET', '/notes')).json;
    assert.equal((await call('POST', '/notes', { text: '' })).status, 400);
    assert.equal((await call('POST', '/notes', { text: 'a'.repeat(501) })).status, 400);
    assert.deepEqual((await call('GET', '/notes')).json, before);
  });

  it('deletes a note by the id it was added with, and lists the rest in order', async () => {
    const [first, second] = (await call('GET', '/notes')).json!.notes as Record<string, unknown>[];
    const third = (await call('POST', '/notes', { text: 'Water the plants' })).json!;

    assert.equal((await call('DELETE', `/notes/${second!.id}`)).status, 204);
    assert.deepEqual((await call('GET', '/notes')).json, { notes: [first, third] });
    assert.deepEqual(await call('DELETE', `/notes/${second!.id}`), { status: 404, json: { error: 'not found' } });
  });

  it('lists none once every note is deleted', async () => {
    for (const note of (await call('GET', '/notes')).json!.notes as Record<string, unknown>[]) {
      assert.equal((await call('DELETE', `/notes/${note.id}`)).status, 204);
    }
    assert.deepEqual(await call('GET', '/notes'), { status: 200, json: { notes: [] } });
  });
});
