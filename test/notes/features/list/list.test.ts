import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { listNotes } from '../../../../src/notes/features/list/list.ts';
import { NoteStore } from '../../../../src/notes/store.ts';
import { startAppWith } from './support.ts';

describe('listing the notes', () => {
  const store = new NoteStore();
  const call = startAppWith([listNotes(store)]);

  it('answers an empty list when there are none', async () => {
    assert.deepEqual(await call('GET', '/notes'), { status: 200, json: { notes: [] } });
  });

  it('lists every note, with its id and text, in the order they were added', async () => {
    const first = store.add('Buy milk');
    const second = store.add('Call the bank');
    const third = store.add('Water the plants');
    assert.deepEqual(await call('GET', '/notes'), { status: 200, json: { notes: [first, second, third] } });
  });

  it('leaves out a note that was removed, keeping the others in order', async () => {
    const [first, second, third] = store.all();
    store.remove(second!.id);
    assert.deepEqual(await call('GET', '/notes'), { status: 200, json: { notes: [first, third] } });
  });

  it('leaves other methods and paths to other features', async () => {
    assert.deepEqual(await call('POST', '/notes', { text: 'x' }), { status: 404, json: { error: 'not found' } });
    assert.deepEqual(await call('DELETE', '/notes'), { status: 404, json: { error: 'not found' } });
    assert.deepEqual(await call('GET', '/notes/1'), { status: 404, json: { error: 'not found' } });
  });
});
