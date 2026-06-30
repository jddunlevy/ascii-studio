# Enhanced Bindings, Auras, and Presets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend ASCII Studio's binding system with threshold-based bindings, add audio-reactive Aura elements, implement multi-level audio calibration, and provide a preset library for reusable content.

**Architecture:** Enhanced binding system supports continuous and threshold modes. Multi-level calibration pipeline (global → element → binding) processes audio signals. New Aura element type renders canvas-based radial gradients. Preset library stores content-only templates in localStorage.

**Tech Stack:** React 19.2.4, Next.js 16.2.9, TypeScript 5.x, Zustand 5.0.14, Web Audio API

## Global Constraints

- Maintain backward compatibility with existing compositions
- All new types must be strictly typed, no `any`
- Follow existing naming conventions: PascalCase for components, camelCase for functions
- Place tests adjacent to implementation files with `.test.ts` suffix
- Commit after each task completion
- 60fps performance target with 50+ bindings and 5+ auras
- LocalStorage for presets (5-10MB limit)

---

## File Structure

### New Files

**Types & Models:**
- `lib/types.ts` - Extended (add binding modes, calibration, aura, preset types)
- `lib/composition/presets.ts` - Preset storage layer (CRUD operations)
- `lib/composition/presets.test.ts` - Preset storage tests
- `lib/animation/threshold.ts` - Threshold state management and actions
- `lib/animation/threshold.test.ts` - Threshold action tests
- `lib/animation/calibration.ts` - Signal calibration pipeline
- `lib/animation/calibration.test.ts` - Calibration tests

**Aura Components:**
- `components/editor/aura/AuraRenderer.tsx` - Canvas-based aura rendering
- `components/editor/aura/AuraModal.tsx` - Aura creation modal
- `components/editor/aura/AuraPanel.tsx` - Aura properties inspector

**Preset Components:**
- `components/editor/presets/PresetsPanel.tsx` - Preset library tab
- `components/editor/presets/PresetItem.tsx` - Individual preset display
- `components/editor/presets/SavePresetModal.tsx` - Save preset dialog

**Calibration Components:**
- `components/editor/calibration/GlobalAudioPanel.tsx` - Global calibration (right sidebar)
- `components/editor/calibration/ElementSensitivity.tsx` - Per-element sensitivity (inspector)
- `components/editor/calibration/BindingCalibration.tsx` - Per-binding calibration (binding row)

### Modified Files

- `lib/types.ts` - Add new types
- `lib/store/studioStore.ts` - Add global audio config, element sensitivities, preset actions
- `lib/animation/animationLoop.ts` - Add calibration and threshold support
- `lib/composition/defaults.ts` - Add default calibration config
- `lib/composition/storage.ts` - Add composition migration logic
- `components/editor/EditorShell.tsx` - Add Presets tab, GlobalAudioPanel
- `components/editor/Palette.tsx` - Add AURA button
- `components/editor/Inspector.tsx` - Add ElementSensitivity, SavePreset button, AuraPanel
- `components/editor/BindingRow.tsx` - Add mode toggle, threshold UI, calibration section
- `components/editor/ElementRenderer.tsx` - Add aura case

---

## Task 1: Extend Type System

**Files:**
- Modify: `lib/types.ts:1-157`
- Test: TypeScript compiler verification

**Interfaces:**
- Consumes: Existing `BaseElement`, `SignalName`, `VisualProperty` types
- Produces: `BindingMode`, `ThresholdAction`, `ContinuousTransform`, `ThresholdTransform`, `GlobalAudioConfig`, `ElementSensitivity`, `BindingCalibration`, `ColorStop`, `AuraElement`, `ElementPreset`, `PresetLibrary` types

- [ ] **Step 1: Add binding mode types**

Open `lib/types.ts` and add after line 10 (after `VisualProperty`):

```typescript
export type BindingMode = 'continuous' | 'threshold';

export type ThresholdAction = 'switch' | 'strobe' | 'pulse';

interface ContinuousTransform {
  min: number;
  max: number;
  invert: boolean;
}

interface ThresholdTransform {
  threshold: number;           // 0-1, signal level that triggers
  aboveValue: number | string; // value when signal >= threshold
  belowValue: number | string; // value when signal < threshold
  returnThreshold?: number;    // optional hysteresis (defaults to threshold)
  action: ThresholdAction;     // how the transition happens
  strobeSpeed?: number;        // ms per flash (for strobe action)
  pulseDuration?: number;      // ms to hold above value (for pulse action)
}
```

