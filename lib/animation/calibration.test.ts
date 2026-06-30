import { describe, it, expect, beforeEach } from 'vitest';
import { getCalibratedSignal } from './calibration';
import type { GlobalAudioConfig, ElementSensitivity, BindingCalibration, Binding, Signals } from '@/lib/types';

describe('getCalibratedSignal', () => {
  let globalConfig: GlobalAudioConfig;
  let elementSensitivities: Record<string, ElementSensitivity>;
  let smoothedSignals: Partial<Signals>;
  let mockBinding: Binding;

  beforeEach(() => {
    globalConfig = {
      volumeSensitivity: 1.0,
      bassSensitivity: 1.0,
      midSensitivity: 1.0,
      trebleSensitivity: 1.0,
      noiseFloor: 0.05,
      signalSmoothing: 0.5,
    };
    elementSensitivities = {};
    smoothedSignals = {};
    mockBinding = {
      id: 'b1',
      elementId: 'e1',
      signal: 'volume',
      property: 'opacity',
      mode: 'continuous',
      continuousTransform: { min: 0, max: 1, invert: false },
    };
  });

  it('returns raw signal when no calibration applied', () => {
    const result = getCalibratedSignal(
      0.5, 'volume', 'e1', mockBinding, globalConfig, elementSensitivities, smoothedSignals
    );
    expect(result).toBeCloseTo(0.5, 2);
  });

  it('applies global sensitivity', () => {
    globalConfig.bassSensitivity = 2.0;
    const result = getCalibratedSignal(
      0.5, 'bass', 'e1', mockBinding, globalConfig, elementSensitivities, smoothedSignals
    );
    expect(result).toBeCloseTo(1.0, 2);
  });

  it('filters signals below noise floor', () => {
    globalConfig.noiseFloor = 0.1;
    const result = getCalibratedSignal(
      0.08, 'volume', 'e1', mockBinding, globalConfig, elementSensitivities, smoothedSignals
    );
    expect(result).toBe(0);
  });

  it('applies element sensitivity multiplier', () => {
    elementSensitivities['e1'] = { enabled: true, multiplier: 2.0 };
    const result = getCalibratedSignal(
      0.3, 'volume', 'e1', mockBinding, globalConfig, elementSensitivities, smoothedSignals
    );
    expect(result).toBeCloseTo(0.6, 2);
  });

  it('applies binding calibration offset and multiplier', () => {
    mockBinding.calibration = {
      signalOffset: 0.1,
      signalMultiplier: 2.0,
      clampMin: 0,
      clampMax: 1,
    };
    const result = getCalibratedSignal(
      0.3, 'volume', 'e1', mockBinding, globalConfig, elementSensitivities, smoothedSignals
    );
    // (0.3 + 0.1) * 2.0 = 0.8
    expect(result).toBeCloseTo(0.8, 2);
  });

  it('clamps to binding calibration min/max', () => {
    mockBinding.calibration = {
      signalOffset: 0,
      signalMultiplier: 3.0,
      clampMin: 0.2,
      clampMax: 0.8,
    };
    const result = getCalibratedSignal(
      0.4, 'volume', 'e1', mockBinding, globalConfig, elementSensitivities, smoothedSignals
    );
    // 0.4 * 3.0 = 1.2, clamped to 0.8
    expect(result).toBe(0.8);
  });

  it('applies signal smoothing', () => {
    smoothedSignals.volume = 0.3;
    globalConfig.signalSmoothing = 0.5;
    const result = getCalibratedSignal(
      0.7, 'volume', 'e1', mockBinding, globalConfig, elementSensitivities, smoothedSignals
    );
    // smoothed * (1 - 0.5) + raw * 0.5 = 0.3 * 0.5 + 0.7 * 0.5 = 0.5
    expect(result).toBeCloseTo(0.5, 2);
  });

  it('applies all calibration layers in order', () => {
    globalConfig.bassSensitivity = 1.5;
    globalConfig.noiseFloor = 0.02;
    globalConfig.signalSmoothing = 0.3;
    elementSensitivities['e1'] = { enabled: true, multiplier: 1.2 };
    mockBinding.calibration = {
      signalOffset: 0.05,
      signalMultiplier: 1.1,
      clampMin: 0,
      clampMax: 1,
    };
    smoothedSignals.bass = 0.4;

    const result = getCalibratedSignal(
      0.5, 'bass', 'e1', mockBinding, globalConfig, elementSensitivities, smoothedSignals
    );

    // Expected flow:
    // 1. Global: 0.5 * 1.5 = 0.75
    // 2. Noise floor: 0.75 > 0.02, pass
    // 3. Smoothing: 0.4 * 0.7 + 0.75 * 0.3 = 0.505
    // 4. Element: 0.505 * 1.2 = 0.606
    // 5. Binding: (0.606 + 0.05) * 1.1 = 0.7216
    // 6. Clamp: 0.7216 in [0, 1], no change
    expect(result).toBeCloseTo(0.72, 1);
  });
});
