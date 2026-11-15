import type { Handler } from '../http.ts';
import { NoteStore } from './store.ts';

/** The notes module: its features, asked in turn. A new feature is one more line here. */
export function notes(store: NoteStore = new NoteStore()): Handler {
  const features: Handler[] = [];
  return async (route) => {
    for (const feature of features) if (await feature(route)) return true;
    return false;
  };
}
