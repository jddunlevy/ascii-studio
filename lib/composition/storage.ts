import type { CompositionSpec } from '@/lib/types';

const STORAGE_KEY = 'ascii-studio:compositions';

function readAll(): Record<string, CompositionSpec> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, CompositionSpec>;
  } catch {
    return {};
  }
}

function writeAll(data: Record<string, CompositionSpec>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function listCompositions(): CompositionSpec[] {
  const all = readAll();
  return Object.values(all).sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function saveComposition(comp: CompositionSpec): void {
  const all = readAll();
  all[comp.id] = comp;
  writeAll(all);
}

export function loadComposition(id: string): CompositionSpec | null {
  const all = readAll();
  return all[id] ?? null;
}

export function deleteComposition(id: string): void {
  const all = readAll();
  delete all[id];
  writeAll(all);
}