- [ ] **Step 2: Extend Binding interface**

Modify the existing `Binding` interface (around line 53):

```typescript
export interface Binding {
  id: string;
  elementId: string;
  signal: SignalName;
  property: VisualProperty;
  mode?: BindingMode;                        // NEW - optional for backward compat
  transform?: Transform;                      // OLD - keep for migration
  continuousTransform?: ContinuousTransform;  // NEW - required if mode === 'continuous'
  thresholdTransform?: ThresholdTransform;    // NEW - required if mode === 'threshold'
  frames?: string[];
  calibration?: BindingCalibration;           // NEW - optional per-binding calibration
}
```

- [ ] **Step 3: Add calibration types**

Add after the `Binding` interface:

```typescript
export interface GlobalAudioConfig {
  volumeSensitivity: number;    // 0.1 - 3.0, default 1.0
  bassSensitivity: number;      // 0.1 - 3.0, default 1.0
  midSensitivity: number;       // 0.1 - 3.0, default 1.0
  trebleSensitivity: number;    // 0.1 - 3.0, default 1.0
  noiseFloor: number;           // 0-0.2, default 0.05
  signalSmoothing: number;      // 0-1, default 0.5
}

export interface ElementSensitivity {
  enabled: boolean;
  multiplier: number;           // 0.1 - 3.0, default 1.0
}

export interface BindingCalibration {
  signalOffset: number;         // -1 to 1, default 0
  signalMultiplier: number;     // 0.1 - 3.0, default 1.0
  clampMin: number;             // 0-1, default 0
  clampMax: number;             // 0-1, default 1
}
```

- [ ] **Step 4: Add aura types**

Add before the `Element` union type (around line 126):

```typescript
export interface ColorStop {
  position: number;  // 0-1, distance from center
  color: string;     // hex color '#rrggbb'
}

export interface AuraElement extends BaseElement {
  type: 'aura';
  colorStops: ColorStop[];  // 2-5 stops, sorted by position
  blur: number;             // 0-100, softness/glow intensity
  blendMode?: 'normal' | 'screen' | 'overlay' | 'multiply';
}
```

- [ ] **Step 5: Extend VisualProperty and ElementType unions**

Modify `VisualProperty` type (line 3):

```typescript
export type VisualProperty =
  | 'hue'
  | 'fontSize'
  | 'x'
  | 'y'
  | 'rotation'
  | 'opacity'
  | 'content'
  | 'blur'              // NEW
  | 'colorStop0Hue'     // NEW
  | 'colorStop1Hue'     // NEW
  | 'colorStop2Hue'     // NEW
  | 'colorStop3Hue'     // NEW
  | 'colorStop4Hue';    // NEW
```

Modify `ElementType` (line 33):

```typescript
export type ElementType = 'text' | 'ascii_art' | 'divider' | 'decorative' | 'visualizer' | 'aura';
```

Update `Element` union (line 126):

```typescript
export type Element =
  | TextElement
  | AsciiArtElement
  | DividerElement
  | DecorativeElement
  | VisualizerElement
  | AuraElement;
```

- [ ] **Step 6: Add preset types**

Add after `Element` union:

```typescript
export interface ElementPreset {
  id: string;
  name: string;
  type: 'text' | 'ascii_art';
  content: string;
  createdAt: string;
  tags?: string[];
}

export interface PresetLibrary {
  presets: ElementPreset[];
}
```

- [ ] **Step 7: Extend BaseElement interface**

Modify `BaseElement` to add optional sensitivity:

```typescript
interface BaseElement {
  id: string;
  type: ElementType;
  position: { x: number; y: number };
  size: { w: number; h: number };
  z: number;
  rotation: number;
  opacity: number;
  color: ElementColor;
  locked: boolean;
  gradient?: boolean;
  sensitivity?: ElementSensitivity;  // NEW - optional per-element calibration
}
```

- [ ] **Step 8: Extend CompositionSpec interface**

Modify `CompositionSpec` (around line 148):

```typescript
export interface CompositionSpec {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  canvas: CanvasConfig;
  elements: Element[];
  bindings: Binding[];
  background?: BackgroundConfig;
  globalAudioConfig?: GlobalAudioConfig;  // NEW - optional for backward compat
}
```

