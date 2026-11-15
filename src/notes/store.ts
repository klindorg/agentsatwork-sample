import { ValidationError } from '../http.ts';

export interface Note {
  id: number;
  text: string;
}

/** The most characters a note may have, after trimming. */
const MAX_TEXT_LENGTH = 500;

/** The text as it is stored. Throws when it is not text, is empty, or is too long. */
export function checkedText(text: unknown): string {
  if (typeof text !== 'string' || text.trim() === '') throw new ValidationError('text must be text');
  const trimmed = text.trim();
  if ([...trimmed].length > MAX_TEXT_LENGTH) throw new ValidationError(`text must be at most ${MAX_TEXT_LENGTH} characters`);
  return trimmed;
}

/** The notes, kept in memory. One instance per server. */
export class NoteStore {
  private readonly notes = new Map<number, Note>();
  private nextId = 1;

  add(text: string): Note {
    const note = { id: this.nextId++, text };
    this.notes.set(note.id, note);
    return note;
  }

  /** Every note, in the order they were added. */
  all(): Note[] {
    return [...this.notes.values()];
  }

  /** Remove a note. Returns whether there was one to remove. */
  remove(id: number): boolean {
    return this.notes.delete(id);
  }
}
