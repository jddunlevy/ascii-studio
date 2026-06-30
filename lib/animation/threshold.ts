import type { Binding, ThresholdTransform } from '@/lib/types';

export interface ThresholdState {
  isAbove: boolean;           // current state (above or below threshold)
  lastCrossTime: number;      // timestamp of last crossing
  strobeState?: boolean;      // for strobe action (unused, kept for future)
  pulseEndTime?: number;      // for pulse action (when to return)
}

// Global threshold state map (keyed by binding ID)
export const thresholdStates = new Map<string, ThresholdState>();

export function applyThresholdBinding(
  binding: Binding,
  signal: number,
  state: ThresholdState,
  now: number
): number | string {
  const transform = binding.thresholdTransform!;
  const threshold = transform.threshold;
  const returnThreshold = transform.returnThreshold ?? threshold;

  // Detect crossing with hysteresis
  const shouldBeAbove = state.isAbove
    ? signal >= returnThreshold   // Stay above until drop below returnThreshold
    : signal >= threshold;         // Go above when exceed threshold

  // State changed?
  if (shouldBeAbove !== state.isAbove) {
    state.isAbove = shouldBeAbove;
    state.lastCrossTime = now;

    // Initialize action-specific state
    if (transform.action === 'pulse' && shouldBeAbove) {
      state.pulseEndTime = now + (transform.pulseDuration ?? 200);
    }
  }

  // Apply action
  switch (transform.action) {
    case 'switch':
      return state.isAbove ? transform.aboveValue : transform.belowValue;

    case 'strobe':
      if (!state.isAbove) return transform.belowValue;
      // Strobe: alternate every strobeSpeed ms
      const strobeSpeed = transform.strobeSpeed ?? 100;
      const elapsedSinceCross = now - state.lastCrossTime;
      const flashIndex = Math.floor(elapsedSinceCross / strobeSpeed);
      return flashIndex % 2 === 0 ? transform.aboveValue : transform.belowValue;

    case 'pulse':
      // Pulse: hold aboveValue for pulseDuration, then return to below
      if (state.pulseEndTime && now < state.pulseEndTime) {
        return transform.aboveValue;
      }
      return transform.belowValue;

    default:
      return transform.belowValue;
  }
}