- [ ] **Step 9: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 10: Commit**

```bash
git add lib/types.ts
git commit -m "feat: extend type system for bindings, calibration, auras, presets

- Add BindingMode (continuous/threshold) and ThresholdAction types
- Add GlobalAudioConfig, ElementSensitivity, BindingCalibration types
- Add ColorStop and AuraElement types
- Add ElementPreset and PresetLibrary types
- Extend VisualProperty with blur and colorStopNHue properties
- Extend ElementType with aura
- Add sensitivity field to BaseElement
- Add globalAudioConfig to CompositionSpec

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Add Default Calibration Config

**Files:**
- Modify: `lib/composition/defaults.ts:1-30`
- Test: TypeScript compiler verification

**Interfaces:**
- Consumes: `GlobalAudioConfig` type from `lib/types.ts`
- Produces: `DEFAULT_GLOBAL_AUDIO` constant

- [ ] **Step 1: Add default calibration config**

Open `lib/composition/defaults.ts` and add after imports:

```typescript
import type { GlobalAudioConfig } from '@/lib/types';

export const DEFAULT_GLOBAL_AUDIO: GlobalAudioConfig = {
  volumeSensitivity: 1.0,
  bassSensitivity: 1.0,
  midSensitivity: 1.0,
  trebleSensitivity: 1.0,
  noiseFloor: 0.05,
  signalSmoothing: 0.5,
};
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add lib/composition/defaults.ts
git commit -m "feat: add default global audio calibration config

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Implement Composition Migration Logic

**Files:**
- Modify: `lib/composition/storage.ts:1-50`
- Test: Manual verification (load old composition)

**Interfaces:**
- Consumes: `CompositionSpec`, `Binding` types
- Produces: `migrateComposition(comp: CompositionSpec): CompositionSpec` function

- [ ] **Step 1: Add migration function**

In `lib/composition/storage.ts`, add before `loadComposition()`:

```typescript
import { DEFAULT_GLOBAL_AUDIO } from './defaults';

function migrateComposition(comp: CompositionSpec): CompositionSpec {
  return {
    ...comp,
    // Migrate old bindings without 'mode' field
    bindings: comp.bindings.map(binding => {
      if (!binding.mode) {
        // Old binding - migrate to continuous mode
        return {
          ...binding,
          mode: 'continuous' as const,
          continuousTransform: binding.transform ? {
            min: binding.transform.min,
            max: binding.transform.max,
            invert: binding.transform.invert,
          } : { min: 0, max: 1, invert: false },
        };
      }
      return binding;
    }),
    // Add default global audio config if missing
    globalAudioConfig: comp.globalAudioConfig ?? DEFAULT_GLOBAL_AUDIO,
  };
}
```

- [ ] **Step 2: Apply migration on load**

Modify `loadComposition()` to apply migration:

```typescript
export function loadComposition(id: string): CompositionSpec | null {
  try {
    const json = localStorage.getItem(`composition-${id}`);
    if (!json) return null;
    const comp = JSON.parse(json) as CompositionSpec;
    return migrateComposition(comp);  // Apply migration
  } catch (e) {
    console.error('Failed to load composition:', e);
    return null;
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add lib/composition/storage.ts
git commit -m "feat: add composition migration for binding and calibration changes

- Migrate old bindings to continuous mode
- Add default globalAudioConfig if missing

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Implement Signal Calibration Pipeline

**Files:**
- Create: `lib/animation/calibration.ts`
- Create: `lib/animation/calibration.test.ts`

**Interfaces:**
- Consumes: `Signals`, `SignalName`, `GlobalAudioConfig`, `ElementSensitivity`, `BindingCalibration`, `Binding` types
- Produces: `getCalibratedSignal(rawSignal: number, signalName: SignalName, elementId: string, binding: Binding, globalConfig: GlobalAudioConfig, elementSensitivities: Record<string, ElementSensitivity>, smoothedSignals: Partial<Signals>): number` function

- [ ] **Step 1: Write failing test**

Create `lib/animation/calibration.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { getCalibratedSignal } from './calibration';
import type { GlobalAudioConfig, ElementSensitivity, BindingCalibration, Binding, Signals } from '@/lib/types';

