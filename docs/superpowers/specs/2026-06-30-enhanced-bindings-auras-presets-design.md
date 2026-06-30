# Enhanced Bindings, Auras, and Presets - Design Specification

**Date:** 2026-06-30  
**Version:** 1.0  
**Status:** Approved for Implementation

---

## Overview

This spec extends ASCII Studio's binding system to support threshold-based (binary) bindings alongside existing continuous bindings, adds Aura elements (multi-stop radial gradients), implements a multi-level audio calibration system, and provides a preset library for saving/reusing ASCII art and text content.

**Goals:**
- Enable instant/binary changes when audio signals cross thresholds (e.g., background switches black→white when volume > 70%)
- Support strobe and pulse effects as first-class threshold actions
- Provide fine-grained audio calibration at global, per-element, and per-binding levels
- Add Aura elements (soft radial gradients) that are fully audio-reactive
- Allow users to save and reuse ASCII art/text content as presets

**Non-Goals:**
- Export/import preset libraries (v1 is localStorage only)
- Animation easing/curves for continuous bindings (future enhancement)
- Multiple audio sources/tracks (still single audio file)

---

## Architecture

### High-Level Components

```
┌─────────────────────────────────────────────────────────────┐
│                      Audio Engine                           │
│  (existing - provides raw signals: volume, bass, mid, treb) │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              Calibration Pipeline                           │
│  Global Config → Element Sensitivity → Binding Calibration  │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              Enhanced Animation Loop                        │
│  - Applies continuous transforms (existing)                 │
│  - NEW: Detects threshold crossings with hysteresis         │
│  - NEW: Executes threshold actions (switch/strobe/pulse)    │
│  - Produces LiveValues for element rendering                │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                  Element Renderers                          │
│  - Text, ASCII Art, Divider, Visualizer (existing)          │
│  - NEW: AuraRenderer (canvas-based radial gradient)         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   Preset Library                            │
│  - LocalStorage-backed preset collection                    │
│  - Content-only storage (no styling/bindings)               │
│  - CRUD operations for text/ASCII art templates             │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
Raw Audio Signal (0-1)
  ↓
Apply Global Sensitivity (per signal type)
  ↓
Apply Noise Floor Filter (ignore signals below threshold)
  ↓
Apply Signal Smoothing (low-pass filter)
  ↓
Apply Element Sensitivity Multiplier (if enabled)
  ↓
Apply Binding Calibration (offset, multiplier, clamp)
  ↓
Calibrated Signal (ready for transform)
  ↓
Apply Transform (continuous OR threshold)
  ↓
Final Value → LiveValues → Element Rendering
```

---

## Type System & Data Models

### Enhanced Binding Type

```typescript
type BindingMode = 'continuous' | 'threshold';

type ThresholdAction = 'switch' | 'strobe' | 'pulse';

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

interface Binding {
  id: string;
  elementId: string;
  signal: SignalName;
  property: VisualProperty;
  mode: BindingMode;
  continuousTransform?: ContinuousTransform;  // required if mode === 'continuous'
  thresholdTransform?: ThresholdTransform;    // required if mode === 'threshold'
  frames?: string[];  // for content property (existing)
  calibration?: BindingCalibration; // optional per-binding overrides
}
```

**Backward Compatibility:**
- Existing bindings in saved compositions have no `mode` field
- Migration: add `mode: 'continuous'` to all existing bindings on load
- `continuousTransform` defaults to existing `transform` field
- Old `transform` field can be deprecated but still read for migration

### Calibration System

```typescript
interface GlobalAudioConfig {
  volumeSensitivity: number;    // 0.1 - 3.0, default 1.0
  bassSensitivity: number;      // 0.1 - 3.0, default 1.0
  midSensitivity: number;       // 0.1 - 3.0, default 1.0
  trebleSensitivity: number;    // 0.1 - 3.0, default 1.0
  noiseFloor: number;           // 0-0.2, default 0.05 (ignore signals below 5%)
  signalSmoothing: number;      // 0-1, default 0.5 (low-pass filter strength)
}

interface ElementSensitivity {
  enabled: boolean;
  multiplier: number;           // 0.1 - 3.0, default 1.0
}

interface BindingCalibration {
  signalOffset: number;         // -1 to 1, default 0 (shift signal)
  signalMultiplier: number;     // 0.1 - 3.0, default 1.0
  clampMin: number;             // 0-1, default 0
  clampMax: number;             // 0-1, default 1
}
```

**Storage:**
- `GlobalAudioConfig`: stored in composition (per-composition settings)
- `ElementSensitivity`: stored in element as optional `sensitivity?: ElementSensitivity`
- `BindingCalibration`: stored in binding as optional `calibration?: BindingCalibration`

**Defaults:**
```typescript
const DEFAULT_GLOBAL_AUDIO: GlobalAudioConfig = {
  volumeSensitivity: 1.0,
  bassSensitivity: 1.0,
  midSensitivity: 1.0,
  trebleSensitivity: 1.0,
  noiseFloor: 0.05,
  signalSmoothing: 0.5,
};
```

