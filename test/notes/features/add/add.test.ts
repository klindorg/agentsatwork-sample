import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { addNote } from '../../../../src/notes/features/add/add.ts';
import { NoteStore } from '../../../../src/notes/store.ts';
import { startAppWith } from '../../../support.ts';

describe('adding a note', () => {
  const store = new NoteStore();
  const call = startAppWith([addNote(store)]);

  it('answers 201 with the note, its text trimmed', async () => {
    const added = await call('POST', '/notes', { text: '  Buy milk  ' });
    assert.equal(added.status, 201);
    assert.equal(added.json!.text, 'Buy milk');
    assert.equal(typeof added.json!.id, 'number');
  });

  it('keeps the note it added', async () => {
    const added = await call('POST', '/notes', { text: 'Call the bank' });
    assert.deepEqual(store.all().at(-1), added.json);
  });

  it('gives each note its own id, counting up', async () => {
    const first = await call('POST', '/notes', { text: 'One' });
    const second = await call('POST', '/notes', { text: 'Two' });
    assert.equal(second.json!.id, (first.json!.id as number) + 1);
  });

  it('accepts text of exactly 500 characters', async () => {
    const added = await call('POST', '/notes', { text: 'a'.repeat(500) });
    assert.equal(added.status, 201);
    assert.equal(added.json!.text, 'a'.repeat(500));
  });

  it('counts the 500 characters after trimming', async () => {
    const added = await call('POST', '/notes', { text: `   ${'a'.repeat(500)}   ` });
    assert.equal(added.status, 201);
    assert.equal(added.json!.text, 'a'.repeat(500));
  });

  it('refuses text longer than 500 characters even when it has spaces to trim', async () => {
    const before = store.all().length;
    assert.deepEqual(await call('POST', '/notes', { text: ` ${'a'.repeat(501)} ` }), { status: 400, json: { error: 'text must be at most 500 characters' } });
    assert.equal(store.all().length, before);
  });

  it('refuses a note with no text, or text that is not text', async () => {
    const before = store.all().length;
    assert.deepEqual(await call('POST', '/notes', { text: '   ' }), { status: 400, json: { error: 'text must be text' } });
    assert.deepEqual(await call('POST', '/notes', { text: '' }), { status: 400, json: { error: 'text must be text' } });
    assert.deepEqual(await call('POST', '/notes', { text: 7 }), { status: 400, json: { error: 'text must be text' } });
    assert.deepEqual(await call('POST', '/notes', {}), { status: 400, json: { error: 'text must be text' } });
    assert.equal(store.all().length, before);
  });

  it('refuses text longer than 500 characters', async () => {
    assert.deepEqual(await call('POST', '/notes', { text: 'a'.repeat(501) }), { status: 400, json: { error: 'text must be at most 500 characters' } });
  });

  it('refuses a body that is not a JSON object', async () => {
    assert.deepEqual(await call('POST', '/notes', 'hello'), { status: 400, json: { error: 'the body must be JSON' } });
    assert.deepEqual(await call('POST', '/notes', [1]), { status: 400, json: { error: 'the body must be a JSON object' } });
  });

  it('leaves other methods and paths to other features', async () => {
    assert.deepEqual(await call('GET', '/notes/1/extra'), { status: 404, json: { error: 'not found' } });
    assert.deepEqual(await call('POST', '/notes/1', { text: 'x' }), { status: 404, json: { error: 'not found' } });
  });
});
