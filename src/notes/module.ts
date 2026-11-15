import type { Handler } from '../http.ts';
import { addNote } from './features/add/add.ts';
import { deleteNote } from './features/delete/delete.ts';
import { listNotes } from './features/list/list.ts';
import { NoteStore } from './store.ts';

/** The notes module: its features, asked in turn. A new feature is one more line here. */
export function notes(store: NoteStore = new NoteStore()): Handler {
  const features: Handler[] = [addNote(store), listNotes(store), deleteNote(store)];
  return async (route) => {
    for (const feature of features) if (await feature(route)) return true;
    return false;
  };
}
