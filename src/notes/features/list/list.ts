import { send, type Handler } from '../../../http.ts';
import type { NoteStore } from '../../store.ts';

/** GET /notes: every note, in the order they were added. */
export function listNotes(store: NoteStore): Handler {
  return async ({ method, parts, response }) => {
    if (method !== 'GET' || parts.length !== 1 || parts[0] !== 'notes') return false;
    send(response, 200, { notes: store.all() });
    return true;
  };
}
