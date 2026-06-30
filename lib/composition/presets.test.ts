import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadPresets, savePreset, deletePreset, searchPresets } from './presets';

describe('Preset Storage', () => {
  const STORAGE_KEY = 'ascii-studio-presets';

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('loadPresets', () => {
    it('returns empty library when no presets stored', () => {
      const library = loadPresets();
      expect(library.presets).toEqual([]);
    });

    it('loads presets from localStorage', () => {
      const mockLibrary = {
        presets: [
          { id: 'p1', name: 'Test', type: 'text' as const, content: 'hello', createdAt: '2026-06-30' },
        ],
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mockLibrary));

      const library = loadPresets();
      expect(library.presets).toHaveLength(1);
      expect(library.presets[0].name).toBe('Test');
    });
  });

  describe('savePreset', () => {
    it('adds preset to library', () => {
      const preset = {
        id: 'p1',
        name: 'Skull',
        type: 'ascii_art' as const,
        content: '▓▓▓',
        createdAt: '2026-06-30',
      };

      savePreset(preset);

      const library = loadPresets();
      expect(library.presets).toHaveLength(1);
      expect(library.presets[0].name).toBe('Skull');
    });

    it('appends timestamp suffix for duplicate names', () => {
      const preset1 = {
        id: 'p1',
        name: 'Test',
        type: 'text' as const,
        content: 'hello',
        createdAt: '2026-06-30',
      };
      const preset2 = {
        id: 'p2',
        name: 'Test',
        type: 'text' as const,
        content: 'world',
        createdAt: '2026-06-30',
      };

      savePreset(preset1);
      savePreset(preset2);

      const library = loadPresets();
      expect(library.presets).toHaveLength(2);
      expect(library.presets[0].name).toBe('Test');
      expect(library.presets[1].name).toContain('Test (');
    });
  });

  describe('deletePreset', () => {
    it('removes preset from library', () => {
      const preset = {
        id: 'p1',
        name: 'Test',
        type: 'text' as const,
        content: 'hello',
        createdAt: '2026-06-30',
      };
      savePreset(preset);

      deletePreset('p1');

      const library = loadPresets();
      expect(library.presets).toHaveLength(0);
    });

    it('does not error when deleting non-existent preset', () => {
      expect(() => deletePreset('non-existent')).not.toThrow();
    });
  });

  describe('searchPresets', () => {
    beforeEach(() => {
      savePreset({
        id: 'p1',
        name: 'Skull Art',
        type: 'ascii_art' as const,
        content: '▓▓▓',
        createdAt: '2026-06-30',
        tags: ['skull', 'spooky'],
      });
      savePreset({
        id: 'p2',
        name: 'Wave Pattern',
        type: 'text' as const,
        content: '~≈~',
        createdAt: '2026-06-30',
        tags: ['waves'],
      });
    });

    it('returns all presets for empty query', () => {
      const results = searchPresets('');
      expect(results).toHaveLength(2);
    });

    it('filters by name', () => {
      const results = searchPresets('skull');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Skull Art');
    });

    it('filters by content', () => {
      const results = searchPresets('~≈');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Wave Pattern');
    });

    it('filters by tags', () => {
      const results = searchPresets('spooky');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Skull Art');
    });

    it('is case-insensitive', () => {
      const results = searchPresets('SKULL');
      expect(results).toHaveLength(1);
    });
  });
});
