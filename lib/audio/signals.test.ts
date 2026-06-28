// lib/audio/signals.test.ts
import { describe, it, expect } from 'vitest';
import { extractVolume, extractBand, extractSignals } from './signals';

describe('extractVolume', () => {
  it('returns 0 for silence (all-128 time data)', () => {
    const timeData = new Uint8Array(1024).fill(128);
    expect(extractVolume(timeData)).toBe(0);
  });

  it('returns > 0 for a signal with values above and below 128', () => {
    const timeData = new Uint8Array(1024);
    for (let i = 0; i < timeData.length; i++) {
      timeData[i] = i % 2 === 0 ? 200 : 50;
    }
    expect(extractVolume(timeData)).toBeGreaterThan(0);
  });
});

describe('extractBand', () => {
  it('returns 0 when lowHz > highHz (no bins in range)', () => {
    const freqData = new Uint8Array(1024).fill(255);
    // sampleRate=44100, fftSize=2048 => binWidth=21.5Hz
    // lowHz=500 > highHz=100 => no bins, returns 0
    expect(extractBand(freqData, 44100, 500, 100)).toBe(0);
  });

  it('returns correct average for mock freqData with only bass bins non-zero', () => {
    const sampleRate = 44100;
    const fftSize = 2048;
    const freqData = new Uint8Array(fftSize / 2).fill(0);
    // Bass range 20-250Hz. binWidth = sampleRate/fftSize = 21.533...
    // bin index for 20Hz = floor(20/21.533) = 0
    // bin index for 250Hz = floor(250/21.533) = 11
    // Set bins 0-11 to 128
    for (let i = 0; i <= 11; i++) freqData[i] = 128;

    const bass = extractBand(freqData, sampleRate, 20, 250);
    // Expected: average of bins 0-11 = 128/255 ≈ 0.502
    expect(bass).toBeGreaterThan(0.4);
    expect(bass).toBeLessThan(0.6);

    const treble = extractBand(freqData, sampleRate, 2000, 20000);
    expect(treble).toBe(0);
  });
});

describe('extractSignals', () => {
  it('returns object with all four signal keys, all in 0-1 range', () => {
    const freqData = new Uint8Array(1024).fill(100);
    const timeData = new Uint8Array(1024).fill(150);
    const signals = extractSignals(freqData, timeData, 44100);
    expect(signals).toHaveProperty('volume');
    expect(signals).toHaveProperty('bass');
    expect(signals).toHaveProperty('mid');
    expect(signals).toHaveProperty('treble');
    for (const val of Object.values(signals)) {
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(1);
    }
  });
});
