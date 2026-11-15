import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { deleteNote } from '../../../../src/notes/features/delete/delete.ts';
import { NoteStore } from '../../../../src/notes/store.ts';
import { startAppWith } from './support.ts';

describe('deleting a note', () => {
  const store = new NoteStore();
  const call = startAppWith([deleteNote(store)]);

  it('removes the note and answers 204 with no body', async () => {
    const note = store.add('Buy milk');
    assert.deepEqual(await call('DELETE', `/notes/${note.id}`), { status: 204, json: undefined });
    assert.deepEqual(store.all(), []);
  });

  it('keeps the other notes, in order', async () => {
    const first = store.add('One');
    const second = store.add('Two');
    const third = store.add('Three');
    assert.equal((await call('DELETE', `/notes/${second.id}`)).status, 204);
    assert.deepEqual(store.all(), [first, third]);
  });

  it('answers 404 when there is no such note', async () => {
    const before = store.all();
    assert.deepEqual(await call('DELETE', '/notes/999'), { status: 404, json: { error: 'not found' } });
    assert.deepEqual(store.all(), before);
  });

  it('answers 404 when the note was already deleted', async () => {
    const note = store.add('Once');
    assert.equal((await call('DELETE', `/notes/${note.id}`)).status, 204);
    assert.deepEqual(await call('DELETE', `/notes/${note.id}`), { status: 404, json: { error: 'not found' } });
  });

  it('answers 404 for an id that is not a whole number above zero', async () => {
    const before = store.all();
    for (const id of ['abc', '0', '-1', '1.5']) {
      assert.deepEqual(await call('DELETE', `/notes/${id}`), { status: 404, json: { error: 'not found' } });
    }
    assert.deepEqual(store.all(), before);
  });

  it('leaves other methods and paths to other features', async () => {
    const note = store.add('Stay');
    assert.deepEqual(await call('GET', `/notes/${note.id}`), { status: 404, json: { error: 'not found' } });
    assert.deepEqual(await call('DELETE', '/notes'), { status: 404, json: { error: 'not found' } });
    assert.deepEqual(await call('DELETE', `/notes/${note.id}/extra`), { status: 404, json: { error: 'not found' } });
    assert.deepEqual(store.all().at(-1), note);
  });
});
