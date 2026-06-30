import type {
  Signals,
  SignalName,
  GlobalAudioConfig,
  ElementSensitivity,
  BindingCalibration,
  Binding,
} from '@/lib/types';

export function getCalibratedSignal(
  rawSignal: number,
  signalName: SignalName,
  elementId: string,
  binding: Binding,
  globalConfig: GlobalAudioConfig,
  elementSensitivities: Record<string, ElementSensitivity>,
  smoothedSignals: Partial<Signals>
): number {
  let signal = rawSignal;

  // Step 1: Apply global sensitivity
  const sensitivityKey = `${signalName}Sensitivity` as keyof GlobalAudioConfig;
  signal *= globalConfig[sensitivityKey] as number;

  // Step 2: Apply noise floor filter
  if (signal < globalConfig.noiseFloor) {
    signal = 0;
  }

  // Step 3: Apply signal smoothing (low-pass filter)
  const smoothed = smoothedSignals[signalName] ?? signal;
  signal = smoothed * (1 - globalConfig.signalSmoothing) + signal * globalConfig.signalSmoothing;

  // Update smoothed value for next frame
  smoothedSignals[signalName] = signal;

  // Step 4: Apply element sensitivity
  const elemSens = elementSensitivities[elementId];
  if (elemSens?.enabled) {
    signal *= elemSens.multiplier;
  }

  // Step 5: Apply binding calibration
  if (binding.calibration) {
    signal += binding.calibration.signalOffset;
    signal *= binding.calibration.signalMultiplier;
    signal = Math.max(
      binding.calibration.clampMin,
      Math.min(binding.calibration.clampMax, signal)
    );
  }

  // Final clamp to 0-1
  return Math.max(0, Math.min(1, signal));
}