### Aura Element

```typescript
interface ColorStop {
  position: number;  // 0-1, distance from center (0 = center, 1 = edge)
  color: string;     // hex color '#rrggbb'
}

interface AuraElement extends BaseElement {
  type: 'aura';
  colorStops: ColorStop[];  // 2-5 stops, sorted by position ascending
  blur: number;             // 0-100, softness/glow intensity
  blendMode?: 'normal' | 'screen' | 'overlay' | 'multiply';
}
```

**Bindable Aura Properties:**
- Standard: `x`, `y`, `rotation`, `opacity`, `size.w`, `size.h`
- Aura-specific:
  - `blur` - numeric property (0-100)
  - `colorStop0Hue`, `colorStop1Hue`, ... `colorStop4Hue` - hue values (0-360)
  
**Type Extension:**
```typescript
// Extend VisualProperty union
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

// Extend ElementType union
export type ElementType = 
  | 'text' 
  | 'ascii_art' 
  | 'divider' 
  | 'decorative' 
  | 'visualizer'
  | 'aura';  // NEW
```

### Preset System

```typescript
interface ElementPreset {
  id: string;
  name: string;
  type: 'text' | 'ascii_art';  // only content-based elements
  content: string;              // the saved text/ASCII art
  createdAt: string;            // ISO timestamp
  tags?: string[];              // optional categorization
}

interface PresetLibrary {
  presets: ElementPreset[];
}
```

**Storage:**
- LocalStorage key: `ascii-studio-presets`
- Separate from compositions (presets are global, reusable)
- JSON serialized

**Operations:**
```typescript
// lib/composition/presets.ts
export function loadPresets(): PresetLibrary;
export function savePreset(preset: ElementPreset): void;
export function deletePreset(id: string): void;
export function searchPresets(query: string): ElementPreset[];
```

---

## Threshold Binding Execution

### Threshold State Management

```typescript
interface ThresholdState {
  isAbove: boolean;           // current state (above or below threshold)
  lastCrossTime: number;      // timestamp of last crossing (for timing)
  strobeState?: boolean;      // for strobe action (flash on/off)
  pulseEndTime?: number;      // for pulse action (when to return)
}

// Global state map (keyed by binding ID)
const thresholdStates = new Map<string, ThresholdState>();
```

**Initialization:**
- When binding is created with `mode: 'threshold'`, initialize state:
  ```typescript
  thresholdStates.set(binding.id, {
    isAbove: false,
    lastCrossTime: 0,
  });
  ```

### Threshold Detection Algorithm

**Hysteresis Logic:**
```
If currently BELOW threshold:
  → Go ABOVE when signal >= threshold
  
If currently ABOVE threshold:
  → Go BELOW when signal < returnThreshold (or threshold if no returnThreshold set)
```

This prevents rapid toggling when signal hovers near threshold.

**Example:**
- Threshold: 0.7
- Return threshold: 0.6
- Signal sequence: 0.5 → 0.65 → 0.72 → 0.68 → 0.58
- State: BELOW → BELOW → **ABOVE** (crossed 0.7) → ABOVE (above 0.6) → **BELOW** (crossed below 0.6)

### Threshold Actions

**1. Switch Action**
```typescript
// Simple binary toggle
return state.isAbove ? transform.aboveValue : transform.belowValue;
```
- Instant switch when crossing threshold
- No timing logic needed
- Example: volume > 0.7 → opacity = 1.0, else opacity = 0.3

**2. Strobe Action**
```typescript
if (!state.isAbove) return transform.belowValue;

// While above threshold, alternate between values at strobeSpeed interval
const strobeSpeed = transform.strobeSpeed ?? 100; // default 100ms
const elapsedSinceCross = now - state.lastCrossTime;
const flashIndex = Math.floor(elapsedSinceCross / strobeSpeed);
return flashIndex % 2 === 0 ? transform.aboveValue : transform.belowValue;
```
- Rapidly flashes while signal stays above threshold
- Flash rate controlled by `strobeSpeed` (ms per toggle)
- Stops immediately when signal drops below return threshold
- Example: bass > 0.75 → strobe background black/white every 80ms

**3. Pulse Action**
```typescript
// On crossing, set pulse end time
if (justCrossed) {
  state.pulseEndTime = now + (transform.pulseDuration ?? 200);
}

// Hold aboveValue until pulse duration expires
if (state.pulseEndTime && now < state.pulseEndTime) {
  return transform.aboveValue;
}
return transform.belowValue;
```
- Brief activation then automatic return
- Good for "kick drum hit" effects
- Returns to `belowValue` even if signal stays high
- Example: bass > 0.8 → flash element bright for 150ms, then dim

### Implementation in Animation Loop

