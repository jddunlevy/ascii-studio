import { describe, it, expect, beforeEach } from 'vitest';
import { applyThresholdBinding, ThresholdState } from './threshold';
import type { Binding, ThresholdTransform } from '@/lib/types';

describe('applyThresholdBinding', () => {
  let mockBinding: Binding;
  let state: ThresholdState;
  let now: number;

  beforeEach(() => {
    now = Date.now();
    state = {
      isAbove: false,
      lastCrossTime: 0,
    };
    mockBinding = {
      id: 'b1',
      elementId: 'e1',
      signal: 'volume',
      property: 'opacity',
      mode: 'threshold',
      thresholdTransform: {
        threshold: 0.7,
        aboveValue: 1.0,
        belowValue: 0.3,
        action: 'switch',
      },
    };
  });

  describe('switch action', () => {
    it('returns belowValue when signal below threshold', () => {
      const result = applyThresholdBinding(mockBinding, 0.5, state, now);
      expect(result).toBe(0.3);
      expect(state.isAbove).toBe(false);
    });

    it('switches to aboveValue when crossing threshold', () => {
      const result = applyThresholdBinding(mockBinding, 0.75, state, now);
      expect(result).toBe(1.0);
      expect(state.isAbove).toBe(true);
      expect(state.lastCrossTime).toBe(now);
    });

    it('stays above threshold with hysteresis', () => {
      mockBinding.thresholdTransform!.returnThreshold = 0.6;
      state.isAbove = true;

      // Signal at 0.65 - above returnThreshold (0.6), stays above
      const result = applyThresholdBinding(mockBinding, 0.65, state, now);
      expect(result).toBe(1.0);
      expect(state.isAbove).toBe(true);
    });

    it('returns to belowValue when crossing returnThreshold', () => {
      mockBinding.thresholdTransform!.returnThreshold = 0.6;
      state.isAbove = true;

      // Signal at 0.55 - below returnThreshold (0.6), go below
      const result = applyThresholdBinding(mockBinding, 0.55, state, now);
      expect(result).toBe(0.3);
      expect(state.isAbove).toBe(false);
    });
  });

  describe('strobe action', () => {
    beforeEach(() => {
      mockBinding.thresholdTransform!.action = 'strobe';
      mockBinding.thresholdTransform!.strobeSpeed = 100;
    });

    it('returns belowValue when signal below threshold', () => {
      const result = applyThresholdBinding(mockBinding, 0.5, state, now);
      expect(result).toBe(0.3);
    });

    it('starts strobing when crossing threshold', () => {
      const result = applyThresholdBinding(mockBinding, 0.75, state, now);
      expect(result).toBe(1.0); // First flash = aboveValue
      expect(state.isAbove).toBe(true);
    });

    it('alternates between values at strobeSpeed interval', () => {
      state.isAbove = true;
      state.lastCrossTime = now - 50; // 50ms ago

      // Flash index = 0, show aboveValue
      let result = applyThresholdBinding(mockBinding, 0.8, state, now);
      expect(result).toBe(1.0);

      // 150ms elapsed (flash index = 1)
      state.lastCrossTime = now - 150;
      result = applyThresholdBinding(mockBinding, 0.8, state, now);
      expect(result).toBe(0.3); // belowValue

      // 250ms elapsed (flash index = 2)
      state.lastCrossTime = now - 250;
      result = applyThresholdBinding(mockBinding, 0.8, state, now);
      expect(result).toBe(1.0); // aboveValue again
    });

    it('stops strobing when signal drops below threshold', () => {
      state.isAbove = true;
      state.lastCrossTime = now - 50;

      const result = applyThresholdBinding(mockBinding, 0.6, state, now);
      expect(result).toBe(0.3); // belowValue
      expect(state.isAbove).toBe(false);
    });
  });

  describe('pulse action', () => {
    beforeEach(() => {
      mockBinding.thresholdTransform!.action = 'pulse';
      mockBinding.thresholdTransform!.pulseDuration = 200;
    });

    it('returns belowValue when signal below threshold', () => {
      const result = applyThresholdBinding(mockBinding, 0.5, state, now);
      expect(result).toBe(0.3);
    });

    it('pulses to aboveValue when crossing threshold', () => {
      const result = applyThresholdBinding(mockBinding, 0.75, state, now);
      expect(result).toBe(1.0);
      expect(state.pulseEndTime).toBe(now + 200);
    });

    it('holds aboveValue for pulseDuration', () => {
      state.isAbove = true;
      state.pulseEndTime = now + 100; // 100ms remaining

      const result = applyThresholdBinding(mockBinding, 0.8, state, now);
      expect(result).toBe(1.0); // Still holding
    });

    it('returns to belowValue after pulseDuration expires', () => {
      state.isAbove = true;
      state.pulseEndTime = now - 10; // Expired 10ms ago

      const result = applyThresholdBinding(mockBinding, 0.8, state, now);
      expect(result).toBe(0.3); // Back to belowValue
    });

    it('resets pulse on re-crossing threshold', () => {
      state.isAbove = false;

      // First pulse
      let result = applyThresholdBinding(mockBinding, 0.75, state, now);
      expect(state.pulseEndTime).toBe(now + 200);

      // Drop below
      state.isAbove = false;
      applyThresholdBinding(mockBinding, 0.6, state, now + 50);

      // Cross again
      const newNow = now + 100;
      result = applyThresholdBinding(mockBinding, 0.75, state, newNow);
      expect(state.pulseEndTime).toBe(newNow + 200); // New pulse
    });
  });
});
