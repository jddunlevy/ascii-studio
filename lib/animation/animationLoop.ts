import type { Binding, Signals, Transform, VisualProperty, LiveValues } from '@/lib/types';
import { getCalibratedSignal } from './calibration';
import { applyThresholdBinding, thresholdStates, ThresholdState } from './threshold';
import type { GlobalAudioConfig, ElementSensitivity } from '@/lib/types';

// Global smoothed signals state (persists across frames)
const smoothedSignals: Partial<Signals> = {};

export function applyTransform(signal: number, transform: Transform): number {
  const effective = transform.invert ? 1 - signal : signal;
  return transform.min + effective * (transform.max - transform.min);
}

export function applyBinding(
  binding: Binding,
  signals: Signals,
  globalConfig: GlobalAudioConfig,
  elementSensitivities: Record<string, ElementSensitivity>,
  now: number
): { property: VisualProperty; value: number | string } {
  const rawSignal = signals[binding.signal];

  // Apply calibration pipeline
  const calibratedSignal = getCalibratedSignal(
    rawSignal,
    binding.signal,
    binding.elementId,
    binding,
    globalConfig,
    elementSensitivities,
    smoothedSignals
  );

  // Handle content property with frames (existing logic)
  if (binding.property === 'content') {
    const frames = binding.frames ?? [];
    if (frames.length === 0) return { property: 'content', value: '' };

    // Use continuousTransform if in continuous mode, else default
    const transform = binding.mode === 'continuous' && binding.continuousTransform
      ? binding.continuousTransform
      : binding.transform ?? { min: 0, max: 1, invert: false };

    const effective = transform.invert ? 1 - calibratedSignal : calibratedSignal;
    const index = Math.floor(effective * (frames.length - 1));
    return { property: 'content', value: frames[index] };
  }

  // Continuous mode
  if (binding.mode === 'continuous' || !binding.mode) {
    const transform = binding.continuousTransform ?? binding.transform ?? { min: 0, max: 1, invert: false };
    return {
      property: binding.property,
      value: applyTransform(calibratedSignal, transform),
    };
  }

  // Threshold mode
  if (binding.mode === 'threshold') {
    // Get or create threshold state
    let state = thresholdStates.get(binding.id);
    if (!state) {
      state = {
        isAbove: false,
        lastCrossTime: 0,
      };
      thresholdStates.set(binding.id, state);
    }

    const value = applyThresholdBinding(binding, calibratedSignal, state, now);
    return { property: binding.property, value };
  }

  // Fallback
  return {
    property: binding.property,
    value: applyTransform(calibratedSignal, binding.transform ?? { min: 0, max: 1, invert: false }),
  };
}

export function computeLiveValues(
  bindings: Binding[],
  signals: Signals,
  globalConfig: GlobalAudioConfig,
  elementSensitivities: Record<string, ElementSensitivity>
): LiveValues {
  const result: LiveValues = {};
  const now = Date.now();

  for (const binding of bindings) {
    const { property, value } = applyBinding(
      binding,
      signals,
      globalConfig,
      elementSensitivities,
      now
    );

    if (!result[binding.elementId]) {
      result[binding.elementId] = {};
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (result[binding.elementId] as any)[property] = value;
  }
  return result;
}

export function startAnimationLoop(
  getSignals: () => Signals,
  getBindings: () => Binding[],
  getGlobalConfig: () => GlobalAudioConfig,
  getElementSensitivities: () => Record<string, ElementSensitivity>,
  onFrame: (liveValues: LiveValues) => void
): () => void {
  let rafId: number;
  let running = true;

  function tick() {
    if (!running) return;
    const signals = getSignals();
    const bindings = getBindings();
    const globalConfig = getGlobalConfig();
    const elementSensitivities = getElementSensitivities();
    const liveValues = computeLiveValues(bindings, signals, globalConfig, elementSensitivities);
    onFrame(liveValues);
    rafId = requestAnimationFrame(tick);
  }

  rafId = requestAnimationFrame(tick);

  return () => {
    running = false;
    cancelAnimationFrame(rafId);
  };
}
