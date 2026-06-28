// lib/audio/signals.ts
import type { Signals } from '@/lib/types';

export function extractVolume(timeData: Uint8Array): number {
  let sumOfSquares = 0;
  for (let i = 0; i < timeData.length; i++) {
    const normalized = (timeData[i] - 128) / 128;
    sumOfSquares += normalized * normalized;
  }
  const rms = Math.sqrt(sumOfSquares / timeData.length);
  return Math.min(1, rms * 3);
}

export function extractBand(
  freqData: Uint8Array,
  sampleRate: number,
  lowHz: number,
  highHz: number
): number {
  if (lowHz >= highHz) return 0;
  // fftSize is 2 * freqData.length (only positive frequencies stored)
  const fftSize = freqData.length * 2;
  const binWidth = sampleRate / fftSize;
  const lowBin = Math.floor(lowHz / binWidth);
  const highBin = Math.min(Math.floor(highHz / binWidth), freqData.length - 1);
  if (lowBin > highBin) return 0;

  let sum = 0;
  let count = 0;
  for (let i = lowBin; i <= highBin; i++) {
    sum += freqData[i];
    count++;
  }
  if (count === 0) return 0;
  return sum / count / 255;
}

export function extractSignals(
  freqData: Uint8Array,
  timeData: Uint8Array,
  sampleRate: number
): Signals {
  return {
    volume: extractVolume(timeData),
    bass: extractBand(freqData, sampleRate, 20, 250),
    mid: extractBand(freqData, sampleRate, 250, 2000),
    treble: extractBand(freqData, sampleRate, 2000, 20000),
  };
}
