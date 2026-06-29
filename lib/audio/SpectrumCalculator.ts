/**
 * Calculates bar amplitudes from frequency data
 * @param freqData - Uint8Array from analyser.getByteFrequencyData()
 * @param barCount - Number of bars to generate
 * @param freqRanges - Array of frequency boundaries in Hz (length = barCount + 1)
 * @param sampleRate - Audio context sample rate (typically 44100 or 48000)
 * @returns Array of amplitudes 0-1 for each bar
 */
export function calculateBarAmplitudes(
  freqData: Uint8Array,
  barCount: number,
  freqRanges: number[],
  sampleRate: number
): number[] {
  if (freqData.length === 0) {
    return new Array(barCount).fill(0);
  }

  const nyquist = sampleRate / 2;
  const binCount = freqData.length;
  const amplitudes: number[] = [];

  for (let i = 0; i < barCount; i++) {
    const freqStart = freqRanges[i];
    const freqEnd = freqRanges[i + 1];

    // Convert Hz to bin indices
    const binStart = Math.floor((freqStart / nyquist) * binCount);
    const binEnd = Math.floor((freqEnd / nyquist) * binCount);

    // Average amplitude across this frequency range
    let sum = 0;
    let count = 0;
    for (let j = binStart; j < binEnd && j < binCount; j++) {
      sum += freqData[j];
      count++;
    }

    const avgAmplitude = count > 0 ? sum / count : 0;
    amplitudes.push(avgAmplitude / 255); // Normalize to 0-1
  }

  return amplitudes;
}

/**
 * Smooths amplitudes by interpolating with previous values
 * @param current - Current frame amplitudes
 * @param previous - Previous frame amplitudes
 * @param smoothing - Interpolation factor 0-1 (0 = all previous, 1 = all current)
 * @returns Smoothed amplitudes
 */
export function smoothAmplitudes(
  current: number[],
  previous: number[],
  smoothing: number
): number[] {
  return current.map((val, i) => {
    const prev = previous[i] ?? 0;
    return prev * (1 - smoothing) + val * smoothing;
  });
}

/**
 * Applies decay to falling bars
 * @param current - Current frame amplitudes
 * @param previous - Previous frame amplitudes
 * @param decaySpeed - How fast bars fall 0-1 (0 = instant, 1 = slow)
 * @returns Decayed amplitudes
 */
export function applyDecay(
  current: number[],
  previous: number[],
  decaySpeed: number
): number[] {
  return current.map((val, i) => {
    const prev = previous[i] ?? 0;
    if (val >= prev) {
      return val; // Rising, no decay
    }
    // Falling, apply decay
    return prev - (prev - val) * decaySpeed;
  });
}
