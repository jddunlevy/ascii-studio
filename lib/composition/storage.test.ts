import { describe, it, expect, beforeEach } from 'vitest';
import {
  listCompositions,
  saveComposition,
  loadComposition,
  deleteComposition,
} from './storage';
import { createComposition } from './defaults';

beforeEach(() => {
  localStorage.clear();
});

describe('listCompositions', () => {
  it('returns empty array when nothing saved', () => {
    expect(listCompositions()).toEqual([]);
  });

  it('returns compositions sorted by updatedAt descending', () => {
    const a = createComposition('alpha');
    const b = {
      ...createComposition('beta'),
      updatedAt: new Date(Date.now() + 1000).toISOString(),
    };
    saveComposition(a);
    saveComposition(b);
    const list = listCompositions();
    expect(list[0].name).toBe('beta');
    expect(list[1].name).toBe('alpha');
  });
});

describe('saveComposition + loadComposition', () => {
  it('round-trips a composition correctly', () => {
    const comp = createComposition('test');
    saveComposition(comp);
    const loaded = loadComposition(comp.id);
    expect(loaded).toEqual(comp);
  });

  it('overwriting the same id does not create a duplicate', () => {
    const comp = createComposition('test');
    saveComposition(comp);
    saveComposition({ ...comp, name: 'updated' });
    const list = listCompositions();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('updated');
  });
});

describe('deleteComposition', () => {
  it('removes a saved composition', () => {
    const comp = createComposition('to-delete');
    saveComposition(comp);
    deleteComposition(comp.id);
    expect(loadComposition(comp.id)).toBeNull();
    expect(listCompositions()).toHaveLength(0);
  });

  it('is a no-op for an unknown id', () => {
    const comp = createComposition('keep');
    saveComposition(comp);
    deleteComposition('nonexistent-id');
    expect(listCompositions()).toHaveLength(1);
  });
});
