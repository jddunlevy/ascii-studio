import { describe, it, expect } from 'vitest';
import { calculateBarAmplitudes, smoothAmplitudes, applyDecay } from './SpectrumCalculator';

describe('SpectrumCalculator', () => {
  describe('calculateBarAmplitudes', () => {
    it('returns correct number of bars', () => {
      const freqData = new Uint8Array(1024).fill(128);
      const barCount = 8;
      const freqRanges = [20, 60, 250, 500, 2000, 4000, 8000, 16000, 20000];
      const result = calculateBarAmplitudes(freqData, barCount, freqRanges, 44100);
      expect(result).toHaveLength(barCount);
    });

    it('returns amplitudes between 0 and 1', () => {
      const freqData = new Uint8Array(1024).fill(255);
      const barCount = 4;
      const freqRanges = [20, 500, 2000, 8000, 20000];
      const result = calculateBarAmplitudes(freqData, barCount, freqRanges, 44100);
      result.forEach(amp => {
        expect(amp).toBeGreaterThanOrEqual(0);
        expect(amp).toBeLessThanOrEqual(1);
      });
    });

    it('returns zeros for empty frequency data', () => {
      const freqData = new Uint8Array(0);
      const barCount = 4;
      const freqRanges = [20, 500, 2000, 8000, 20000];
      const result = calculateBarAmplitudes(freqData, barCount, freqRanges, 44100);
      expect(result).toEqual([0, 0, 0, 0]);
    });
  });

  describe('smoothAmplitudes', () => {
    it('interpolates between current and previous', () => {
      const current = [1, 0, 1, 0];
      const previous = [0, 1, 0, 1];
      const smoothing = 0.5;
      const result = smoothAmplitudes(current, previous, smoothing);
      expect(result).toEqual([0.5, 0.5, 0.5, 0.5]);
    });

    it('returns current when smoothing is 1', () => {
      const current = [1, 0, 1, 0];
      const previous = [0, 1, 0, 1];
      const smoothing = 1;
      const result = smoothAmplitudes(current, previous, smoothing);
      expect(result).toEqual(current);
    });

    it('returns previous when smoothing is 0', () => {
      const current = [1, 0, 1, 0];
      const previous = [0, 1, 0, 1];
      const smoothing = 0;
      const result = smoothAmplitudes(current, previous, smoothing);
      expect(result).toEqual(previous);
    });
  });

  describe('applyDecay', () => {
    it('decays falling bars', () => {
      const current = [0.2, 0.5, 0.3, 0.8];
      const previous = [0.8, 0.5, 0.9, 0.2];
      const decaySpeed = 0.5;
      const result = applyDecay(current, previous, decaySpeed);
      expect(result[0]).toBeCloseTo(0.5); // decayed from 0.8 toward 0.2
      expect(result[1]).toBe(0.5); // no decay, same value
      expect(result[2]).toBeCloseTo(0.6); // decayed from 0.9 toward 0.3
      expect(result[3]).toBe(0.8); // rising, no decay
    });

    it('allows instant rise when current > previous', () => {
      const current = [0.9, 0.7];
      const previous = [0.2, 0.3];
      const decaySpeed = 0.8;
      const result = applyDecay(current, previous, decaySpeed);
      expect(result).toEqual([0.9, 0.7]); // instant rise
    });
  });
});
