import type { Binding, Signals, Transform, VisualProperty, LiveValues } from '@/lib/types';

export function applyTransform(signal: number, transform: Transform): number {
  const effective = transform.invert ? 1 - signal : signal;
  return transform.min + effective * (transform.max - transform.min);
}

export function applyBinding(
  binding: Binding,
  signals: Signals
): { property: VisualProperty; value: number | string } {
  const signal = signals[binding.signal];

  if (binding.property === 'content') {
    const frames = binding.frames ?? [];
    if (frames.length === 0) return { property: 'content', value: '' };
    const effective = binding.transform.invert ? 1 - signal : signal;
    const index = Math.floor(effective * (frames.length - 1));
    return { property: 'content', value: frames[index] };
  }

  return {
    property: binding.property,
    value: applyTransform(signal, binding.transform),
  };
}

export function computeLiveValues(
  bindings: Binding[],
  signals: Signals
): LiveValues {
  const result: LiveValues = {};
  for (const binding of bindings) {
    const { property, value } = applyBinding(binding, signals);
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
  onFrame: (liveValues: LiveValues) => void
): () => void {
  let rafId: number;
  let running = true;

  function tick() {
    if (!running) return;
    const signals = getSignals();
    const bindings = getBindings();
    const liveValues = computeLiveValues(bindings, signals);
    onFrame(liveValues);
    rafId = requestAnimationFrame(tick);
  }

  rafId = requestAnimationFrame(tick);

  return () => {
    running = false;
    cancelAnimationFrame(rafId);
  };
}
