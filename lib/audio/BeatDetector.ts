/**
 * Detects beats (threshold crossings) in audio signals
 * Prevents multiple triggers on the same beat by enforcing minimum interval
 */
export class BeatDetector {
  private lastBeatTime = 0;
  private wasAboveThreshold = false;

  /**
   * Detects if current signal represents a beat
   * @param signal - Current signal value 0-1
   * @param threshold - Threshold to cross for beat detection 0-1
   * @param minInterval - Minimum ms between beats to prevent double-triggers
   * @returns true if beat detected, false otherwise
   */
  detectBeat(signal: number, threshold: number, minInterval: number): boolean {
    const now = Date.now();
    const timeSinceLastBeat = now - this.lastBeatTime;

    // Check if signal crosses threshold (rising edge)
    const crossedThreshold = signal >= threshold && !this.wasAboveThreshold;

    // Update state
    this.wasAboveThreshold = signal >= threshold;

    // Detect beat: crossed threshold AND enough time has passed
    if (crossedThreshold && timeSinceLastBeat >= minInterval) {
      this.lastBeatTime = now;
      return true;
    }

    return false;
  }

  /**
   * Resets the detector state
   */
  reset(): void {
    this.lastBeatTime = 0;
    this.wasAboveThreshold = false;
  }
}