**Enhanced `applyBinding` function:**
```typescript
function applyBinding(
  binding: Binding,
  calibratedSignal: number,
  now: number
): { property: VisualProperty; value: number | string } {
  
  if (binding.mode === 'continuous') {
    // Existing continuous logic
    return {
      property: binding.property,
      value: applyTransform(calibratedSignal, binding.continuousTransform!),
    };
  }
  
  // Threshold mode
  const state = thresholdStates.get(binding.id)!;
  const transform = binding.thresholdTransform!;
  
  // Detect crossing with hysteresis
  const threshold = transform.threshold;
  const returnThreshold = transform.returnThreshold ?? threshold;
  const shouldBeAbove = state.isAbove 
    ? calibratedSignal >= returnThreshold
    : calibratedSignal >= threshold;
  
  // State changed?
  if (shouldBeAbove !== state.isAbove) {
    state.isAbove = shouldBeAbove;
    state.lastCrossTime = now;
    
    // Initialize action-specific state
    if (transform.action === 'pulse') {
      state.pulseEndTime = now + (transform.pulseDuration ?? 200);
    }
  }
  
  // Apply action to get value
  let value: number | string;
  switch (transform.action) {
    case 'switch':
      value = state.isAbove ? transform.aboveValue : transform.belowValue;
      break;
    case 'strobe':
      value = applyStrobeAction(state, transform, now);
      break;
    case 'pulse':
      value = applyPulseAction(state, transform, now);
      break;
  }
  
  return { property: binding.property, value };
}
```

---

## Calibration Pipeline

### Signal Processing Flow

