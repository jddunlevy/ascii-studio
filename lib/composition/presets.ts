import type { ElementPreset, PresetLibrary } from '@/lib/types';

const STORAGE_KEY = 'ascii-studio-presets';

export function loadPresets(): PresetLibrary {
  try {
    const json = localStorage.getItem(STORAGE_KEY);
    if (!json) return { presets: [] };
    return JSON.parse(json) as PresetLibrary;
  } catch (e) {
    console.error('Failed to load presets:', e);
    return { presets: [] };
  }
}

function savePresets(library: PresetLibrary): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
  } catch (e) {
    console.error('Failed to save presets:', e);
  }
}

export function savePreset(preset: ElementPreset): void {
  const library = loadPresets();

  // Check for duplicate name
  const existing = library.presets.find(p => p.name === preset.name);
  if (existing) {
    // Append timestamp suffix
    preset.name = `${preset.name} (${Date.now()})`;
  }

  library.presets.push(preset);
  savePresets(library);
}

export function deletePreset(id: string): void {
  const library = loadPresets();
  library.presets = library.presets.filter(p => p.id !== id);
  savePresets(library);
}

export function searchPresets(query: string): ElementPreset[] {
  const library = loadPresets();
  if (!query) return library.presets;

  const lowerQuery = query.toLowerCase();

  return library.presets.filter(p =>
    p.name.toLowerCase().includes(lowerQuery) ||
    p.content.toLowerCase().includes(lowerQuery) ||
    p.tags?.some(t => t.toLowerCase().includes(lowerQuery))
  );
}
