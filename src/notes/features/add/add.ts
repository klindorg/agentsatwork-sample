import { body, send, type Handler } from '../../../http.ts';
import { checkedText, type NoteStore } from '../../store.ts';

/** POST /notes, body {"text": "..."}: adds a note and answers 201 with it. */
export function addNote(store: NoteStore): Handler {
  return async ({ method, parts, request, response }) => {
    if (method !== 'POST' || parts.length !== 1 || parts[0] !== 'notes') return false;
    const text = checkedText((await body(request)).text);
    send(response, 201, store.add(text));
    return true;
  };
}