```typescript
function getCalibratedSignal(
  rawSignal: number,
  signalName: SignalName,
  elementId: string,
  binding: Binding,
  globalConfig: GlobalAudioConfig,
  elementSensitivities: Record<string, ElementSensitivity>
): number {
  let signal = rawSignal;
  
  // Step 1: Global sensitivity
  const sensitivityKey = `${signalName}Sensitivity` as keyof GlobalAudioConfig;
  signal *= globalConfig[sensitivityKey] as number;
  
  // Step 2: Noise floor filter
  if (signal < globalConfig.noiseFloor) {
    signal = 0;
  }
  
  // Step 3: Smoothing (low-pass filter)
  // Maintain smoothed values per signal
  const smoothed = smoothedSignals[signalName] ?? signal;
  signal = smoothed * (1 - globalConfig.signalSmoothing) 
         + signal * globalConfig.signalSmoothing;
  smoothedSignals[signalName] = signal;
  
  // Step 4: Element sensitivity
  const elemSens = elementSensitivities[elementId];
  if (elemSens?.enabled) {
    signal *= elemSens.multiplier;
  }
  
  // Step 5: Binding calibration
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

**Smoothed Signals State:**
```typescript
// Global state for smoothing (persists across frames)
const smoothedSignals: Partial<Signals> = {};
```

### Calibration Use Cases

**Use Case 1: Quiet audio file**
- Problem: Song is mastered quietly, bass never exceeds 0.4
- Solution: Set `bassSensitivity: 2.5` in global config
- Result: Bass signal boosted 2.5x, now peaks at 1.0

**Use Case 2: One element needs to be extra sensitive**
- Problem: Background should react strongly, text should react subtly
- Solution: 
  - Background element: `sensitivity: { enabled: true, multiplier: 2.0 }`
  - Text element: `sensitivity: { enabled: true, multiplier: 0.5 }`
- Result: Background gets 2x signal, text gets 0.5x signal

**Use Case 3: Fine-tune threshold trigger point**
- Problem: Threshold binding triggers too late (volume > 0.7 should be volume > 0.5)
- Solution: Add binding calibration `signalOffset: +0.2`
- Result: Effective threshold is now 0.5 (0.7 - 0.2)

**Use Case 4: Prevent noise from triggering effects**
- Problem: Silence/background noise (~5% signal) causes flicker
- Solution: Set `noiseFloor: 0.1` in global config
- Result: All signals below 10% treated as 0

---

## Aura Element Rendering

### Rendering Strategy

**Canvas-Based Approach:**
- Each aura element renders to its own `<canvas>` element
- Canvas positioned absolutely via `ElementWrapper` (same as other elements)
- Gradient drawn programmatically, then blurred via CSS `filter`

**Why Canvas vs DOM Gradient:**
- More control over color stop interpolation
- Better blur quality with CSS filter
- Can animate color stops smoothly
- Matches existing `CanvasBackground` pattern

### AuraRenderer Component

```typescript
// components/editor/aura/AuraRenderer.tsx
export function AuraRenderer({ 
  element, 
  liveOverride 
}: { 
  element: AuraElement; 
  liveOverride?: Partial<LiveElementOverride> 
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d')!;
    
    // Set canvas resolution
    canvas.width = element.size.w;
    canvas.height = element.size.h;
    
    function draw() {
      const w = canvas!.width;
      const h = canvas!.height;
      const centerX = w / 2;
      const centerY = h / 2;
      const radius = Math.max(w, h) / 2;
      
      // Create radial gradient
      const gradient = ctx!.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, radius
      );
      
      // Apply color stops (with potential live hue overrides)
      element.colorStops.forEach((stop, i) => {
        let color = stop.color;
        
        // Check for live hue override
        const hueOverride = liveOverride?.[`colorStop${i}Hue` as keyof LiveElementOverride];
        if (typeof hueOverride === 'number') {
          color = applyHueShift(stop.color, hueOverride);
        }
        
        gradient.addColorStop(stop.position, color);
      });
      
      // Fill canvas
      ctx!.fillStyle = gradient;
      ctx!.fillRect(0, 0, w, h);
      
      rafRef.current = requestAnimationFrame(draw);
    }
    
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [element, liveOverride]);
  
  // Apply blur via CSS filter
  const blurValue = liveOverride?.blur ?? element.blur;
  const blurPx = `blur(${blurValue}px)`;
  
  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        filter: blurPx,
        mixBlendMode: element.blendMode ?? 'normal',
      }}
    />
  );
}
```

**Helper Function:**
```typescript
function applyHueShift(hexColor: string, newHue: number): string {
  // Convert hex → HSL
  const [r, g, b] = hexToRgb(hexColor);
  const [h, s, l] = rgbToHsl(r, g, b);
  
  // Replace hue, keep saturation/lightness
  const [r2, g2, b2] = hslToRgb(newHue, s, l);
  
  // Convert back to hex
  return rgbToHex(r2, g2, b2);
}
```

### Aura Modal UI

```typescript
// components/editor/aura/AuraModal.tsx
export function AuraModal({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean; 
  onClose: () => void 
}) {
  const [colorStops, setColorStops] = useState<ColorStop[]>([
    { position: 0, color: '#ffffff' },
    { position: 1, color: '#000000' },
  ]);
  const [blur, setBlur] = useState(50);
  const [blendMode, setBlendMode] = useState<'normal' | 'screen' | 'overlay' | 'multiply'>('normal');
  
  function addColorStop() {
    if (colorStops.length >= 5) return;
    
    // Insert new stop at midpoint of largest gap
    const gaps = colorStops.slice(0, -1).map((stop, i) => ({
      pos: (stop.position + colorStops[i + 1].position) / 2,
      index: i + 1,
    }));
    const largestGap = gaps.sort((a, b) => b.pos - a.pos)[0];
    
    const newStop: ColorStop = {
      position: largestGap.pos,
      color: '#ff00ff',
    };
    
    const updated = [...colorStops];
    updated.splice(largestGap.index, 0, newStop);
    setColorStops(updated);
  }
  
  function removeColorStop(index: number) {
    if (colorStops.length <= 2) return; // minimum 2 stops
    setColorStops(colorStops.filter((_, i) => i !== index));
  }
  
  function handleCreate() {
    const aura: AuraElement = {
      id: nanoid(),
      type: 'aura',
      colorStops: colorStops.sort((a, b) => a.position - b.position),
      blur,
      blendMode,
      position: { x: 200, y: 200 },
      size: { w: 400, h: 400 },
      z: Date.now(),
      rotation: 0,
      opacity: 1,
      color: { h: 0, s: 0, l: 0 }, // not used for auras
      locked: false,
    };
    
    addElement(aura);
    onClose();
  }
  
  // Render modal with gradient preview, color stop editors, etc.
}
```

**Gradient Preview:**
- Live-updating canvas showing current gradient configuration
- User sees exactly what will be created
- Updates on color/blur/blend mode changes

---

## Preset System Implementation

### Storage Layer

```typescript
// lib/composition/presets.ts
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

export function savePresets(library: PresetLibrary): void {
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
    // Append number suffix
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
  const lowerQuery = query.toLowerCase();
  
  return library.presets.filter(p => 
    p.name.toLowerCase().includes(lowerQuery) ||
    p.content.toLowerCase().includes(lowerQuery) ||
    p.tags?.some(t => t.toLowerCase().includes(lowerQuery))
  );
}
```

### UI Components

**Presets Tab (Left Sidebar):**
```typescript
// components/editor/PresetsPanel.tsx
export function PresetsPanel() {
  const [library, setLibrary] = useState(loadPresets());
  const [searchQuery, setSearchQuery] = useState('');
  const addElement = useStudioStore(s => s.addElement);
  
  const filteredPresets = searchQuery 
    ? searchPresets(searchQuery)
    : library.presets;
  
  function usePreset(preset: ElementPreset) {
    // Create new element from preset content
    const element: TextElement | AsciiArtElement = {
      id: nanoid(),
      type: preset.type,
      content: preset.content,
      font: 'jetbrains-mono',
      fontSize: 13,
      position: { x: 200, y: 200 },
      size: { w: 200, h: 100 },
      z: Date.now(),
      rotation: 0,
      opacity: 1,
      color: { h: 180, s: 50, l: 50 },
      locked: false,
    };
    
    addElement(element);
  }
  
  function handleDelete(id: string) {
    deletePreset(id);
    setLibrary(loadPresets());
  }
  
  // Render search bar, preset list, etc.
}
```

**Save Preset Button (Inspector):**
```typescript
// In Inspector.tsx, add button for text/ASCII art elements
{(element.type === 'text' || element.type === 'ascii_art') && (
  <button onClick={() => setShowSavePresetModal(true)}>
    Save as Preset
  </button>
)}

