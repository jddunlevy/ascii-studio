import { describe, it, expect } from 'vitest';
import { applyTransform, applyBinding, computeLiveValues } from './animationLoop';
import type { Binding, Signals, GlobalAudioConfig, ElementSensitivity } from '@/lib/types';

const mockGlobalConfig: GlobalAudioConfig = {
  volumeSensitivity: 1.0,
  bassSensitivity: 1.0,
  midSensitivity: 1.0,
  trebleSensitivity: 1.0,
  noiseFloor: 0.05,
  signalSmoothing: 0.5,
};

const mockElementSensitivities: Record<string, ElementSensitivity> = {};

describe('applyTransform', () => {
  it('returns min when signal is 0 and not inverted', () => {
    expect(applyTransform(0, { min: 10, max: 50, invert: false })).toBe(10);
  });

  it('returns max when signal is 1 and not inverted', () => {
    expect(applyTransform(1, { min: 10, max: 50, invert: false })).toBe(50);
  });

  it('returns midpoint when signal is 0.5 and not inverted', () => {
    expect(applyTransform(0.5, { min: 10, max: 50, invert: false })).toBe(30);
  });

  it('returns max when signal is 0 and inverted', () => {
    expect(applyTransform(0, { min: 10, max: 50, invert: true })).toBe(50);
  });

  it('returns min when signal is 1 and inverted', () => {
    expect(applyTransform(1, { min: 10, max: 50, invert: true })).toBe(10);
  });
});

describe('applyBinding', () => {
  const signals: Signals = { volume: 0.5, bass: 0.5, mid: 0.5, treble: 0.5 };

  it('maps opacity signal through transform correctly', () => {
    const binding: Binding = {
      id: 'b1',
      elementId: 'el1',
      signal: 'volume',
      property: 'opacity',
      transform: { min: 0, max: 1, invert: false },
    };
    const result = applyBinding(binding, signals, mockGlobalConfig, mockElementSensitivities, Date.now());
    expect(result).toEqual({ property: 'opacity', value: 0.5 });
  });

  it('selects frame by index for content property (signal=0.5, 4 frames, no invert)', () => {
    const binding: Binding = {
      id: 'b2',
      elementId: 'el1',
      signal: 'volume',
      property: 'content',
      transform: { min: 0, max: 1, invert: false },
      frames: [' ', '·', '▒', '█'],
    };
    // signal=0.5, not inverted => effective=0.5
    // index = floor(0.5 * (4-1)) = floor(1.5) = 1 => '·'
    const result = applyBinding(binding, signals, mockGlobalConfig, mockElementSensitivities, Date.now());
    expect(result).toEqual({ property: 'content', value: '·' });
  });

  it('returns empty string for content binding with no frames', () => {
    const binding: Binding = {
      id: 'b3',
      elementId: 'el1',
      signal: 'volume',
      property: 'content',
      transform: { min: 0, max: 1, invert: false },
      frames: [],
    };
    const result = applyBinding(binding, signals, mockGlobalConfig, mockElementSensitivities, Date.now());
    expect(result).toEqual({ property: 'content', value: '' });
  });
});

describe('computeLiveValues', () => {
  it('groups two bindings for different elements correctly', () => {
    const signals: Signals = { volume: 1, bass: 0, mid: 0, treble: 0 };
    const bindings: Binding[] = [
      {
        id: 'b1',
        elementId: 'el1',
        signal: 'volume',
        property: 'opacity',
        transform: { min: 0, max: 1, invert: false },
      },
      {
        id: 'b2',
        elementId: 'el2',
        signal: 'volume',
        property: 'hue',
        transform: { min: 0, max: 360, invert: false },
      },
    ];
    const live = computeLiveValues(bindings, signals, mockGlobalConfig, mockElementSensitivities);
    expect(live['el1']).toEqual({ opacity: 1 });
    expect(live['el2']).toEqual({ hue: 360 });
  });

  it('merges multiple bindings for the same element', () => {
    const signals: Signals = { volume: 0, bass: 1, mid: 0, treble: 0 };
    const bindings: Binding[] = [
      {
        id: 'b1',
        elementId: 'el1',
        signal: 'volume',
        property: 'opacity',
        transform: { min: 0.2, max: 1, invert: false },
      },
      {
        id: 'b2',
        elementId: 'el1',
        signal: 'bass',
        property: 'hue',
        transform: { min: 0, max: 180, invert: false },
      },
    ];
    const live = computeLiveValues(bindings, signals, mockGlobalConfig, mockElementSensitivities);
    expect(live['el1']).toEqual({ opacity: 0.2, hue: 180 });
  });
});
