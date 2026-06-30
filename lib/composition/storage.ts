import type { CompositionSpec } from '@/lib/types';
import { DEFAULT_BACKGROUND, DEFAULT_GLOBAL_AUDIO } from '@/lib/composition/defaults';

const STORAGE_KEY = 'ascii-studio:compositions';

function migrateBackground(comp: CompositionSpec): CompositionSpec {
  const bg = comp.background as Record<string, unknown> | undefined;
  if (!bg) return comp;
  // Old hue-based config — replace entirely
  if ('baseHue' in bg) {
    return { ...comp, background: { ...DEFAULT_BACKGROUND } };
  }
  // V1 Lissajous config missing darkMode — add default
  if (!('darkMode' in bg)) {
    return { ...comp, background: { ...bg, darkMode: false } as any };
  }
  return comp;
}

function migrateComposition(comp: CompositionSpec): CompositionSpec {
  return {
    ...comp,
    // Migrate old bindings without 'mode' field
    bindings: comp.bindings.map(binding => {
      if (!binding.mode) {
        // Old binding - migrate to continuous mode
        return {
          ...binding,
          mode: 'continuous' as const,
          continuousTransform: binding.transform ? {
            min: binding.transform.min,
            max: binding.transform.max,
            invert: binding.transform.invert,
          } : { min: 0, max: 1, invert: false },
        };
      }
      return binding;
    }),
    // Add default global audio config if missing
    globalAudioConfig: comp.globalAudioConfig ?? DEFAULT_GLOBAL_AUDIO,
  };
}

function readAll(): Record<string, CompositionSpec> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, CompositionSpec>;
    return Object.fromEntries(
      Object.entries(parsed).map(([id, comp]) => [id, migrateComposition(migrateBackground(comp))])
    );
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