// SavePresetModal.tsx
export function SavePresetModal({ element, onClose }) {
  const [name, setName] = useState('');
  const [tags, setTags] = useState('');
  
  function handleSave() {
    const preset: ElementPreset = {
      id: nanoid(),
      name,
      type: element.type,
      content: element.content,
      createdAt: new Date().toISOString(),
      tags: tags ? tags.split(',').map(t => t.trim()) : undefined,
    };
    
    savePreset(preset);
    onClose();
  }
  
  // Render name input, tags input, save/cancel buttons
}
```

---

## User Interface Specifications

### Enhanced Binding Panel

**Layout Changes:**
- Add "Mode" toggle at top of each binding row (radio buttons: Continuous | Threshold)
- Show appropriate transform UI based on mode
- Expandable "Calibration" section (collapsed by default)
- Keep existing delete/duplicate buttons

**Continuous Mode UI:**
```
┌─────────────────────────────────────┐
│ Mode: ●Continuous ○Threshold        │
│                                     │
│ Min: [  0  ]    Max: [ 1200 ]       │
│ ☐ Invert                            │
│                                     │
│ ⚙ Calibration ▸                     │ ← click to expand
└─────────────────────────────────────┘
```

**Threshold Mode UI:**
```
┌─────────────────────────────────────┐
│ Mode: ○Continuous ●Threshold        │
│                                     │
│ Threshold: ━━━━━●━━  0.70 (70%)     │ ← slider with value
│                                     │
│ Above: [ 1.0 ]   Below: [ 0.0 ]     │
│ Return at: [ 0.60 ] ☑ Use hyster.   │ ← checkbox enables returnThreshold
│                                     │
│ Action: [Switch ▼]                  │ ← dropdown
│ [action-specific controls]          │
│                                     │
│ ⚙ Calibration ▸                     │
└─────────────────────────────────────┘
```

**Action-Specific Controls:**
- **Switch:** No additional controls
- **Strobe:** Flash Speed slider (50-500ms)
- **Pulse:** Hold Duration slider (50-1000ms)

**Calibration Section (Expanded):**
```
┌─────────────────────────────────────┐
│ ⚙ Calibration ▾                     │
│                                     │
│ Offset:     ━━━●━━━  +0.0           │ ← -1 to +1
│ Multiplier: ━━━●━━━  1.0x           │ ← 0.1 to 3.0
│ Clamp Min:  ━●━━━━━  0.0            │ ← 0 to 1
│ Clamp Max:  ━━━━━━●  1.0            │ ← 0 to 1
│                                     │
│ [Reset to Defaults]                 │
└─────────────────────────────────────┘
```

### Global Audio Calibration Panel

**Location:** Right sidebar, below Background Panel

**Collapsible Panel:**
```
┌─────────────────────────────────────┐
│ AUDIO CALIBRATION            [▾]    │ ← click to collapse
├─────────────────────────────────────┤
│ Global Sensitivity:                 │
│   Volume:  ━━━●━━━━  1.0x           │
│   Bass:    ━━━●━━━━  1.0x           │
│   Mid:     ━━━●━━━━  1.0x           │
│   Treble:  ━━━●━━━━  1.0x           │
│                                     │
│ Noise Floor: ━●━━━━━  0.05          │
│ Smoothing:   ━━━●━━━  0.5           │
│                                     │
│ [Reset to Defaults]                 │
└─────────────────────────────────────┘
```

**Collapsed State:**
```
┌─────────────────────────────────────┐
│ AUDIO CALIBRATION            [▸]    │
└─────────────────────────────────────┘
```

### Per-Element Sensitivity (Inspector)

**Location:** Inspector panel, new section between COLOR and FONT

```
┌─────────────────────────────────────┐
│ AUDIO SENSITIVITY                   │
├─────────────────────────────────────┤
│ ☑ Override global settings          │ ← checkbox
│                                     │
│ Element Multiplier:                 │
│ ━━━●━━━━  1.0x                      │
│                                     │
│ (Affects all bindings on element)   │
└─────────────────────────────────────┘
```

**When checkbox unchecked:** Slider grayed out, uses global sensitivity

### Aura Modal

**Triggered By:** Clicking "AURA" button in Palette

**Modal Layout:**
```
┌─────────────────────────────────────────┐
│ Create Aura                       [×]   │
├─────────────────────────────────────────┤
│                                         │
│  ┌───────────────────────────────────┐  │
│  │                                   │  │
│  │   [Live Gradient Preview Canvas]  │  │
│  │                                   │  │
│  └───────────────────────────────────┘  │
│                                         │
├─────────────────────────────────────────┤
│ Color Stops (2-5):                      │
│                                         │
│ ● Center (0%)   [#ffffff] [×]           │ ← color picker + remove
│ ● 50%           [#ff6b9d] [×]           │
│ ● Edge (100%)   [#00d4ff] [×]           │
│                                         │
│ [+ Add Color Stop]                      │ ← disabled if 5 stops
│                                         │
│ Blur: ━━━━●━━━━  50                     │ ← 0-100
│                                         │
│ Blend Mode: [Normal     ▼]              │
│             [Screen     ]               │
│             [Overlay    ]               │
│             [Multiply   ]               │
│                                         │
│ Initial Size: W: 400  H: 400            │
│                                         │
│ [Create Aura] [Cancel]                  │
└─────────────────────────────────────────┘
```

**Preview Canvas:**
- Live-updates as user changes stops/blur/blend
- Shows exact visual result
- Same size as modal (~400x300px)

**Color Stop Controls:**
- Position auto-calculated when adding (inserts at midpoint of largest gap)
- User can't edit position directly (sorted automatically)
- Minimum 2 stops, maximum 5 stops
- Can't remove first/last stop (center and edge)

### Presets Tab

**Location:** Left sidebar, new tab alongside Palette and Bindings

**Tab Layout:**
```
┌─────────────────────────────────────┐
│ PRESETS                      [+]    │ ← save current element
├─────────────────────────────────────┤
│ Search: [____________]  🔍          │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ Skull ASCII                     │ │ ← preset name
│ │   ░▒▓█▓▒░                       │ │
│ │   ▒▓███▓▒                       │ │ ← preview (max 3 lines)
│ │   ▓█████▓                       │ │
│ │ Tags: skull, spooky             │ │
│ │ [Use] [Delete]                  │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ Wave Pattern                    │ │
│ │   ~≈~≈~≈~≈~≈~≈~                │ │
│ │ Tags: waves                     │ │
│ │ [Use] [Delete]                  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ (Empty state: "No presets yet")     │
└─────────────────────────────────────┘
```

**[+] Button Behavior:**
- Only enabled when text/ASCII art element is selected
- Opens simple dialog: "Save '[element name]' as preset?"
  - Name: [auto-filled with element type + timestamp]
  - Tags: [optional, comma-separated]
  - [Save] [Cancel]

**Search:**
- Filters by name, content, or tags (case-insensitive)
- Live filtering as user types

**Use Button:**
- Creates new element at default position (200, 200)
- Uses preset content
- Applies default styling (not saved in preset)
- User can then customize color, font, size, bindings

---

## Component Architecture

### New Components

```
components/
  editor/
    aura/
      AuraModal.tsx           - Configuration modal for creating auras
      AuraRenderer.tsx        - Canvas-based aura rendering
      AuraPanel.tsx           - Inspector panel for aura properties
    binding/
      BindingRow.tsx          - Enhanced with mode toggle + threshold UI
      BindingPresets.tsx      - Existing, no changes
      BindingPreview.tsx      - Existing, no changes
    presets/
      PresetsPanel.tsx        - Main preset library UI (new tab)
      SavePresetModal.tsx     - Dialog for saving presets
      PresetItem.tsx          - Individual preset list item
    calibration/
      GlobalAudioPanel.tsx    - Global calibration controls (right sidebar)
      ElementSensitivity.tsx  - Per-element sensitivity (inspector section)
      BindingCalibration.tsx  - Per-binding calibration (expandable section)
```

### Modified Components

**`components/editor/Palette.tsx`:**
- Add "AURA" button (triggers AuraModal)
- Keep existing element buttons

**`components/editor/Inspector.tsx`:**
- Add ElementSensitivity section (for all elements)
- Add "Save as Preset" button (for text/ASCII art only)
- Add AuraPanel (when aura element selected)

**`components/editor/EditorShell.tsx`:**
- Add "Presets" tab to left sidebar tabs array
- Conditional render: Palette | Bindings | Presets

**`components/editor/BindingPanel.tsx`:**
- Replace BindingRow with enhanced version
- Keep presets integration

**`components/editor/ElementRenderer.tsx`:**
- Add case for `type: 'aura'` → render AuraRenderer

**`lib/animation/animationLoop.ts`:**
- Enhance `applyBinding()` to handle threshold mode
- Add `getCalibratedSignal()` function
- Maintain `thresholdStates` map
- Maintain `smoothedSignals` for smoothing filter

**`lib/store/studioStore.ts`:**
- Add `globalAudioConfig: GlobalAudioConfig` to state
- Add `updateGlobalAudioConfig()` action
- Add `elementSensitivities: Record<string, ElementSensitivity>` to state
- Add `setElementSensitivity()` action

**`lib/types.ts`:**
- Add all new types (Binding extensions, calibration, aura, presets)
- Extend `ElementType` and `VisualProperty` unions

---

## Migration & Backward Compatibility

### Existing Compositions

**Binding Migration:**
```typescript
// On composition load, migrate old bindings
function migrateComposition(comp: CompositionSpec): CompositionSpec {
  return {
    ...comp,
    bindings: comp.bindings.map(binding => {
      // Old bindings have no 'mode' field
      if (!('mode' in binding)) {
        return {
          ...binding,
          mode: 'continuous' as BindingMode,
          continuousTransform: binding.transform, // old field name
        };
      }
      return binding;
    }),
    globalAudioConfig: comp.globalAudioConfig ?? DEFAULT_GLOBAL_AUDIO,
  };
}
```

**Element Migration:**
```typescript
// Elements get optional sensitivity field (default: not enabled)
// No migration needed - just handle undefined gracefully
```

### Storage Schema Updates

**Composition Schema (v2):**
```typescript
interface CompositionSpec {
  // ... existing fields ...
  globalAudioConfig?: GlobalAudioConfig;  // NEW - optional for backward compat
  bindings: Binding[];  // enhanced Binding type
}
```

**LocalStorage Keys:**
- `compositions` - existing, schema updated
- `ascii-studio-presets` - NEW

---

## Testing Strategy

### Unit Tests

**Calibration Pipeline:**
- `getCalibratedSignal()` with various config combinations
- Verify signal flow: global → element → binding → clamp
- Edge cases: noiseFloor at 0, sensitivity at extremes (0.1, 3.0)

**Threshold Detection:**
- Hysteresis logic (stay above until returnThreshold)
- State transitions (below → above → below)
- Edge case: threshold === returnThreshold (no hysteresis)

**Threshold Actions:**
- Switch: instant toggle on crossing
- Strobe: flash timing at various speeds
- Pulse: hold duration then return

**Preset Storage:**
- Save/load/delete operations
- Search functionality
- Duplicate name handling

### Integration Tests

**Binding Mode Switching:**
- Create continuous binding → switch to threshold → verify UI updates
- Threshold binding with hysteresis → verify no flicker at threshold edge

**Aura Rendering:**
- Create aura with 3 color stops → verify gradient interpolation
- Bind colorStop0Hue to bass → verify color shift on audio playback
- Blur binding → verify live blur updates

**Calibration Interactions:**
- Global sensitivity affects all bindings
- Element sensitivity overrides global
- Binding calibration fine-tunes per-binding
- Verify signal flow order (global → element → binding)

### Manual Testing Scenarios

**Scenario 1: Strobing Background**
1. Create composition with background element
2. Add binding: volume → backgroundColor (threshold mode)
3. Set threshold: 0.7, above: #ffffff, below: #000000, action: strobe, speed: 80ms
4. Play audio with loud sections
5. Expected: Background flashes black/white rapidly when volume > 70%

**Scenario 2: Pulsing Aura**
1. Create aura (white → pink → blue gradient)
2. Add binding: bass → size (continuous mode), min: 200, max: 600
3. Play bass-heavy track
4. Expected: Aura smoothly expands/contracts with bass

**Scenario 3: Teleporting Text**
1. Create text element
2. Add binding: treble → x (threshold mode, action: switch)
   - Threshold: 0.6, above: 800, below: 200
3. Add binding: treble → y (threshold mode, action: pulse)
   - Threshold: 0.7, above: 400, below: 100, duration: 150ms
4. Play treble-heavy track
5. Expected: Text jumps left/right on treble peaks, briefly jumps up/down on stronger peaks

**Scenario 4: Preset Workflow**
1. Create ASCII art skull
2. Save as preset: "Skull Art", tags: "skull, spooky"
3. Create new composition
4. Open Presets tab, search "skull"
5. Click "Use" on "Skull Art"
6. Expected: New skull element appears on canvas with preset content

---

## Performance Considerations

### Animation Loop Optimization

**Threshold State Updates:**
- Only update state on actual crossings (not every frame)
- Strobing calculated once per flash interval (not per frame)
- Use `Map` for O(1) state lookup by binding ID

**Calibration Caching:**
- Smooth signals persisted across frames (low-pass filter)
- Global config read once per frame (not per binding)

**Expected Performance:**
- 60fps with 50+ bindings (20 continuous, 30 threshold)
- No perceptible lag from threshold detection
- Strobe effects smooth at 100ms interval

### Aura Rendering

**Canvas Strategy:**
- Each aura gets its own canvas (not shared)
- Canvas size matches element size (no over-rendering)
- Gradient drawn once per frame (RAF loop)
- CSS blur applied (GPU-accelerated)

**Expected Performance:**
- 60fps with 5+ auras on screen
- Color stop binding updates smooth (direct canvas manipulation)

### Preset Storage

**LocalStorage Limits:**
- Each preset ~1-5KB (text content + metadata)
- LocalStorage limit: 5-10MB
- Practical limit: ~1000-5000 presets
- No performance impact on load (read once at startup)

---

## Future Enhancements

**Not in V1, but designed for:**

1. **Export/Import Presets**
   - Export preset library to JSON file
   - Import presets from other users
   - Share preset packs

2. **Animation Easing for Continuous Bindings**
   - Add `easing` field to ContinuousTransform
   - Options: linear, ease-in, ease-out, bounce, elastic
   - Smooth transitions instead of instant value changes

3. **Advanced Calibration Presets**
   - Save calibration configs as named presets
   - Quick-apply calibration profiles (e.g., "Loud Audio", "Quiet Audio", "Sensitive")

4. **Multi-Track Audio**
   - Load multiple audio files
   - Bind different elements to different tracks
   - Mix/balance control

5. **Threshold Binding Chaining**
   - "When bass > 0.7 AND volume > 0.5" (compound conditions)
   - State machine bindings (on → flash → off → repeat)

6. **Aura Animation Modes**
   - Rotating gradients
   - Pulsing color stops (built-in animation)
   - Radial wave propagation

---

## Implementation Checklist

### Phase 1: Type System & Data Models (1-2 tasks)
- [ ] Extend Binding type (mode, threshold/continuous transforms)
- [ ] Add calibration types (Global, Element, Binding)
- [ ] Add AuraElement type
- [ ] Add PresetLibrary types
- [ ] Extend VisualProperty and ElementType unions
- [ ] Write migration logic for old compositions

### Phase 2: Calibration System (2-3 tasks)
- [ ] Implement getCalibratedSignal() function
- [ ] Add smoothing state management
- [ ] Create GlobalAudioPanel component (right sidebar)
- [ ] Create ElementSensitivity component (inspector section)
- [ ] Create BindingCalibration component (expandable in binding row)
- [ ] Add global/element state to studioStore
- [ ] Write unit tests for calibration pipeline

### Phase 3: Threshold Bindings (3-4 tasks)
- [ ] Implement threshold state management (Map)
- [ ] Implement threshold detection with hysteresis
- [ ] Implement switch action
- [ ] Implement strobe action
- [ ] Implement pulse action
- [ ] Enhance animationLoop.ts with threshold support
- [ ] Update BindingRow UI (mode toggle, threshold controls)
- [ ] Write unit tests for threshold actions

### Phase 4: Aura Elements (3-4 tasks)
- [ ] Create AuraElement data structure
- [ ] Implement AuraRenderer component (canvas-based)
- [ ] Implement AuraModal component (creation UI)
- [ ] Implement AuraPanel component (inspector)
- [ ] Add AURA button to Palette
- [ ] Integrate into ElementRenderer
- [ ] Handle colorStopNHue binding properties
- [ ] Write integration tests for aura rendering

### Phase 5: Preset System (2-3 tasks)
- [ ] Implement preset storage layer (localStorage)
- [ ] Create PresetsPanel component (new tab)
- [ ] Create SavePresetModal component
- [ ] Add "Save as Preset" button to Inspector
- [ ] Implement search/filter functionality
- [ ] Add preset usage to element creation flow
- [ ] Write unit tests for preset CRUD operations

### Phase 6: Integration & Polish (2-3 tasks)
- [ ] Test calibration + threshold binding interactions
- [ ] Test aura + binding combinations
- [ ] Manual testing of all user scenarios
- [ ] Performance profiling (60fps target)
- [ ] Documentation updates (FEATURES.md)
- [ ] Create example compositions showcasing features

**Estimated Total:** 13-19 tasks

---

## Success Criteria

**Threshold Bindings:**
- ✅ User can create threshold binding with switch/strobe/pulse actions
- ✅ Hysteresis prevents flicker at threshold boundary
- ✅ Strobe effect flashes at configured speed (±10ms accuracy)
- ✅ Pulse effect returns to below value after duration expires

**Calibration:**
- ✅ Global sensitivity affects all signals correctly
- ✅ Element sensitivity overrides global (multiplicative)
- ✅ Binding calibration fine-tunes individual bindings
- ✅ Noise floor filters low signals without artifacts
- ✅ Smoothing reduces jitter without excessive lag

**Aura Elements:**
- ✅ Auras render smooth radial gradients with 2-5 color stops
- ✅ Blur control creates soft glow effect
- ✅ Color stop hue binding updates smoothly (60fps)
- ✅ Auras support all standard bindings (position, size, opacity, rotation)

**Presets:**
- ✅ User can save text/ASCII art content as preset
- ✅ Presets load into new compositions
- ✅ Search filters by name/content/tags
- ✅ Duplicate names handled gracefully

**Performance:**
- ✅ 60fps with 50+ bindings (mix of continuous/threshold)
- ✅ 60fps with 5+ auras on screen
- ✅ No dropped frames during threshold crossings
- ✅ Preset library loads in <100ms

**Backward Compatibility:**
- ✅ Old compositions load and work (bindings migrated to continuous mode)
- ✅ No data loss on migration

---

## End of Specification

This design is approved for implementation. Next step: invoke `writing-plans` skill to create detailed implementation plan.
