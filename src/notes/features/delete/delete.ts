import { send, type Handler } from '../../../http.ts';
import type { NoteStore } from '../../store.ts';

/** DELETE /notes/:id: removes the note and answers 204, or 404 when there is no such note. */
export function deleteNote(store: NoteStore): Handler {
  return async ({ method, parts, response }) => {
    if (method !== 'DELETE' || parts.length !== 2 || parts[0] !== 'notes') return false;
    const id = Number(parts[1]);
    if (Number.isInteger(id) && id >= 1 && store.remove(id)) send(response, 204);
    else send(response, 404, { error: 'not found' });
    return true;
  };
}