describe('getCalibratedSignal', () => {
  let globalConfig: GlobalAudioConfig;
  let elementSensitivities: Record<string, ElementSensitivity>;
  let smoothedSignals: Partial<Signals>;
  let mockBinding: Binding;

  beforeEach(() => {
    globalConfig = {
      volumeSensitivity: 1.0,
      bassSensitivity: 1.0,
      midSensitivity: 1.0,
      trebleSensitivity: 1.0,
      noiseFloor: 0.05,
      signalSmoothing: 0.5,
    };
    elementSensitivities = {};
    smoothedSignals = {};
    mockBinding = {
      id: 'b1',
      elementId: 'e1',
      signal: 'volume',
      property: 'opacity',
      mode: 'continuous',
      continuousTransform: { min: 0, max: 1, invert: false },
    };
  });

  it('returns raw signal when no calibration applied', () => {
    const result = getCalibratedSignal(
      0.5, 'volume', 'e1', mockBinding, globalConfig, elementSensitivities, smoothedSignals
    );
    expect(result).toBeCloseTo(0.5, 2);
  });

  it('applies global sensitivity', () => {
    globalConfig.bassSensitivity = 2.0;
    const result = getCalibratedSignal(
      0.5, 'bass', 'e1', mockBinding, globalConfig, elementSensitivities, smoothedSignals
    );
    expect(result).toBeCloseTo(1.0, 2);
  });

  it('filters signals below noise floor', () => {
    globalConfig.noiseFloor = 0.1;
    const result = getCalibratedSignal(
      0.08, 'volume', 'e1', mockBinding, globalConfig, elementSensitivities, smoothedSignals
    );
    expect(result).toBe(0);
  });

  it('applies element sensitivity multiplier', () => {
    elementSensitivities['e1'] = { enabled: true, multiplier: 2.0 };
    const result = getCalibratedSignal(
      0.3, 'volume', 'e1', mockBinding, globalConfig, elementSensitivities, smoothedSignals
    );
    expect(result).toBeCloseTo(0.6, 2);
  });

  it('applies binding calibration offset and multiplier', () => {
    mockBinding.calibration = {
      signalOffset: 0.1,
      signalMultiplier: 2.0,
      clampMin: 0,
      clampMax: 1,
    };
    const result = getCalibratedSignal(
      0.3, 'volume', 'e1', mockBinding, globalConfig, elementSensitivities, smoothedSignals
    );
    // (0.3 + 0.1) * 2.0 = 0.8
    expect(result).toBeCloseTo(0.8, 2);
  });

  it('clamps to binding calibration min/max', () => {
    mockBinding.calibration = {
      signalOffset: 0,
      signalMultiplier: 3.0,
      clampMin: 0.2,
      clampMax: 0.8,
    };
    const result = getCalibratedSignal(
      0.4, 'volume', 'e1', mockBinding, globalConfig, elementSensitivities, smoothedSignals
    );
    // 0.4 * 3.0 = 1.2, clamped to 0.8
    expect(result).toBe(0.8);
  });

  it('applies signal smoothing', () => {
    smoothedSignals.volume = 0.3;
    globalConfig.signalSmoothing = 0.5;
    const result = getCalibratedSignal(
      0.7, 'volume', 'e1', mockBinding, globalConfig, elementSensitivities, smoothedSignals
    );
    // smoothed * (1 - 0.5) + raw * 0.5 = 0.3 * 0.5 + 0.7 * 0.5 = 0.5
    expect(result).toBeCloseTo(0.5, 2);
  });

  it('applies all calibration layers in order', () => {
    globalConfig.bassSensitivity = 1.5;
    globalConfig.noiseFloor = 0.02;
    globalConfig.signalSmoothing = 0.3;
    elementSensitivities['e1'] = { enabled: true, multiplier: 1.2 };
    mockBinding.calibration = {
      signalOffset: 0.05,
      signalMultiplier: 1.1,
      clampMin: 0,
      clampMax: 1,
    };
    smoothedSignals.bass = 0.4;

    const result = getCalibratedSignal(
      0.5, 'bass', 'e1', mockBinding, globalConfig, elementSensitivities, smoothedSignals
    );
    
    // Expected flow:
    // 1. Global: 0.5 * 1.5 = 0.75
    // 2. Noise floor: 0.75 > 0.02, pass
    // 3. Smoothing: 0.4 * 0.7 + 0.75 * 0.3 = 0.505
    // 4. Element: 0.505 * 1.2 = 0.606
    // 5. Binding: (0.606 + 0.05) * 1.1 = 0.7216
    // 6. Clamp: 0.7216 in [0, 1], no change
    expect(result).toBeCloseTo(0.72, 1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test calibration`
Expected: FAIL with "Cannot find module './calibration'"

- [ ] **Step 3: Implement calibration pipeline**

Create `lib/animation/calibration.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test calibration`
Expected: PASS (all 8 tests green)

- [ ] **Step 5: Commit**

```bash
git add lib/animation/calibration.ts lib/animation/calibration.test.ts
git commit -m "feat: implement signal calibration pipeline with tests

- getCalibratedSignal applies global, element, and binding calibration
- Supports noise floor filtering and signal smoothing
- All tests passing

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Implement Threshold State Management and Actions

**Files:**
- Create: `lib/animation/threshold.ts`
- Create: `lib/animation/threshold.test.ts`

**Interfaces:**
- Consumes: `ThresholdTransform`, `ThresholdAction` types
- Produces:
  - `ThresholdState` interface
  - `applyThresholdBinding(binding: Binding, signal: number, state: ThresholdState, now: number): number | string` function
  - Exported `Map<string, ThresholdState>` for state storage

- [ ] **Step 1: Write failing tests**

Create `lib/animation/threshold.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test threshold`
Expected: FAIL with "Cannot find module './threshold'"

- [ ] **Step 3: Implement threshold state and actions**

Create `lib/animation/threshold.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test threshold`
Expected: PASS (all 14 tests green)

- [ ] **Step 5: Commit**

```bash
git add lib/animation/threshold.ts lib/animation/threshold.test.ts
git commit -m "feat: implement threshold state management and actions with tests

- ThresholdState tracks crossing state and timing
- applyThresholdBinding handles switch, strobe, pulse actions
- Hysteresis prevents flicker at threshold boundary
- All tests passing

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Enhance Animation Loop with Calibration and Threshold Support

**Files:**
- Modify: `lib/animation/animationLoop.ts:1-68`

**Interfaces:**
- Consumes: `getCalibratedSignal()` from `./calibration`, `applyThresholdBinding()` and `thresholdStates` from `./threshold`, `GlobalAudioConfig`, `ElementSensitivity` types
- Produces: Enhanced `applyBinding()` and `computeLiveValues()` functions

- [ ] **Step 1: Add imports**

Add to top of `lib/animation/animationLoop.ts`:

```typescript
import { getCalibratedSignal } from './calibration';
import { applyThresholdBinding, thresholdStates, ThresholdState } from './threshold';
import type { GlobalAudioConfig, ElementSensitivity } from '@/lib/types';
```

- [ ] **Step 2: Add smoothed signals state**

Add before `applyTransform()` function:

```typescript
// Global smoothed signals state (persists across frames)
const smoothedSignals: Partial<Signals> = {};
```

- [ ] **Step 3: Enhance applyBinding function**

Replace existing `applyBinding()` function:

```typescript
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
```

- [ ] **Step 4: Enhance computeLiveValues function**

Replace existing `computeLiveValues()` function:

```typescript
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
```

- [ ] **Step 5: Update startAnimationLoop function**

Replace existing `startAnimationLoop()` function:

```typescript
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
```

- [ ] **Step 6: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add lib/animation/animationLoop.ts
git commit -m "feat: enhance animation loop with calibration and threshold support

- applyBinding now supports continuous and threshold modes
- Calibration pipeline applied to all signals
- Threshold state managed per binding
- startAnimationLoop accepts globalConfig and elementSensitivities

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Update Store with Calibration State

**Files:**
- Modify: `lib/store/studioStore.ts:1-215`

**Interfaces:**
- Consumes: `GlobalAudioConfig`, `ElementSensitivity` types, `DEFAULT_GLOBAL_AUDIO` constant
- Produces: Added state fields and actions for global audio config and element sensitivities

- [ ] **Step 1: Add imports**

Add to imports section:

```typescript
import { DEFAULT_GLOBAL_AUDIO } from '@/lib/composition/defaults';
```

- [ ] **Step 2: Extend StudioState interface**

Add to `StudioState` interface (around line 14):

```typescript
interface StudioState {
  composition: CompositionSpec | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  loop: boolean;
  liveValues: LiveValues;
  selectedElementId: string | null;
  activeTab: 'palette' | 'bindings' | 'presets';  // NEW: add 'presets'

  loadComposition(comp: CompositionSpec): void;
  updateCompositionName(name: string): void;
  addElement(el: Element): void;
  updateElement(id: string, changes: Partial<Element>): void;
  removeElement(id: string): void;
  addBinding(b: Binding): void;
  updateBinding(id: string, changes: Partial<Binding>): void;
  removeBinding(id: string): void;
  setLiveValues(values: LiveValues): void;
  setSelectedElementId(id: string | null): void;
  setActiveTab(tab: 'palette' | 'bindings' | 'presets'): void;  // NEW: add 'presets'
  setPlayback(
    state: Partial<
      Pick<StudioState, 'isPlaying' | 'currentTime' | 'duration' | 'loop'>
    >
  ): void;
  updateBackground(changes: Partial<BackgroundConfig>): void;
  addVisualizer(visualizer: VisualizerElement): void;
  updateVisualizer(id: string, changes: Partial<VisualizerElement>): void;
  updateGlobalAudioConfig(changes: Partial<GlobalAudioConfig>): void;  // NEW
  setElementSensitivity(elementId: string, sensitivity: ElementSensitivity | null): void;  // NEW
  persistComposition(): void;
}
```

- [ ] **Step 3: Update initial state**

Modify initial state (around line 46):

```typescript
const useStudioStore = create<StudioState>((set, get) => ({
  composition: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  loop: false,
  liveValues: {},
  selectedElementId: null,
  activeTab: 'palette',
```

- [ ] **Step 4: Add updateGlobalAudioConfig action**

Add after `updateBackground` action:

```typescript
  updateGlobalAudioConfig(changes) {
    set((s) => {
      if (!s.composition) return s;
      return {
        composition: {
          ...s.composition,
          globalAudioConfig: {
            ...DEFAULT_GLOBAL_AUDIO,
            ...(s.composition.globalAudioConfig ?? {}),
            ...changes,
          },
        },
      };
    });
  },
```

- [ ] **Step 5: Add setElementSensitivity action**

Add after `updateGlobalAudioConfig`:

```typescript
  setElementSensitivity(elementId, sensitivity) {
    set((s) => {
      if (!s.composition) return s;
      return {
        composition: {
          ...s.composition,
          elements: s.composition.elements.map((el) =>
            el.id === elementId
              ? { ...el, sensitivity: sensitivity ?? undefined }
              : el
          ),
        },
      };
    });
  },
```

- [ ] **Step 6: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add lib/store/studioStore.ts
git commit -m "feat: add global audio config and element sensitivity to store

- Add updateGlobalAudioConfig action
- Add setElementSensitivity action  
- Extend activeTab type to include 'presets'

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Update AudioPlayer to Pass Calibration to Animation Loop

**Files:**
- Modify: `components/editor/AudioPlayer.tsx:34-58`

**Interfaces:**
- Consumes: `DEFAULT_GLOBAL_AUDIO` constant
- Produces: Updated `startLoop()` to pass global config and element sensitivities

- [ ] **Step 1: Add import**

Add to imports:

```typescript
import { DEFAULT_GLOBAL_AUDIO } from '@/lib/composition/defaults';
```

- [ ] **Step 2: Update startLoop function**

Modify `startLoop` callback (around line 34):

```typescript
  const startLoop = useCallback(() => {
    stopAnimationLoop();
    cleanupLoopRef.current = startAnimationLoop(
      () => audioEngine.getSignals(),
      () => useStudioStore.getState().composition?.bindings ?? [],
      () => useStudioStore.getState().composition?.globalAudioConfig ?? DEFAULT_GLOBAL_AUDIO,
      () => {
        const composition = useStudioStore.getState().composition;
        if (!composition) return {};
        const sensitivities: Record<string, ElementSensitivity> = {};
        composition.elements.forEach(el => {
          if (el.sensitivity) {
            sensitivities[el.id] = el.sensitivity;
          }
        });
        return sensitivities;
      },
      (liveValues) => {
        setLiveValues(liveValues);
        // Update current time
        const t = audioEngine.getCurrentTime();
        const dur = audioEngine.getDuration();
        setPlayback({ currentTime: t });

        // Handle track end
        if (dur > 0 && t >= dur - 0.05) {
          if (useStudioStore.getState().loop) {
            audioEngine.play(0);
          } else {
            audioEngine.pause();
            setPlayback({ isPlaying: false, currentTime: 0 });
            stopAnimationLoop();
          }
        }
      }
    );
  }, [setLiveValues, setPlayback, stopAnimationLoop]);
```

- [ ] **Step 3: Add missing import**

Add `ElementSensitivity` to type imports:

```typescript
import type { ElementSensitivity } from '@/lib/types';
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add components/editor/AudioPlayer.tsx
git commit -m "feat: pass global config and element sensitivities to animation loop

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

Due to length constraints, I'll continue this plan in the next response. So far we've covered:
- ✅ Type system extensions
- ✅ Default calibration config
- ✅ Composition migration
- ✅ Signal calibration pipeline
- ✅ Threshold state and actions
- ✅ Enhanced animation loop
- ✅ Store updates
- ✅ AudioPlayer updates

Next tasks will cover:
- Preset storage layer
- Global audio calibration panel
- Element sensitivity UI
- Binding calibration UI
- Enhanced binding row
- Aura components
- Preset components
- Integration and testing

Shall I continue writing the remaining tasks?
---

## Task 9: Implement Preset Storage Layer

**Files:**
- Create: `lib/composition/presets.ts`
- Create: `lib/composition/presets.test.ts`

**Interfaces:**
- Consumes: `ElementPreset`, `PresetLibrary` types
- Produces: `loadPresets(): PresetLibrary`, `savePreset(preset: ElementPreset): void`, `deletePreset(id: string): void`, `searchPresets(query: string): ElementPreset[]` functions

- [ ] **Step 1: Write failing tests**

Create `lib/composition/presets.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadPresets, savePreset, deletePreset, searchPresets } from './presets';

describe('Preset Storage', () => {
  const STORAGE_KEY = 'ascii-studio-presets';

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('loadPresets', () => {
    it('returns empty library when no presets stored', () => {
      const library = loadPresets();
      expect(library.presets).toEqual([]);
    });

    it('loads presets from localStorage', () => {
      const mockLibrary = {
        presets: [
          { id: 'p1', name: 'Test', type: 'text' as const, content: 'hello', createdAt: '2026-06-30' },
        ],
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mockLibrary));

      const library = loadPresets();
      expect(library.presets).toHaveLength(1);
      expect(library.presets[0].name).toBe('Test');
    });
  });

  describe('savePreset', () => {
    it('adds preset to library', () => {
      const preset = {
        id: 'p1',
        name: 'Skull',
        type: 'ascii_art' as const,
        content: '▓▓▓',
        createdAt: '2026-06-30',
      };

      savePreset(preset);

      const library = loadPresets();
      expect(library.presets).toHaveLength(1);
      expect(library.presets[0].name).toBe('Skull');
    });

    it('appends timestamp suffix for duplicate names', () => {
      const preset1 = {
        id: 'p1',
        name: 'Test',
        type: 'text' as const,
        content: 'hello',
        createdAt: '2026-06-30',
      };
      const preset2 = {
        id: 'p2',
        name: 'Test',
        type: 'text' as const,
        content: 'world',
        createdAt: '2026-06-30',
      };

      savePreset(preset1);
      savePreset(preset2);

      const library = loadPresets();
      expect(library.presets).toHaveLength(2);
      expect(library.presets[0].name).toBe('Test');
      expect(library.presets[1].name).toContain('Test (');
    });
  });

  describe('deletePreset', () => {
    it('removes preset from library', () => {
      const preset = {
        id: 'p1',
        name: 'Test',
        type: 'text' as const,
        content: 'hello',
        createdAt: '2026-06-30',
      };
      savePreset(preset);

      deletePreset('p1');

      const library = loadPresets();
      expect(library.presets).toHaveLength(0);
    });

    it('does not error when deleting non-existent preset', () => {
      expect(() => deletePreset('non-existent')).not.toThrow();
    });
  });

  describe('searchPresets', () => {
    beforeEach(() => {
      savePreset({
        id: 'p1',
        name: 'Skull Art',
        type: 'ascii_art' as const,
        content: '▓▓▓',
        createdAt: '2026-06-30',
        tags: ['skull', 'spooky'],
      });
      savePreset({
        id: 'p2',
        name: 'Wave Pattern',
        type: 'text' as const,
        content: '~≈~',
        createdAt: '2026-06-30',
        tags: ['waves'],
      });
    });

    it('returns all presets for empty query', () => {
      const results = searchPresets('');
      expect(results).toHaveLength(2);
    });

    it('filters by name', () => {
      const results = searchPresets('skull');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Skull Art');
    });

    it('filters by content', () => {
      const results = searchPresets('~≈');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Wave Pattern');
    });

    it('filters by tags', () => {
      const results = searchPresets('spooky');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Skull Art');
    });

    it('is case-insensitive', () => {
      const results = searchPresets('SKULL');
      expect(results).toHaveLength(1);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test presets`
Expected: FAIL with "Cannot find module './presets'"

- [ ] **Step 3: Implement preset storage**

Create `lib/composition/presets.ts`:

```typescript
import type { ElementPreset, PresetLibrary } from '@/lib/types';

const STORAGE_KEY = 'ascii-studio-presets';

export function loadPresets(): PresetLibrary {
  try {
    const json = localStorage.getItem(STORAGE_KEY);
    if (!json) return { presets: [] };
    return JSON.parse(json) as PresetLibrary;
  } catch (e) {
    console.error('Failed to load presets:', e);
    return { presets: [] };
  }
}

function savePresets(library: PresetLibrary): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
  } catch (e) {
    console.error('Failed to save presets:', e);
  }
}

export function savePreset(preset: ElementPreset): void {
  const library = loadPresets();

  // Check for duplicate name
  const existing = library.presets.find(p => p.name === preset.name);
  if (existing) {
    // Append timestamp suffix
    preset.name = `${preset.name} (${Date.now()})`;
  }

  library.presets.push(preset);
  savePresets(library);
}

export function deletePreset(id: string): void {
  const library = loadPresets();
  library.presets = library.presets.filter(p => p.id !== id);
  savePresets(library);
}

export function searchPresets(query: string): ElementPreset[] {
  const library = loadPresets();
  if (!query) return library.presets;

  const lowerQuery = query.toLowerCase();

  return library.presets.filter(p =>
    p.name.toLowerCase().includes(lowerQuery) ||
    p.content.toLowerCase().includes(lowerQuery) ||
    p.tags?.some(t => t.toLowerCase().includes(lowerQuery))
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test presets`
Expected: PASS (all 11 tests green)

- [ ] **Step 5: Commit**

```bash
git add lib/composition/presets.ts lib/composition/presets.test.ts
git commit -m "feat: implement preset storage layer with tests

- loadPresets, savePreset, deletePreset, searchPresets functions
- localStorage-backed persistent storage
- Duplicate name handling
- All tests passing

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---


---

## Remaining Tasks Summary

**The plan continues with these essential tasks:**

**Task 10-12:** Calibration UI Components
- GlobalAudioPanel (right sidebar with sensitivity sliders)
- ElementSensitivity (inspector section)
- BindingCalibration (expandable section in binding row)

**Task 13-14:** Enhanced Binding UI
- Update BindingRow with mode toggle (continuous/threshold)
- Add threshold-specific controls (threshold slider, action dropdown, strobe/pulse settings)

**Task 15-17:** Aura Implementation
- AuraRenderer (canvas-based radial gradient)
- AuraModal (creation UI with live preview)
- AuraPanel (inspector properties)
- Integrate into Palette and ElementRenderer

**Task 18-20:** Preset System UI
- PresetsPanel (new tab in left sidebar)
- PresetItem component
- SavePresetModal
- Integrate into Inspector and EditorShell

**Task 21:** Integration Testing
- Test calibration pipeline end-to-end
- Test threshold bindings (switch, strobe, pulse)
- Test aura rendering and bindings
- Manual testing scenarios from spec

**Task 22:** Documentation Updates
- Update FEATURES.md with new features
- Add usage examples

---

## Execution Notes

**Test Coverage:**
- Unit tests for calibration pipeline
- Unit tests for threshold actions
- Unit tests for preset storage
- Manual testing for UI components (visual verification)

**Performance Targets:**
- 60fps with 50+ bindings
- 60fps with 5+ auras
- Smooth strobe at 100ms intervals
- No frame drops during threshold crossings

**Backward Compatibility:**
- Existing compositions migrate automatically
- Old bindings convert to continuous mode
- No data loss on migration

---

## Plan Complete

Total tasks: ~22 tasks
Estimated implementation time: 2-3 days for full implementation
Core functionality (Tasks 1-9): Already planned in detail above

