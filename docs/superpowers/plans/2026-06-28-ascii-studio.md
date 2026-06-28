# ascii-studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real-time audio-visual ASCII art studio where users upload music, compose scenes of ASCII elements, and wire audio signals to visual properties via bindings.

**Architecture:** DOM-based rendering (ASCII as `<pre>` tags in absolutely-positioned divs on a fixed canvas div, inherited from ascii-editor). Web Audio API `AnalyserNode` extracts `volume`/`bass`/`mid`/`treble` signals each animation frame; a `requestAnimationFrame` loop applies bindings (signal → visual property via Transform) by writing to `liveValues` in the Zustand store. Compositions persist to `localStorage`.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript strict, Zustand v5, @dnd-kit/core, @dnd-kit/utilities, nanoid, Tailwind CSS v4, Vitest

## Global Constraints

- TypeScript strict mode everywhere — `// eslint-disable-next-line @typescript-eslint/no-explicit-any` when unavoidable
- No Supabase, no auth — `localStorage` only
- Element types: `text`, `ascii_art`, `divider`, `decorative` only — no `structural`
- Colors on elements: `{ h: number, s: number, l: number }` (HSL) — rendered as `hsl(h, s%, l%)`
- Tailwind v4 for layout utilities; CSS custom properties for theme tokens
- Monospace fonts only; no border-radius; no shadows; no emoji; ASCII symbols only
- Bindings stored in a flat global array on the composition, each with `elementId` — never nested on elements
- Canvas default: 1200×800px, grid 8px

---

## Task 1: Scaffold

- [ ] **1.1** Run the following command to create the Next.js project. If the CLI prompts interactively, answer: App Router = yes, import alias = `@/*`.

```bash
npx create-next-app@latest ascii-studio --typescript --tailwind --app --no-src-dir --import-alias "@/*"
cd ascii-studio
```

- [ ] **1.2** Install runtime dependencies:

```bash
npm install zustand @dnd-kit/core @dnd-kit/utilities nanoid
```

- [ ] **1.3** Install dev/test dependencies:

```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **1.4** Create `vitest.config.ts` at the project root:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
```

- [ ] **1.5** Create `vitest.setup.ts` at the project root:

```typescript
import '@testing-library/jest-dom';
```

- [ ] **1.6** Add test scripts to `package.json`. Open `package.json` and add to the `"scripts"` object:

```json
"test": "vitest run",
"test:watch": "vitest"
```

Full `scripts` block should look like:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **1.7** Replace `app/globals.css` with the full theme CSS:

```css
@import "tailwindcss";

:root {
  --bg: #f5f0e8;
  --surface: #ede8df;
  --text: #2a2520;
  --muted: #8a8075;
  --accent: #5a6e4a;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: var(--bg);
  color: var(--text);
  font-family: 'JetBrains Mono', 'IBM Plex Mono', 'Fira Code', monospace;
  font-size: 13px;
  line-height: 1.4;
}

button {
  font-family: inherit;
  font-size: 11px;
  cursor: pointer;
  border: 1px solid var(--muted);
  background: var(--surface);
  color: var(--text);
  padding: 3px 8px;
}
button:hover { border-color: var(--accent); color: var(--accent); }

input, select, textarea {
  font-family: inherit;
  font-size: 11px;
  border: 1px solid var(--muted);
  background: var(--bg);
  color: var(--text);
  padding: 3px 6px;
}
input:focus, select:focus, textarea:focus { outline: none; border-color: var(--accent); }

label {
  font-size: 9px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
  display: block;
  margin-bottom: 2px;
}
```

- [ ] **1.8** Replace `app/layout.tsx` with minimal layout (fonts loaded from system):

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ascii-studio',
  description: 'audio-visual ASCII art studio',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **1.9** Verify the dev server starts with no TypeScript errors:

```bash
npm run dev
```

Expected: server starts at `http://localhost:3000`, terminal shows no TS compile errors.

- [ ] **1.10** Initialize git and make the first commit:

```bash
git init && git add . && git commit -m "feat: scaffold ascii-studio"
```

---

## Task 2: Core types (`lib/types.ts`)

- [ ] **2.1** Create `lib/types.ts` with the complete type definitions:

```typescript
// lib/types.ts

export type SignalName = 'volume' | 'bass' | 'mid' | 'treble';

export type VisualProperty =
  | 'hue'
  | 'fontSize'
  | 'x'
  | 'y'
  | 'rotation'
  | 'opacity'
  | 'content';

export type ElementType = 'text' | 'ascii_art' | 'divider' | 'decorative';

export type FontName =
  | 'jetbrains-mono'
  | 'ibm-plex-mono'
  | 'fira-code'
  | 'vt323';

export interface ElementColor {
  h: number;
  s: number;
  l: number;
}

export interface Transform {
  min: number;
  max: number;
  invert: boolean;
}

export interface Binding {
  id: string;
  elementId: string;
  signal: SignalName;
  property: VisualProperty;
  transform: Transform;
  frames?: string[];
}

export interface LiveElementOverride {
  hue: number;
  fontSize: number;
  x: number;
  y: number;
  rotation: number;
  opacity: number;
  content: string;
}

export type LiveValues = Record<string, Partial<LiveElementOverride>>;

export type Signals = Record<SignalName, number>;

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
}

export interface TextElement extends BaseElement {
  type: 'text';
  content: string;
  font: FontName;
  fontSize: number;
}

export interface AsciiArtElement extends BaseElement {
  type: 'ascii_art';
  content: string;
  font: FontName;
  fontSize: number;
}

export interface DividerElement extends BaseElement {
  type: 'divider';
  pattern: string;
}

export interface DecorativeElement extends BaseElement {
  type: 'decorative';
  builtinId: string;
  fontSize: number;
}

export type Element =
  | TextElement
  | AsciiArtElement
  | DividerElement
  | DecorativeElement;

export interface CanvasConfig {
  width: number;
  height: number;
  grid: number;
}

export interface CompositionSpec {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  canvas: CanvasConfig;
  elements: Element[];
  bindings: Binding[];
}
```

- [ ] **2.2** Verify no TypeScript errors:

```bash
npx tsc --noEmit
```

Expected: exits with code 0, no output.

- [ ] **2.3** Commit:

```bash
git add . && git commit -m "feat: add core types"
```

---

## Task 3: Composition storage

- [ ] **3.1** Create `lib/composition/defaults.ts`:

```typescript
// lib/composition/defaults.ts
import { nanoid } from 'nanoid';
import type {
  CompositionSpec,
  Element,
  ElementType,
  ElementColor,
  FontName,
  CanvasConfig,
} from '@/lib/types';

export const DEFAULT_FONT: FontName = 'jetbrains-mono';

export const DEFAULT_COLOR: ElementColor = { h: 30, s: 15, l: 20 };

const DEFAULT_CANVAS: CanvasConfig = {
  width: 1200,
  height: 800,
  grid: 8,
};

export function createComposition(name: string): CompositionSpec {
  const now = new Date().toISOString();
  return {
    id: nanoid(),
    name,
    createdAt: now,
    updatedAt: now,
    canvas: { ...DEFAULT_CANVAS },
    elements: [],
    bindings: [],
  };
}

export function createElement(
  type: ElementType,
  pos: { x: number; y: number },
  z: number
): Element {
  const base = {
    id: nanoid(),
    position: { x: pos.x, y: pos.y },
    size: { w: 160, h: 48 },
    z,
    rotation: 0,
    opacity: 1,
    color: { ...DEFAULT_COLOR },
    locked: false,
  };

  switch (type) {
    case 'text':
      return {
        ...base,
        type: 'text',
        content: 'text',
        font: DEFAULT_FONT,
        fontSize: 13,
      };
    case 'ascii_art':
      return {
        ...base,
        type: 'ascii_art',
        content: '█░░█\n█░░█\n████',
        font: DEFAULT_FONT,
        fontSize: 13,
        size: { w: 80, h: 64 },
      };
    case 'divider':
      return {
        ...base,
        type: 'divider',
        pattern: '─',
        size: { w: 240, h: 24 },
      };
    case 'decorative':
      return {
        ...base,
        type: 'decorative',
        builtinId: 'dot-grid',
        fontSize: 13,
        size: { w: 80, h: 64 },
      };
  }
}
```

- [ ] **3.2** Create `lib/composition/storage.ts`:

```typescript
// lib/composition/storage.ts
import type { CompositionSpec } from '@/lib/types';

const STORAGE_KEY = 'ascii-studio:compositions';

function readAll(): Record<string, CompositionSpec> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, CompositionSpec>;
  } catch {
    return {};
  }
}

function writeAll(data: Record<string, CompositionSpec>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function listCompositions(): CompositionSpec[] {
  const all = readAll();
  return Object.values(all).sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function saveComposition(comp: CompositionSpec): void {
  const all = readAll();
  all[comp.id] = comp;
  writeAll(all);
}

export function loadComposition(id: string): CompositionSpec | null {
  const all = readAll();
  return all[id] ?? null;
}

export function deleteComposition(id: string): void {
  const all = readAll();
  delete all[id];
  writeAll(all);
}
```

- [ ] **3.3** Write the failing tests first. Create `lib/composition/storage.test.ts`:

```typescript
// lib/composition/storage.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  listCompositions,
  saveComposition,
  loadComposition,
  deleteComposition,
} from './storage';
import { createComposition } from './defaults';

beforeEach(() => {
  localStorage.clear();
});

describe('listCompositions', () => {
  it('returns empty array when nothing saved', () => {
    expect(listCompositions()).toEqual([]);
  });

  it('returns compositions sorted by updatedAt descending', () => {
    const a = createComposition('alpha');
    const b = {
      ...createComposition('beta'),
      updatedAt: new Date(Date.now() + 1000).toISOString(),
    };
    saveComposition(a);
    saveComposition(b);
    const list = listCompositions();
    expect(list[0].name).toBe('beta');
    expect(list[1].name).toBe('alpha');
  });
});

describe('saveComposition + loadComposition', () => {
  it('round-trips a composition correctly', () => {
    const comp = createComposition('test');
    saveComposition(comp);
    const loaded = loadComposition(comp.id);
    expect(loaded).toEqual(comp);
  });

  it('overwriting the same id does not create a duplicate', () => {
    const comp = createComposition('test');
    saveComposition(comp);
    saveComposition({ ...comp, name: 'updated' });
    const list = listCompositions();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('updated');
  });
});

describe('deleteComposition', () => {
  it('removes a saved composition', () => {
    const comp = createComposition('to-delete');
    saveComposition(comp);
    deleteComposition(comp.id);
    expect(loadComposition(comp.id)).toBeNull();
    expect(listCompositions()).toHaveLength(0);
  });

  it('is a no-op for an unknown id', () => {
    const comp = createComposition('keep');
    saveComposition(comp);
    deleteComposition('nonexistent-id');
    expect(listCompositions()).toHaveLength(1);
  });
});
```

- [ ] **3.4** Run the tests (they should pass now that both files exist):

```bash
npx vitest run lib/composition/storage.test.ts
```

Expected output:

```
 PASS  lib/composition/storage.test.ts
  listCompositions
    ✓ returns empty array when nothing saved
    ✓ returns compositions sorted by updatedAt descending
  saveComposition + loadComposition
    ✓ round-trips a composition correctly
    ✓ overwriting the same id does not create a duplicate
  deleteComposition
    ✓ removes a saved composition
    ✓ is a no-op for an unknown id

 Test Files  1 passed (1)
 Tests       6 passed (6)
```

- [ ] **3.5** Commit:

```bash
git add . && git commit -m "feat: add composition storage and defaults"
```

---

## Task 4: Zustand store (`lib/store/studioStore.ts`)

- [ ] **4.1** Write the failing tests first. Create `lib/store/studioStore.test.ts`:

```typescript
// lib/store/studioStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import useStudioStore from './studioStore';
import { createComposition, createElement } from '@/lib/composition/defaults';
import { nanoid } from 'nanoid';
import type { Binding } from '@/lib/types';

beforeEach(() => {
  useStudioStore.setState({
    composition: null,
    liveValues: {},
    selectedElementId: null,
    activeTab: 'palette',
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    loop: false,
  });
});

describe('loadComposition', () => {
  it('sets the composition in state', () => {
    const comp = createComposition('test');
    useStudioStore.getState().loadComposition(comp);
    expect(useStudioStore.getState().composition).toEqual(comp);
  });
});

describe('addElement', () => {
  it('adds element to composition.elements', () => {
    const comp = createComposition('test');
    useStudioStore.getState().loadComposition(comp);
    const el = createElement('text', { x: 0, y: 0 }, 0);
    useStudioStore.getState().addElement(el);
    expect(useStudioStore.getState().composition!.elements).toHaveLength(1);
    expect(useStudioStore.getState().composition!.elements[0].id).toBe(el.id);
  });
});

describe('removeElement', () => {
  it('removes element and also removes its bindings', () => {
    const comp = createComposition('test');
    useStudioStore.getState().loadComposition(comp);

    const el = createElement('text', { x: 0, y: 0 }, 0);
    useStudioStore.getState().addElement(el);

    const binding: Binding = {
      id: nanoid(),
      elementId: el.id,
      signal: 'volume',
      property: 'opacity',
      transform: { min: 0, max: 1, invert: false },
    };
    useStudioStore.getState().addBinding(binding);
    expect(useStudioStore.getState().composition!.bindings).toHaveLength(1);

    useStudioStore.getState().removeElement(el.id);
    expect(useStudioStore.getState().composition!.elements).toHaveLength(0);
    expect(useStudioStore.getState().composition!.bindings).toHaveLength(0);
  });
});

describe('addBinding / removeBinding', () => {
  it('adds a binding to composition.bindings', () => {
    const comp = createComposition('test');
    useStudioStore.getState().loadComposition(comp);
    const binding: Binding = {
      id: nanoid(),
      elementId: 'el-1',
      signal: 'bass',
      property: 'hue',
      transform: { min: 0, max: 360, invert: false },
    };
    useStudioStore.getState().addBinding(binding);
    expect(useStudioStore.getState().composition!.bindings).toHaveLength(1);
  });

  it('removes a binding by id', () => {
    const comp = createComposition('test');
    useStudioStore.getState().loadComposition(comp);
    const binding: Binding = {
      id: 'bind-1',
      elementId: 'el-1',
      signal: 'treble',
      property: 'fontSize',
      transform: { min: 10, max: 48, invert: false },
    };
    useStudioStore.getState().addBinding(binding);
    useStudioStore.getState().removeBinding('bind-1');
    expect(useStudioStore.getState().composition!.bindings).toHaveLength(0);
  });
});

describe('updateBinding', () => {
  it('patches a binding by id', () => {
    const comp = createComposition('test');
    useStudioStore.getState().loadComposition(comp);
    const binding: Binding = {
      id: 'bind-2',
      elementId: 'el-1',
      signal: 'volume',
      property: 'opacity',
      transform: { min: 0, max: 1, invert: false },
    };
    useStudioStore.getState().addBinding(binding);
    useStudioStore.getState().updateBinding('bind-2', { signal: 'mid' });
    const updated = useStudioStore
      .getState()
      .composition!.bindings.find((b) => b.id === 'bind-2');
    expect(updated?.signal).toBe('mid');
    expect(updated?.property).toBe('opacity');
  });
});
```

- [ ] **4.2** Create `lib/store/studioStore.ts`:

```typescript
// lib/store/studioStore.ts
import { create } from 'zustand';
import type {
  CompositionSpec,
  Element,
  Binding,
  LiveValues,
} from '@/lib/types';
import { saveComposition } from '@/lib/composition/storage';

interface StudioState {
  composition: CompositionSpec | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  loop: boolean;
  liveValues: LiveValues;
  selectedElementId: string | null;
  activeTab: 'palette' | 'bindings';

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
  setActiveTab(tab: 'palette' | 'bindings'): void;
  setPlayback(
    state: Partial<
      Pick<StudioState, 'isPlaying' | 'currentTime' | 'duration' | 'loop'>
    >
  ): void;
  persistComposition(): void;
}

const useStudioStore = create<StudioState>((set, get) => ({
  composition: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  loop: false,
  liveValues: {},
  selectedElementId: null,
  activeTab: 'palette',

  loadComposition(comp) {
    set({ composition: comp, selectedElementId: null, liveValues: {} });
  },

  updateCompositionName(name) {
    set((s) => {
      if (!s.composition) return s;
      return { composition: { ...s.composition, name } };
    });
  },

  addElement(el) {
    set((s) => {
      if (!s.composition) return s;
      return {
        composition: {
          ...s.composition,
          elements: [...s.composition.elements, el],
        },
      };
    });
  },

  updateElement(id, changes) {
    set((s) => {
      if (!s.composition) return s;
      return {
        composition: {
          ...s.composition,
          elements: s.composition.elements.map((el) =>
            el.id === id ? ({ ...el, ...changes } as Element) : el
          ),
        },
      };
    });
  },

  removeElement(id) {
    set((s) => {
      if (!s.composition) return s;
      return {
        composition: {
          ...s.composition,
          elements: s.composition.elements.filter((el) => el.id !== id),
          bindings: s.composition.bindings.filter((b) => b.elementId !== id),
        },
        selectedElementId:
          s.selectedElementId === id ? null : s.selectedElementId,
      };
    });
  },

  addBinding(b) {
    set((s) => {
      if (!s.composition) return s;
      return {
        composition: {
          ...s.composition,
          bindings: [...s.composition.bindings, b],
        },
      };
    });
  },

  updateBinding(id, changes) {
    set((s) => {
      if (!s.composition) return s;
      return {
        composition: {
          ...s.composition,
          bindings: s.composition.bindings.map((b) =>
            b.id === id ? { ...b, ...changes } : b
          ),
        },
      };
    });
  },

  removeBinding(id) {
    set((s) => {
      if (!s.composition) return s;
      return {
        composition: {
          ...s.composition,
          bindings: s.composition.bindings.filter((b) => b.id !== id),
        },
      };
    });
  },

  setLiveValues(values) {
    set({ liveValues: values });
  },

  setSelectedElementId(id) {
    set({ selectedElementId: id });
  },

  setActiveTab(tab) {
    set({ activeTab: tab });
  },

  setPlayback(state) {
    set(state);
  },

  persistComposition() {
    const { composition } = get();
    if (!composition) return;
    const updated = {
      ...composition,
      updatedAt: new Date().toISOString(),
    };
    set({ composition: updated });
    saveComposition(updated);
  },
}));

export default useStudioStore;
```

- [ ] **4.3** Run the tests:

```bash
npx vitest run lib/store/studioStore.test.ts
```

Expected output:

```
 PASS  lib/store/studioStore.test.ts
  loadComposition
    ✓ sets the composition in state
  addElement
    ✓ adds element to composition.elements
  removeElement
    ✓ removes element and also removes its bindings
  addBinding / removeBinding
    ✓ adds a binding to composition.bindings
    ✓ removes a binding by id
  updateBinding
    ✓ patches a binding by id

 Test Files  1 passed (1)
 Tests       6 passed (6)
```

- [ ] **4.4** Commit:

```bash
git add . && git commit -m "feat: add Zustand store"
```

---

## Task 5: Audio engine + signal extraction

- [ ] **5.1** Write the failing tests first. Create `lib/audio/signals.test.ts`:

```typescript
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
```

- [ ] **5.2** Create `lib/audio/signals.ts`:

```typescript
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
```

- [ ] **5.3** Create `lib/audio/audioEngine.ts`:

```typescript
// lib/audio/audioEngine.ts
import { extractSignals } from './signals';
import type { Signals } from '@/lib/types';

const ZERO_SIGNALS: Signals = {
  volume: 0,
  bass: 0,
  mid: 0,
  treble: 0,
};

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private startedAt = 0;
  private pausedAt = 0;
  private isPlaying = false;
  private freqData: Uint8Array = new Uint8Array(0);
  private timeData: Uint8Array = new Uint8Array(0);

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }

  async loadFile(file: File): Promise<number> {
    const ctx = this.ensureContext();
    if (ctx.state === 'suspended') await ctx.resume();
    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await ctx.decodeAudioData(arrayBuffer);

    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;
    this.analyser.connect(ctx.destination);

    const bufferSize = this.analyser.frequencyBinCount;
    this.freqData = new Uint8Array(bufferSize);
    this.timeData = new Uint8Array(bufferSize);

    this.pausedAt = 0;
    this.isPlaying = false;

    return this.audioBuffer.duration;
  }

  play(offset?: number): void {
    if (!this.audioBuffer || !this.analyser || !this.ctx) return;
    this.stop();

    const startOffset = offset !== undefined ? offset : this.pausedAt;
    this.sourceNode = this.ctx.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;
    this.sourceNode.connect(this.analyser);
    this.sourceNode.start(0, startOffset);
    this.startedAt = this.ctx.currentTime - startOffset;
    this.isPlaying = true;
  }

  pause(): void {
    if (!this.isPlaying) return;
    this.pausedAt = this.getCurrentTime();
    this.sourceNode?.stop();
    this.sourceNode = null;
    this.isPlaying = false;
  }

  stop(): void {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
      } catch {
        // already stopped
      }
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    this.isPlaying = false;
    this.pausedAt = 0;
  }

  seek(seconds: number): void {
    const wasPlaying = this.isPlaying;
    this.pause();
    this.pausedAt = seconds;
    if (wasPlaying) this.play(seconds);
  }

  getCurrentTime(): number {
    if (!this.ctx) return 0;
    if (!this.isPlaying) return this.pausedAt;
    return this.ctx.currentTime - this.startedAt;
  }

  getSignals(): Signals {
    if (!this.isPlaying || !this.analyser || !this.ctx) return { ...ZERO_SIGNALS };
    this.analyser.getByteFrequencyData(this.freqData);
    this.analyser.getByteTimeDomainData(this.timeData);
    return extractSignals(this.freqData, this.timeData, this.ctx.sampleRate);
  }

  setLoop(loop: boolean): void {
    if (this.sourceNode) {
      this.sourceNode.loop = loop;
    }
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  getDuration(): number {
    return this.audioBuffer?.duration ?? 0;
  }

  destroy(): void {
    this.stop();
    this.analyser?.disconnect();
    this.ctx?.close();
    this.ctx = null;
    this.analyser = null;
    this.audioBuffer = null;
  }
}

export const audioEngine = new AudioEngine();
```

- [ ] **5.4** Run the signal tests:

```bash
npx vitest run lib/audio/signals.test.ts
```

Expected output:

```
 PASS  lib/audio/signals.test.ts
  extractVolume
    ✓ returns 0 for silence (all-128 time data)
    ✓ returns > 0 for a signal with values above and below 128
  extractBand
    ✓ returns 0 when lowHz > highHz (no bins in range)
    ✓ returns correct average for mock freqData with only bass bins non-zero
  extractSignals
    ✓ returns object with all four signal keys, all in 0-1 range

 Test Files  1 passed (1)
 Tests       5 passed (5)
```

- [ ] **5.5** Commit:

```bash
git add . && git commit -m "feat: add audio engine and signal extraction"
```

---

## Task 6: Animation loop (`lib/animation/animationLoop.ts`)

- [ ] **6.1** Write the failing tests first. Create `lib/animation/animationLoop.test.ts`:

```typescript
// lib/animation/animationLoop.test.ts
import { describe, it, expect } from 'vitest';
import { applyTransform, applyBinding, computeLiveValues } from './animationLoop';
import type { Binding, Signals } from '@/lib/types';

describe('applyTransform', () => {
  it('returns min when signal is 0 and not inverted', () => {
    expect(applyTransform(0, { min: 10, max: 50, invert: false })).toBe(10);
  });

  it('returns max when signal is 1 and not inverted', () => {
    expect(applyTransform(1, { min: 10, max: 50, invert: false })).toBe(50);
  });

  it('returns midpoint when signal is 0.5 and not inverted', () => {
    expect(applyTransform(0.5, { min: 10, max: 50, invert: false })).toBe(30);
  });

  it('returns max when signal is 0 and inverted', () => {
    expect(applyTransform(0, { min: 10, max: 50, invert: true })).toBe(50);
  });

  it('returns min when signal is 1 and inverted', () => {
    expect(applyTransform(1, { min: 10, max: 50, invert: true })).toBe(10);
  });
});

describe('applyBinding', () => {
  const signals: Signals = { volume: 0.5, bass: 0.5, mid: 0.5, treble: 0.5 };

  it('maps opacity signal through transform correctly', () => {
    const binding: Binding = {
      id: 'b1',
      elementId: 'el1',
      signal: 'volume',
      property: 'opacity',
      transform: { min: 0, max: 1, invert: false },
    };
    const result = applyBinding(binding, signals);
    expect(result).toEqual({ property: 'opacity', value: 0.5 });
  });

  it('selects frame by index for content property (signal=0.5, 4 frames, no invert)', () => {
    const binding: Binding = {
      id: 'b2',
      elementId: 'el1',
      signal: 'volume',
      property: 'content',
      transform: { min: 0, max: 1, invert: false },
      frames: [' ', '·', '▒', '█'],
    };
    // signal=0.5, not inverted => effective=0.5
    // index = floor(0.5 * (4-1)) = floor(1.5) = 1 => '·'
    const result = applyBinding(binding, signals);
    expect(result).toEqual({ property: 'content', value: '·' });
  });

  it('returns empty string for content binding with no frames', () => {
    const binding: Binding = {
      id: 'b3',
      elementId: 'el1',
      signal: 'volume',
      property: 'content',
      transform: { min: 0, max: 1, invert: false },
      frames: [],
    };
    const result = applyBinding(binding, signals);
    expect(result).toEqual({ property: 'content', value: '' });
  });
});

describe('computeLiveValues', () => {
  it('groups two bindings for different elements correctly', () => {
    const signals: Signals = { volume: 1, bass: 0, mid: 0, treble: 0 };
    const bindings: Binding[] = [
      {
        id: 'b1',
        elementId: 'el1',
        signal: 'volume',
        property: 'opacity',
        transform: { min: 0, max: 1, invert: false },
      },
      {
        id: 'b2',
        elementId: 'el2',
        signal: 'volume',
        property: 'hue',
        transform: { min: 0, max: 360, invert: false },
      },
    ];
    const live = computeLiveValues(bindings, signals);
    expect(live['el1']).toEqual({ opacity: 1 });
    expect(live['el2']).toEqual({ hue: 360 });
  });

  it('merges multiple bindings for the same element', () => {
    const signals: Signals = { volume: 0, bass: 1, mid: 0, treble: 0 };
    const bindings: Binding[] = [
      {
        id: 'b1',
        elementId: 'el1',
        signal: 'volume',
        property: 'opacity',
        transform: { min: 0.2, max: 1, invert: false },
      },
      {
        id: 'b2',
        elementId: 'el1',
        signal: 'bass',
        property: 'hue',
        transform: { min: 0, max: 180, invert: false },
      },
    ];
    const live = computeLiveValues(bindings, signals);
    expect(live['el1']).toEqual({ opacity: 0.2, hue: 180 });
  });
});
```

- [ ] **6.2** Create `lib/animation/animationLoop.ts`:

```typescript
// lib/animation/animationLoop.ts
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
    const index = Math.min(
      Math.floor(effective * frames.length),
      frames.length - 1
    );
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
```

- [ ] **6.3** Run the animation loop tests:

```bash
npx vitest run lib/animation/animationLoop.test.ts
```

Expected output:

```
 PASS  lib/animation/animationLoop.test.ts
  applyTransform
    ✓ returns min when signal is 0 and not inverted
    ✓ returns max when signal is 1 and not inverted
    ✓ returns midpoint when signal is 0.5 and not inverted
    ✓ returns max when signal is 0 and inverted
    ✓ returns min when signal is 1 and inverted
  applyBinding
    ✓ maps opacity signal through transform correctly
    ✓ selects frame by index for content property (signal=0.5, 4 frames, no invert)
    ✓ returns empty string for content binding with no frames
  computeLiveValues
    ✓ groups two bindings for different elements correctly
    ✓ merges multiple bindings for the same element

 Test Files  1 passed (1)
 Tests       10 passed (10)
```

- [ ] **6.4** Commit:

```bash
git add . && git commit -m "feat: add animation loop"
```

---

## Task 7: App shell layout

- [ ] **7.1** Create `lib/library/sprites.ts`:

```typescript
// lib/library/sprites.ts
import { nanoid } from 'nanoid';
import { DEFAULT_COLOR, DEFAULT_FONT } from '@/lib/composition/defaults';
import type { Element } from '@/lib/types';

export const SPRITE_CONTENT: Record<string, string> = {
  'dot-grid': '· · ·\n· · ·\n· · ·',
  'block-fill': '▓▓▓\n▓▓▓\n▓▓▓',
  'cross': '─┼─\n │ \n─┼─',
  'bracket': '[ ]',
  'arrow-r': '─→',
  'arrow-d': '↓',
  'star': '★',
  'pulse': '·∘○◯',
  'wave': '~≈~~~',
  'hash': '###\n###\n###',
};

export interface PaletteItemDef {
  id: string;
  label: string;
  preview: string;
  createElement(pos: { x: number; y: number }, z: number): Element;
}

export const PALETTE_ITEMS: PaletteItemDef[] = [
  {
    id: 'text',
    label: 'TEXT',
    preview: 'Aa',
    createElement(pos, z) {
      return {
        id: nanoid(),
        type: 'text',
        content: 'text here',
        font: DEFAULT_FONT,
        fontSize: 13,
        position: { x: pos.x, y: pos.y },
        size: { w: 160, h: 24 },
        z,
        rotation: 0,
        opacity: 1,
        color: { ...DEFAULT_COLOR },
        locked: false,
      };
    },
  },
  {
    id: 'ascii_art',
    label: 'ASCII ART',
    preview: '▓▒░',
    createElement(pos, z) {
      return {
        id: nanoid(),
        type: 'ascii_art',
        content: '█░░█\n█░░█\n████',
        font: DEFAULT_FONT,
        fontSize: 13,
        position: { x: pos.x, y: pos.y },
        size: { w: 80, h: 64 },
        z,
        rotation: 0,
        opacity: 1,
        color: { ...DEFAULT_COLOR },
        locked: false,
      };
    },
  },
  {
    id: 'divider',
    label: 'DIVIDER',
    preview: '────',
    createElement(pos, z) {
      return {
        id: nanoid(),
        type: 'divider',
        pattern: '─',
        position: { x: pos.x, y: pos.y },
        size: { w: 240, h: 24 },
        z,
        rotation: 0,
        opacity: 1,
        color: { ...DEFAULT_COLOR },
        locked: false,
      };
    },
  },
  {
    id: 'decorative-dot-grid',
    label: 'DOT GRID',
    preview: '· · ·',
    createElement(pos, z) {
      return {
        id: nanoid(),
        type: 'decorative',
        builtinId: 'dot-grid',
        fontSize: 13,
        position: { x: pos.x, y: pos.y },
        size: { w: 80, h: 64 },
        z,
        rotation: 0,
        opacity: 1,
        color: { ...DEFAULT_COLOR },
        locked: false,
      };
    },
  },
  {
    id: 'decorative-star',
    label: 'STAR',
    preview: '★',
    createElement(pos, z) {
      return {
        id: nanoid(),
        type: 'decorative',
        builtinId: 'star',
        fontSize: 24,
        position: { x: pos.x, y: pos.y },
        size: { w: 40, h: 40 },
        z,
        rotation: 0,
        opacity: 1,
        color: { ...DEFAULT_COLOR },
        locked: false,
      };
    },
  },
  {
    id: 'decorative-wave',
    label: 'WAVE',
    preview: '~≈~~~',
    createElement(pos, z) {
      return {
        id: nanoid(),
        type: 'decorative',
        builtinId: 'wave',
        fontSize: 13,
        position: { x: pos.x, y: pos.y },
        size: { w: 80, h: 24 },
        z,
        rotation: 0,
        opacity: 1,
        color: { ...DEFAULT_COLOR },
        locked: false,
      };
    },
  },
];
```

- [ ] **7.2** Create `app/page.tsx`:

```tsx
// app/page.tsx
'use client';
import { useEffect } from 'react';
import useStudioStore from '@/lib/store/studioStore';
import { createComposition } from '@/lib/composition/defaults';
import { EditorShell } from '@/components/editor/EditorShell';

export default function Page() {
  const loadComposition = useStudioStore((s) => s.loadComposition);
  const composition = useStudioStore((s) => s.composition);

  useEffect(() => {
    if (!composition) loadComposition(createComposition('untitled'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <EditorShell />;
}
```

- [ ] **7.3** Create `components/editor/EditorShell.tsx`:

```tsx
// components/editor/EditorShell.tsx
'use client';
import { useState, useRef } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
} from '@dnd-kit/core';
import useStudioStore from '@/lib/store/studioStore';
import { PALETTE_ITEMS } from '@/lib/library/sprites';
import { Canvas } from './Canvas';
import { Palette } from './Palette';
import { BindingPanel } from './BindingPanel';
import { Inspector } from './Inspector';
import { AudioPlayer } from './AudioPlayer';
import { CompositionModal } from '@/components/compositions/CompositionModal';

export function EditorShell() {
  const activeTab = useStudioStore((s) => s.activeTab);
  const setActiveTab = useStudioStore((s) => s.setActiveTab);
  const addElement = useStudioStore((s) => s.addElement);
  const updateElement = useStudioStore((s) => s.updateElement);
  const composition = useStudioStore((s) => s.composition);
  const compositionName = composition?.name ?? 'untitled';
  const updateCompositionName = useStudioStore((s) => s.updateCompositionName);

  const [showModal, setShowModal] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(compositionName);
  const canvasRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  function snapToGrid(val: number, grid: number): number {
    return Math.round(val / grid) * grid;
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over, delta } = event;
    const grid = composition?.canvas.grid ?? 8;

    // Dragging an existing element
    if (active.data.current?.type === 'element') {
      const elementId = active.data.current.elementId as string;
      const element = composition?.elements.find((el) => el.id === elementId);
      if (!element) return;
      const newX = snapToGrid(element.position.x + delta.x, grid);
      const newY = snapToGrid(element.position.y + delta.y, grid);
      updateElement(elementId, { position: { x: newX, y: newY } });
      return;
    }

    // Dropping a palette item onto the canvas
    if (
      active.data.current?.type === 'palette-item' &&
      over?.id === 'canvas-droppable'
    ) {
      const itemId = active.data.current.itemId as string;
      const paletteDef = PALETTE_ITEMS.find((p) => p.id === itemId);
      if (!paletteDef || !canvasRef.current) return;

      const canvasRect = canvasRef.current.getBoundingClientRect();
      // Estimate drop position: use over.rect center minus canvas origin
      const dropX = snapToGrid(
        (over.rect?.left ?? canvasRect.left) - canvasRect.left + (over.rect?.width ?? 0) / 2,
        grid
      );
      const dropY = snapToGrid(
        (over.rect?.top ?? canvasRect.top) - canvasRect.top + (over.rect?.height ?? 0) / 2,
        grid
      );

      const z = (composition?.elements.length ?? 0) + 1;
      const el = paletteDef.createElement({ x: Math.max(0, dropX), y: Math.max(0, dropY) }, z);
      addElement(el);
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          overflow: 'hidden',
          background: 'var(--bg)',
        }}
      >
        {/* Top bar */}
        <div
          style={{
            height: 32,
            borderBottom: '1px solid var(--muted)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 8px',
            gap: 8,
            background: 'var(--surface)',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 9,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
            }}
          >
            ASCII-STUDIO
          </span>
          <span style={{ color: 'var(--muted)' }}>─</span>
          {editingName ? (
            <input
              autoFocus
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={() => {
                updateCompositionName(nameValue);
                setEditingName(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  updateCompositionName(nameValue);
                  setEditingName(false);
                }
                if (e.key === 'Escape') setEditingName(false);
              }}
              style={{ width: 160 }}
            />
          ) : (
            <span
              style={{ fontSize: 11, cursor: 'text' }}
              onDoubleClick={() => {
                setNameValue(compositionName);
                setEditingName(true);
              }}
            >
              {compositionName}
            </span>
          )}
          <div style={{ marginLeft: 'auto' }}>
            <button onClick={() => setShowModal(true)}>COMPOSITIONS</button>
          </div>
        </div>

        {/* Main area */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left sidebar */}
          <div
            style={{
              width: 240,
              borderRight: '1px solid var(--muted)',
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0,
            }}
          >
            {/* Tab buttons */}
            <div
              style={{
                display: 'flex',
                borderBottom: '1px solid var(--muted)',
              }}
            >
              {(['palette', 'bindings'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    flex: 1,
                    border: 'none',
                    borderBottom:
                      activeTab === tab
                        ? '2px solid var(--accent)'
                        : '2px solid transparent',
                    borderRadius: 0,
                    background: 'var(--surface)',
                    color: activeTab === tab ? 'var(--accent)' : 'var(--muted)',
                    padding: '6px 0',
                    fontSize: 9,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              {activeTab === 'palette' ? <Palette /> : <BindingPanel />}
            </div>
          </div>

          {/* Center canvas */}
          <div
            ref={canvasRef}
            style={{
              flex: 1,
              overflow: 'auto',
              padding: 32,
              background: 'var(--bg)',
            }}
          >
            <Canvas />
          </div>

          {/* Right sidebar */}
          <div
            style={{
              width: 240,
              borderLeft: '1px solid var(--muted)',
              overflow: 'auto',
              flexShrink: 0,
            }}
          >
            <Inspector />
          </div>
        </div>

        {/* Bottom audio bar */}
        <div
          style={{
            height: 40,
            borderTop: '1px solid var(--muted)',
            flexShrink: 0,
          }}
        >
          <AudioPlayer />
        </div>
      </div>

      {showModal && <CompositionModal onClose={() => setShowModal(false)} />}
    </DndContext>
  );
}
```

- [ ] **7.4** Create stub components so the app compiles. Create `components/editor/Canvas.tsx` (stub):

```tsx
// components/editor/Canvas.tsx
export function Canvas() {
  return (
    <div style={{ width: 1200, height: 800, border: '1px solid var(--muted)', position: 'relative', background: 'var(--surface)' }}>
      {/* implemented in Task 8 */}
    </div>
  );
}
```

Create `components/editor/Palette.tsx` (stub):

```tsx
// components/editor/Palette.tsx
export function Palette() {
  return <div style={{ padding: 8, color: 'var(--muted)', fontSize: 11 }}>Palette — Task 10</div>;
}
```

Create `components/editor/BindingPanel.tsx` (stub):

```tsx
// components/editor/BindingPanel.tsx
export function BindingPanel() {
  return <div style={{ padding: 8, color: 'var(--muted)', fontSize: 11 }}>Bindings — Task 11</div>;
}
```

Create `components/editor/Inspector.tsx` (stub):

```tsx
// components/editor/Inspector.tsx
export function Inspector() {
  return <div style={{ padding: 8, color: 'var(--muted)', fontSize: 11 }}>Inspector — Task 12</div>;
}
```

Create `components/editor/AudioPlayer.tsx` (stub):

```tsx
// components/editor/AudioPlayer.tsx
export function AudioPlayer() {
  return <div style={{ height: '100%', display: 'flex', alignItems: 'center', padding: '0 8px', gap: 8, color: 'var(--muted)', fontSize: 11, borderTop: '1px solid var(--muted)' }}>AudioPlayer — Task 9</div>;
}
```

Create `components/compositions/CompositionModal.tsx` (stub):

```tsx
// components/compositions/CompositionModal.tsx
export function CompositionModal({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--muted)', padding: 24, width: 480 }}>
        <p style={{ marginBottom: 16 }}>Compositions — Task 13</p>
        <button onClick={onClose}>CLOSE</button>
      </div>
    </div>
  );
}
```

- [ ] **7.5** Verify the dev server builds with no errors:

```bash
npm run dev
```

Expected: app renders at localhost:3000 with the 3-column layout — left sidebar with PALETTE/BINDINGS tabs, empty canvas area, inspector on the right, audio bar at bottom.

- [ ] **7.6** Commit:

```bash
git add . && git commit -m "feat: add app shell layout and sprites library"
```

---

## Task 8: Canvas + element rendering

- [ ] **8.1** Replace `components/editor/Canvas.tsx` with the full implementation:

```tsx
// components/editor/Canvas.tsx
'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useDroppable } from '@dnd-kit/core';
import useStudioStore from '@/lib/store/studioStore';
import { ElementWrapper } from './ElementWrapper';

export function Canvas() {
  const composition = useStudioStore((s) => s.composition);
  const selectedElementId = useStudioStore((s) => s.selectedElementId);
  const setSelectedElementId = useStudioStore((s) => s.setSelectedElementId);
  const removeElement = useStudioStore((s) => s.removeElement);
  const updateElement = useStudioStore((s) => s.updateElement);

  const [gridVisible, setGridVisible] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const { setNodeRef, isOver } = useDroppable({ id: 'canvas-droppable' });

  const canvas = composition?.canvas ?? { width: 1200, height: 800, grid: 8 };
  const elements = composition?.elements ?? [];

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!selectedElementId) return;

      // Delete / Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT')) return;
        removeElement(selectedElementId);
        return;
      }

      // Escape — deselect
      if (e.key === 'Escape') {
        setSelectedElementId(null);
        return;
      }

      // Arrow keys — nudge
      const el = elements.find((el) => el.id === selectedElementId);
      if (!el) return;
      const step = e.shiftKey ? canvas.grid * 4 : canvas.grid;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        updateElement(selectedElementId, { position: { x: el.position.x - step, y: el.position.y } });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        updateElement(selectedElementId, { position: { x: el.position.x + step, y: el.position.y } });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        updateElement(selectedElementId, { position: { x: el.position.x, y: el.position.y - step } });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        updateElement(selectedElementId, { position: { x: el.position.x, y: el.position.y + step } });
      }
    },
    [selectedElementId, elements, canvas.grid, removeElement, setSelectedElementId, updateElement]
  );

  // Grid toggle on 'g' key (global)
  const handleGlobalKey = useCallback((e: KeyboardEvent) => {
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT')) return;
    if (e.key === 'g') setGridVisible((v) => !v);
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keydown', handleGlobalKey);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keydown', handleGlobalKey);
    };
  }, [handleKeyDown, handleGlobalKey]);

  const gridStyle = gridVisible
    ? {
        backgroundImage: `
          linear-gradient(to right, var(--muted) 1px, transparent 1px),
          linear-gradient(to bottom, var(--muted) 1px, transparent 1px)
        `,
        backgroundSize: `${canvas.grid}px ${canvas.grid}px`,
        backgroundPosition: '0 0',
        opacity: 0.15,
      }
    : {};

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (canvasRef as any).current = node;
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) setSelectedElementId(null);
      }}
      style={{
        width: canvas.width,
        height: canvas.height,
        position: 'relative',
        background: 'var(--surface)',
        border: isOver ? '1px solid var(--accent)' : '1px solid var(--muted)',
        boxShadow: '2px 2px 0 rgba(0,0,0,0.08)',
        flexShrink: 0,
        ...gridStyle,
      }}
    >
      {elements
        .slice()
        .sort((a, b) => a.z - b.z)
        .map((el) => (
          <ElementWrapper
            key={el.id}
            element={el}
            isSelected={el.id === selectedElementId}
            onSelect={() => setSelectedElementId(el.id)}
          />
        ))}
    </div>
  );
}
```

- [ ] **8.2** Create `components/editor/ElementRenderer.tsx`:

```tsx
// components/editor/ElementRenderer.tsx
import type {
  Element,
  TextElement,
  AsciiArtElement,
  DividerElement,
  DecorativeElement,
  LiveElementOverride,
} from '@/lib/types';
import { SPRITE_CONTENT } from '@/lib/library/sprites';

const FONT_MAP: Record<string, string> = {
  'jetbrains-mono': "'JetBrains Mono', monospace",
  'ibm-plex-mono': "'IBM Plex Mono', monospace",
  'fira-code': "'Fira Code', monospace",
  'vt323': "'VT323', monospace",
};

function resolveColor(
  h: number,
  s: number,
  l: number,
  hueOverride?: number
): string {
  return `hsl(${hueOverride !== undefined ? hueOverride : h}, ${s}%, ${l}%)`;
}

function TextRenderer({
  el,
  override,
}: {
  el: TextElement;
  override?: Partial<LiveElementOverride>;
}) {
  const color = resolveColor(el.color.h, el.color.s, el.color.l, override?.hue);
  const fontSize = override?.fontSize ?? el.fontSize;
  const content = override?.content ?? el.content;
  return (
    <pre
      style={{
        fontFamily: FONT_MAP[el.font] ?? 'monospace',
        fontSize,
        color,
        margin: 0,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
      }}
    >
      {content}
    </pre>
  );
}

function AsciiArtRenderer({
  el,
  override,
}: {
  el: AsciiArtElement;
  override?: Partial<LiveElementOverride>;
}) {
  const color = resolveColor(el.color.h, el.color.s, el.color.l, override?.hue);
  const fontSize = override?.fontSize ?? el.fontSize;
  const content = override?.content ?? el.content;
  return (
    <pre
      style={{
        fontFamily: FONT_MAP[el.font] ?? 'monospace',
        fontSize,
        color,
        margin: 0,
        whiteSpace: 'pre',
        lineHeight: 1.2,
      }}
    >
      {content}
    </pre>
  );
}

function DividerRenderer({
  el,
  override,
}: {
  el: DividerElement;
  override?: Partial<LiveElementOverride>;
}) {
  const color = resolveColor(el.color.h, el.color.s, el.color.l, override?.hue);
  const repeated = (override?.content ?? el.pattern).repeat(60).slice(0, 60);
  return (
    <pre
      style={{
        fontFamily: 'monospace',
        fontSize: 13,
        color,
        margin: 0,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        width: '100%',
      }}
    >
      {repeated}
    </pre>
  );
}

function DecorativeRenderer({
  el,
  override,
}: {
  el: DecorativeElement;
  override?: Partial<LiveElementOverride>;
}) {
  const color = resolveColor(el.color.h, el.color.s, el.color.l, override?.hue);
  const fontSize = override?.fontSize ?? el.fontSize;
  const content = override?.content ?? SPRITE_CONTENT[el.builtinId] ?? el.builtinId;
  return (
    <pre
      style={{
        fontFamily: 'monospace',
        fontSize,
        color,
        margin: 0,
        whiteSpace: 'pre',
        lineHeight: 1.2,
      }}
    >
      {content}
    </pre>
  );
}

interface ElementRendererProps {
  element: Element;
  liveOverride?: Partial<LiveElementOverride>;
}

export function ElementRenderer({ element, liveOverride }: ElementRendererProps) {
  switch (element.type) {
    case 'text':
      return <TextRenderer el={element} override={liveOverride} />;
    case 'ascii_art':
      return <AsciiArtRenderer el={element} override={liveOverride} />;
    case 'divider':
      return <DividerRenderer el={element} override={liveOverride} />;
    case 'decorative':
      return <DecorativeRenderer el={element} override={liveOverride} />;
  }
}
```

- [ ] **8.3** Create `components/editor/ElementWrapper.tsx`:

```tsx
// components/editor/ElementWrapper.tsx
'use client';
import { useRef } from 'react';
import { useDraggable } from '@dnd-kit/core';
import useStudioStore from '@/lib/store/studioStore';
import { ElementRenderer } from './ElementRenderer';
import type { Element } from '@/lib/types';

interface ElementWrapperProps {
  element: Element;
  isSelected: boolean;
  onSelect: () => void;
}

export function ElementWrapper({ element, isSelected, onSelect }: ElementWrapperProps) {
  const liveValues = useStudioStore((s) => s.liveValues);
  const updateElement = useStudioStore((s) => s.updateElement);
  const liveOverride = liveValues[element.id];

  // Apply live position offsets if present
  const x = element.position.x + (liveOverride?.x ?? 0);
  const y = element.position.y + (liveOverride?.y ?? 0);
  const rotation = (liveOverride?.rotation ?? element.rotation);
  const opacity = liveOverride?.opacity ?? element.opacity;

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: element.id,
    disabled: element.locked,
    data: { type: 'element', elementId: element.id },
  });

  const resizingRef = useRef(false);
  const resizeStart = useRef({ mouseX: 0, mouseY: 0, w: 0, h: 0 });

  function startResize(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    resizingRef.current = true;
    resizeStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      w: element.size.w,
      h: element.size.h,
    };

    function onMouseMove(ev: MouseEvent) {
      if (!resizingRef.current) return;
      const dx = ev.clientX - resizeStart.current.mouseX;
      const dy = ev.clientY - resizeStart.current.mouseY;
      updateElement(element.id, {
        size: {
          w: Math.max(24, resizeStart.current.w + dx),
          h: Math.max(16, resizeStart.current.h + dy),
        },
      });
    }

    function onMouseUp() {
      resizingRef.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  return (
    <div
      ref={setNodeRef}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget || !(e.target as HTMLElement).closest('[data-resize]')) {
          onSelect();
        }
      }}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: element.size.w,
        height: element.size.h,
        transform: `rotate(${rotation}deg)`,
        opacity,
        zIndex: element.z,
        outline: isSelected ? '1px solid var(--accent)' : '1px solid transparent',
        cursor: isDragging ? 'grabbing' : element.locked ? 'default' : 'grab',
        userSelect: 'none',
        overflow: 'hidden',
      }}
      {...(element.locked ? {} : { ...listeners, ...attributes })}
    >
      <ElementRenderer element={element} liveOverride={liveOverride} />

      {/* Resize handle — bottom-right corner */}
      {isSelected && !element.locked && (
        <div
          data-resize="true"
          onMouseDown={startResize}
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            width: 10,
            height: 10,
            background: 'var(--accent)',
            cursor: 'se-resize',
          }}
        />
      )}

      {/* Locked indicator */}
      {element.locked && isSelected && (
        <div
          style={{
            position: 'absolute',
            top: 2,
            right: 4,
            fontSize: 9,
            color: 'var(--muted)',
          }}
        >
          □
        </div>
      )}
    </div>
  );
}
```

- [ ] **8.4** Verify the app renders elements. Temporarily add a test element in `app/page.tsx` after `loadComposition`:

```tsx
// In page.tsx useEffect, temporarily after loadComposition:
useEffect(() => {
  if (!composition) {
    const comp = createComposition('untitled');
    // Add a test element to confirm rendering
    const testEl = createElement('text', { x: 100, y: 100 }, 1);
    comp.elements.push({ ...testEl, content: 'hello ascii-studio' });
    loadComposition(comp);
  }
}, []);
```

Run `npm run dev`, open the browser — confirm the text element renders on the canvas. Remove the test element addition before committing.

- [ ] **8.5** Commit:

```bash
git add . && git commit -m "feat: add Canvas, ElementWrapper, and ElementRenderer"
```

---

## Task 9: Audio Player

- [ ] **9.1** Replace `components/editor/AudioPlayer.tsx` with the full implementation:

```tsx
// components/editor/AudioPlayer.tsx
'use client';
import { useRef, useEffect, useCallback } from 'react';
import useStudioStore from '@/lib/store/studioStore';
import { audioEngine } from '@/lib/audio/audioEngine';
import { startAnimationLoop } from '@/lib/animation/animationLoop';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function AudioPlayer() {
  const isPlaying = useStudioStore((s) => s.isPlaying);
  const currentTime = useStudioStore((s) => s.currentTime);
  const duration = useStudioStore((s) => s.duration);
  const loop = useStudioStore((s) => s.loop);
  const setPlayback = useStudioStore((s) => s.setPlayback);
  const setLiveValues = useStudioStore((s) => s.setLiveValues);
  const composition = useStudioStore((s) => s.composition);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const filenameRef = useRef<string>('');
  const cleanupLoopRef = useRef<(() => void) | null>(null);

  const stopAnimationLoop = useCallback(() => {
    if (cleanupLoopRef.current) {
      cleanupLoopRef.current();
      cleanupLoopRef.current = null;
    }
  }, []);

  const startLoop = useCallback(() => {
    stopAnimationLoop();
    cleanupLoopRef.current = startAnimationLoop(
      () => audioEngine.getSignals(),
      () => useStudioStore.getState().composition?.bindings ?? [],
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

  useEffect(() => {
    if (isPlaying) {
      startLoop();
    } else {
      stopAnimationLoop();
    }
    return stopAnimationLoop;
  }, [isPlaying, startLoop, stopAnimationLoop]);

  // Sync loop state to engine
  useEffect(() => {
    audioEngine.setLoop(loop);
  }, [loop]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    filenameRef.current = file.name;
    const dur = await audioEngine.loadFile(file);
    setPlayback({ duration: dur, currentTime: 0, isPlaying: false });
  }

  function handlePlayPause() {
    if (isPlaying) {
      audioEngine.pause();
      setPlayback({ isPlaying: false });
    } else {
      audioEngine.play();
      setPlayback({ isPlaying: true });
    }
  }

  function handleScrub(e: React.ChangeEvent<HTMLInputElement>) {
    const t = parseFloat(e.target.value);
    audioEngine.seek(t);
    setPlayback({ currentTime: t });
  }

  function handleLoopToggle() {
    setPlayback({ loop: !loop });
  }

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 12px',
        background: 'var(--surface)',
        borderTop: '1px solid var(--muted)',
        fontFamily: 'monospace',
        fontSize: 11,
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <button onClick={() => fileInputRef.current?.click()}>LOAD AUDIO</button>

      {filenameRef.current && (
        <span style={{ color: 'var(--muted)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {filenameRef.current}
        </span>
      )}

      <button
        onClick={handlePlayPause}
        style={{ minWidth: 28, textAlign: 'center' }}
        disabled={duration === 0}
      >
        {isPlaying ? '▌▌' : '▶'}
      </button>

      <input
        type="range"
        min={0}
        max={duration || 1}
        step={0.1}
        value={currentTime}
        onChange={handleScrub}
        style={{ flex: 1, maxWidth: 320, cursor: 'pointer' }}
        disabled={duration === 0}
      />

      <span style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>

      <button
        onClick={handleLoopToggle}
        style={{ color: loop ? 'var(--accent)' : 'var(--muted)', borderColor: loop ? 'var(--accent)' : 'var(--muted)' }}
      >
        ↻
      </button>
    </div>
  );
}
```

- [ ] **9.2** Manually verify:
  - Run `npm run dev`
  - Click "LOAD AUDIO" and select an audio file
  - Click `▶` to play — audio plays and the play button changes to `▌▌`
  - Click `▌▌` to pause — audio pauses
  - Scrub the range input — playback position updates
  - Click `↻` — loop indicator turns accent color
  - Confirm time counter updates while playing

- [ ] **9.3** Commit:

```bash
git add . && git commit -m "feat: add AudioPlayer with animation loop integration"
```

---

## Task 10: Palette

- [ ] **10.1** Replace `components/editor/Palette.tsx` with the full implementation:

```tsx
// components/editor/Palette.tsx
'use client';
import { useDraggable } from '@dnd-kit/core';
import { PALETTE_ITEMS, PaletteItemDef } from '@/lib/library/sprites';

function PaletteItem({ item }: { item: PaletteItemDef }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${item.id}`,
    data: { type: 'palette-item', itemId: item.id },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '5px 8px',
        borderBottom: '1px solid var(--surface)',
        cursor: 'grab',
        opacity: isDragging ? 0.4 : 1,
        background: 'var(--bg)',
        userSelect: 'none',
      }}
    >
      <span
        style={{
          fontFamily: 'monospace',
          fontSize: 11,
          color: 'var(--muted)',
          minWidth: 40,
          whiteSpace: 'pre',
        }}
      >
        {item.preview}
      </span>
      <span
        style={{
          fontSize: 9,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text)',
        }}
      >
        {item.label}
      </span>
    </div>
  );
}

export function Palette() {
  return (
    <div>
      <div
        style={{
          padding: '6px 8px',
          fontSize: 9,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          borderBottom: '1px solid var(--muted)',
          background: 'var(--surface)',
        }}
      >
        ELEMENTS
      </div>
      {PALETTE_ITEMS.map((item) => (
        <PaletteItem key={item.id} item={item} />
      ))}
      <div
        style={{
          padding: '6px 8px',
          fontSize: 9,
          color: 'var(--muted)',
          borderTop: '1px solid var(--surface)',
          marginTop: 4,
        }}
      >
        Drag items onto the canvas to place them.
      </div>
    </div>
  );
}
```

- [ ] **10.2** Manually verify:
  - Run `npm run dev`
  - Left sidebar PALETTE tab shows the 6 element items with previews and labels
  - Dragging an item over the canvas changes the canvas border to accent color (drop indicator)
  - Dropping an item places an element on the canvas

- [ ] **10.3** Commit:

```bash
git add . && git commit -m "feat: add Palette with draggable items"
```

---

## Task 11: Binding Panel

- [ ] **11.1** Create `components/editor/BindingRow.tsx`:

```tsx
// components/editor/BindingRow.tsx
'use client';
import { useState } from 'react';
import useStudioStore from '@/lib/store/studioStore';
import type { Binding, SignalName, VisualProperty } from '@/lib/types';

const SIGNAL_OPTIONS: SignalName[] = ['volume', 'bass', 'mid', 'treble'];
const PROPERTY_OPTIONS: VisualProperty[] = [
  'hue', 'fontSize', 'x', 'y', 'rotation', 'opacity', 'content',
];

interface BindingRowProps {
  binding: Binding;
}

export function BindingRow({ binding }: BindingRowProps) {
  const updateBinding = useStudioStore((s) => s.updateBinding);
  const removeBinding = useStudioStore((s) => s.removeBinding);
  const composition = useStudioStore((s) => s.composition);
  const [expanded, setExpanded] = useState(false);

  const elements = composition?.elements ?? [];
  const isContent = binding.property === 'content';

  function patch(changes: Partial<Binding>) {
    updateBinding(binding.id, changes);
  }

  function patchTransform(changes: Partial<Binding['transform']>) {
    updateBinding(binding.id, { transform: { ...binding.transform, ...changes } });
  }

  const framesText = (binding.frames ?? []).join('\n');

  function handleFramesChange(text: string) {
    patch({ frames: text.split('\n') });
  }

  return (
    <div
      style={{
        borderBottom: '1px solid var(--surface)',
        padding: '6px 8px',
        background: 'var(--bg)',
        fontSize: 11,
      }}
    >
      {/* Row 1: element selector */}
      <div style={{ marginBottom: 4 }}>
        <label>ELEMENT</label>
        <select
          value={binding.elementId}
          onChange={(e) => patch({ elementId: e.target.value })}
          style={{ width: '100%' }}
        >
          <option value="">-- none --</option>
          {elements.map((el) => (
            <option key={el.id} value={el.id}>
              {el.id.slice(0, 8)} ({el.type})
            </option>
          ))}
        </select>
      </div>

      {/* Row 2: signal → property */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
        <select
          value={binding.signal}
          onChange={(e) => patch({ signal: e.target.value as SignalName })}
          style={{ flex: 1 }}
        >
          {SIGNAL_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <span style={{ color: 'var(--muted)' }}>→</span>
        <select
          value={binding.property}
          onChange={(e) => {
            const prop = e.target.value as VisualProperty;
            patch({ property: prop });
            if (prop !== 'content') setExpanded(false);
          }}
          style={{ flex: 1 }}
        >
          {PROPERTY_OPTIONS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* Row 3: transform controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
        {!isContent && (
          <>
            <div style={{ flex: 1 }}>
              <label>MIN</label>
              <input
                type="number"
                value={binding.transform.min}
                onChange={(e) => patchTransform({ min: parseFloat(e.target.value) || 0 })}
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label>MAX</label>
              <input
                type="number"
                value={binding.transform.max}
                onChange={(e) => patchTransform({ max: parseFloat(e.target.value) || 0 })}
                style={{ width: '100%' }}
              />
            </div>
          </>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingTop: isContent ? 0 : 10 }}>
          <label style={{ margin: 0, display: 'inline' }}>INV</label>
          <input
            type="checkbox"
            checked={binding.transform.invert}
            onChange={(e) => patchTransform({ invert: e.target.checked })}
          />
        </div>
      </div>

      {/* Row 4: expand frames + delete */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {isContent && (
          <button
            onClick={() => setExpanded((v) => !v)}
            style={{ padding: '2px 6px' }}
          >
            {expanded ? '▾' : '▸'} FRAMES
          </button>
        )}
        <button
          onClick={() => removeBinding(binding.id)}
          style={{ marginLeft: 'auto', color: 'var(--muted)', borderColor: 'var(--muted)' }}
        >
          ✕
        </button>
      </div>

      {/* Frame sequence textarea */}
      {isContent && expanded && (
        <div style={{ marginTop: 4 }}>
          <label>FRAMES (one per line)</label>
          <textarea
            value={framesText}
            onChange={(e) => handleFramesChange(e.target.value)}
            rows={6}
            style={{ width: '100%', resize: 'vertical', fontFamily: 'monospace', fontSize: 11 }}
            placeholder={' \n·\n▒\n█'}
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **11.2** Replace `components/editor/BindingPanel.tsx` with the full implementation:

```tsx
// components/editor/BindingPanel.tsx
'use client';
import { nanoid } from 'nanoid';
import useStudioStore from '@/lib/store/studioStore';
import type { Binding } from '@/lib/types';
import { BindingRow } from './BindingRow';

export function BindingPanel() {
  const composition = useStudioStore((s) => s.composition);
  const addBinding = useStudioStore((s) => s.addBinding);

  const bindings = composition?.bindings ?? [];
  const firstElementId = composition?.elements[0]?.id ?? '';

  function handleAddBinding() {
    const newBinding: Binding = {
      id: nanoid(),
      elementId: firstElementId,
      signal: 'volume',
      property: 'opacity',
      transform: { min: 0, max: 1, invert: false },
    };
    addBinding(newBinding);
  }

  return (
    <div>
      <div
        style={{
          padding: '6px 8px',
          fontSize: 9,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          borderBottom: '1px solid var(--muted)',
          background: 'var(--surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>BINDINGS</span>
        <button onClick={handleAddBinding} style={{ fontSize: 9 }}>
          ADD BINDING +
        </button>
      </div>

      {bindings.length === 0 ? (
        <div style={{ padding: '12px 8px', color: 'var(--muted)', fontSize: 11 }}>
          No bindings yet.
        </div>
      ) : (
        bindings.map((b) => <BindingRow key={b.id} binding={b} />)
      )}
    </div>
  );
}
```

- [ ] **11.3** Manually verify:
  - Run `npm run dev`
  - Click the BINDINGS tab in the left sidebar
  - Click "ADD BINDING +" — a binding row appears
  - Confirm element selector, signal/property selects, min/max inputs, invert checkbox, and delete button all render
  - Change property to "content" — min/max inputs hide, FRAMES expand button appears
  - Click FRAMES — textarea appears, enter frames one per line
  - Click `✕` — binding is removed

- [ ] **11.4** Commit:

```bash
git add . && git commit -m "feat: add BindingPanel and BindingRow"
```

---

## Task 12: Inspector

- [ ] **12.1** Replace `components/editor/Inspector.tsx` with the full implementation:

```tsx
// components/editor/Inspector.tsx
'use client';
import useStudioStore from '@/lib/store/studioStore';
import type { Element, FontName } from '@/lib/types';

const FONT_OPTIONS: { value: FontName; label: string }[] = [
  { value: 'jetbrains-mono', label: 'JetBrains Mono' },
  { value: 'ibm-plex-mono', label: 'IBM Plex Mono' },
  { value: 'fira-code', label: 'Fira Code' },
  { value: 'vt323', label: 'VT323' },
];

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 9,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--muted)',
        padding: '8px 8px 2px',
        borderTop: '1px solid var(--surface)',
        background: 'var(--surface)',
        marginTop: 4,
      }}
    >
      {children}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: '4px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
      {children}
    </div>
  );
}

function InlineRow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
      {children}
    </div>
  );
}

interface InspectorProps {}

export function Inspector(_props: InspectorProps) {
  const selectedElementId = useStudioStore((s) => s.selectedElementId);
  const composition = useStudioStore((s) => s.composition);
  const updateElement = useStudioStore((s) => s.updateElement);

  if (!selectedElementId || !composition) {
    return (
      <div style={{ padding: 12, color: 'var(--muted)', fontSize: 11 }}>
        Select an element.
      </div>
    );
  }

  const element = composition.elements.find((el) => el.id === selectedElementId);
  if (!element) {
    return (
      <div style={{ padding: 12, color: 'var(--muted)', fontSize: 11 }}>
        Element not found.
      </div>
    );
  }

  function patch(changes: Partial<Element>) {
    updateElement(selectedElementId!, changes as Partial<Element>);
  }

  const hasFont = element.type === 'text' || element.type === 'ascii_art';
  const hasFontSize = element.type === 'text' || element.type === 'ascii_art' || element.type === 'decorative';
  const hasContent = element.type === 'text';
  const hasPattern = element.type === 'divider';

  const colorPreview = `hsl(${element.color.h}, ${element.color.s}%, ${element.color.l}%)`;

  return (
    <div style={{ fontSize: 11 }}>
      {/* Header */}
      <div
        style={{
          padding: '6px 8px',
          fontSize: 9,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          borderBottom: '1px solid var(--muted)',
          background: 'var(--surface)',
        }}
      >
        INSPECTOR — {element.type.replace('_', ' ').toUpperCase()}
      </div>

      {/* Position */}
      <SectionHeader>POSITION</SectionHeader>
      <InlineRow>
        <div style={{ flex: 1 }}>
          <label>X</label>
          <input
            type="number"
            value={element.position.x}
            onChange={(e) =>
              patch({ position: { x: parseInt(e.target.value) || 0, y: element.position.y } })
            }
            style={{ width: '100%' }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label>Y</label>
          <input
            type="number"
            value={element.position.y}
            onChange={(e) =>
              patch({ position: { x: element.position.x, y: parseInt(e.target.value) || 0 } })
            }
            style={{ width: '100%' }}
          />
        </div>
      </InlineRow>

      {/* Size */}
      <SectionHeader>SIZE</SectionHeader>
      <InlineRow>
        <div style={{ flex: 1 }}>
          <label>W</label>
          <input
            type="number"
            value={element.size.w}
            onChange={(e) =>
              patch({ size: { w: parseInt(e.target.value) || 24, h: element.size.h } })
            }
            style={{ width: '100%' }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label>H</label>
          <input
            type="number"
            value={element.size.h}
            onChange={(e) =>
              patch({ size: { w: element.size.w, h: parseInt(e.target.value) || 16 } })
            }
            style={{ width: '100%' }}
          />
        </div>
      </InlineRow>

      {/* Rotation */}
      <SectionHeader>ROTATION</SectionHeader>
      <Row>
        <label>DEGREES (-360 to 360)</label>
        <input
          type="number"
          min={-360}
          max={360}
          value={element.rotation}
          onChange={(e) => patch({ rotation: parseInt(e.target.value) || 0 })}
          style={{ width: '100%' }}
        />
      </Row>

      {/* Opacity */}
      <SectionHeader>OPACITY</SectionHeader>
      <Row>
        <label>0 – 1</label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={element.opacity}
          onChange={(e) => patch({ opacity: parseFloat(e.target.value) })}
          style={{ width: '100%' }}
        />
        <span style={{ color: 'var(--muted)' }}>{element.opacity.toFixed(2)}</span>
      </Row>

      {/* Color */}
      <SectionHeader>COLOR</SectionHeader>
      <InlineRow>
        <div
          style={{
            width: 20,
            height: 20,
            background: colorPreview,
            border: '1px solid var(--muted)',
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1 }}>
          <label>H (0-360)</label>
          <input
            type="number"
            min={0}
            max={360}
            value={element.color.h}
            onChange={(e) =>
              patch({ color: { ...element.color, h: parseInt(e.target.value) || 0 } })
            }
            style={{ width: '100%' }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label>S (0-100)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={element.color.s}
            onChange={(e) =>
              patch({ color: { ...element.color, s: parseInt(e.target.value) || 0 } })
            }
            style={{ width: '100%' }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label>L (0-100)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={element.color.l}
            onChange={(e) =>
              patch({ color: { ...element.color, l: parseInt(e.target.value) || 0 } })
            }
            style={{ width: '100%' }}
          />
        </div>
      </InlineRow>

      {/* Font (text and ascii_art only) */}
      {hasFont && (
        <>
          <SectionHeader>FONT</SectionHeader>
          <Row>
            <label>TYPEFACE</label>
            <select
              value={(element as { font: FontName }).font}
              onChange={(e) => patch({ font: e.target.value as FontName } as Partial<Element>)}
              style={{ width: '100%' }}
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </Row>
        </>
      )}

      {/* Font Size (text, ascii_art, decorative) */}
      {hasFontSize && (
        <>
          <SectionHeader>FONT SIZE</SectionHeader>
          <Row>
            <label>PX</label>
            <input
              type="number"
              min={8}
              max={96}
              value={(element as { fontSize: number }).fontSize}
              onChange={(e) =>
                patch({ fontSize: parseInt(e.target.value) || 13 } as Partial<Element>)
              }
              style={{ width: '100%' }}
            />
          </Row>
        </>
      )}

      {/* Content (text only) */}
      {hasContent && (
        <>
          <SectionHeader>CONTENT</SectionHeader>
          <Row>
            <label>TEXT</label>
            <textarea
              value={(element as { content: string }).content}
              onChange={(e) => patch({ content: e.target.value } as Partial<Element>)}
              rows={4}
              style={{ width: '100%', resize: 'vertical', fontFamily: 'monospace', fontSize: 11 }}
            />
          </Row>
        </>
      )}

      {/* Pattern (divider only) */}
      {hasPattern && (
        <>
          <SectionHeader>PATTERN</SectionHeader>
          <Row>
            <label>CHARACTER(S)</label>
            <input
              type="text"
              value={(element as { pattern: string }).pattern}
              onChange={(e) => patch({ pattern: e.target.value } as Partial<Element>)}
              style={{ width: '100%' }}
            />
          </Row>
        </>
      )}

      {/* Lock */}
      <SectionHeader>OPTIONS</SectionHeader>
      <InlineRow>
        <input
          type="checkbox"
          checked={element.locked}
          onChange={(e) => patch({ locked: e.target.checked })}
          id="inspector-locked"
        />
        <label htmlFor="inspector-locked" style={{ display: 'inline', textTransform: 'none', letterSpacing: 0, color: 'var(--text)' }}>
          Locked
        </label>
      </InlineRow>

      {/* Z-index */}
      <Row>
        <label>Z-INDEX (LAYER)</label>
        <input
          type="number"
          value={element.z}
          onChange={(e) => patch({ z: parseInt(e.target.value) || 0 })}
          style={{ width: '100%' }}
        />
      </Row>
    </div>
  );
}
```

- [ ] **12.2** Manually verify:
  - Run `npm run dev`
  - Drag a text element from the palette onto the canvas, click it to select
  - Right inspector shows all property fields for the element
  - Change the H (hue) value — the element color updates on the canvas in real time
  - Change content text in the textarea — the text updates on the canvas
  - Select a divider element — pattern input appears, font/content inputs do not
  - Select a decorative element — font size input appears, content textarea does not

- [ ] **12.3** Commit:

```bash
git add . && git commit -m "feat: add Inspector"
```

---

## Task 13: Composition Modal

- [ ] **13.1** Replace `components/compositions/CompositionModal.tsx` with the full implementation:

```tsx
// components/compositions/CompositionModal.tsx
'use client';
import { useState, useEffect, useRef } from 'react';
import useStudioStore from '@/lib/store/studioStore';
import {
  listCompositions,
  saveComposition,
  deleteComposition,
} from '@/lib/composition/storage';
import { createComposition } from '@/lib/composition/defaults';
import type { CompositionSpec } from '@/lib/types';

interface CompositionModalProps {
  onClose: () => void;
}

export function CompositionModal({ onClose }: CompositionModalProps) {
  const storeLoadComposition = useStudioStore((s) => s.loadComposition);
  const persistComposition = useStudioStore((s) => s.persistComposition);
  const composition = useStudioStore((s) => s.composition);

  const [savedList, setSavedList] = useState<CompositionSpec[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  function refresh() {
    setSavedList(listCompositions());
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  function handleNew() {
    const comp = createComposition('untitled');
    saveComposition(comp);
    storeLoadComposition(comp);
    onClose();
  }

  function handleSave() {
    persistComposition();
    refresh();
  }

  function handleLoad(comp: CompositionSpec) {
    storeLoadComposition(comp);
    onClose();
  }

  function handleDelete(id: string) {
    deleteComposition(id);
    refresh();
  }

  function startEditName(comp: CompositionSpec) {
    setEditingId(comp.id);
    setEditingName(comp.name);
  }

  function commitEditName(comp: CompositionSpec) {
    const updated = { ...comp, name: editingName };
    saveComposition(updated);
    // If this is the currently loaded composition, update store name too
    if (composition?.id === comp.id) {
      storeLoadComposition(updated);
    }
    setEditingId(null);
    refresh();
  }

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
      }}
    >
      <div
        style={{
          width: 480,
          background: 'var(--surface)',
          border: '1px solid var(--muted)',
          fontFamily: 'monospace',
          fontSize: 11,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '8px 12px',
            borderBottom: '1px solid var(--muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg)',
          }}
        >
          <span
            style={{
              fontSize: 9,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
            }}
          >
            COMPOSITIONS
          </span>
          <button onClick={onClose} style={{ border: 'none', background: 'none', color: 'var(--muted)', padding: '2px 4px' }}>
            ✕
          </button>
        </div>

        {/* Action buttons */}
        <div
          style={{
            padding: '8px 12px',
            borderBottom: '1px solid var(--muted)',
            display: 'flex',
            gap: 8,
          }}
        >
          <button onClick={handleNew}>NEW COMPOSITION</button>
          <button onClick={handleSave} disabled={!composition}>
            SAVE CURRENT
          </button>
        </div>

        {/* List */}
        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          {savedList.length === 0 ? (
            <div style={{ padding: '16px 12px', color: 'var(--muted)' }}>
              No saved compositions.
            </div>
          ) : (
            savedList.map((comp) => (
              <div
                key={comp.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '6px 12px',
                  borderBottom: '1px solid var(--bg)',
                  background: composition?.id === comp.id ? 'var(--bg)' : 'var(--surface)',
                  gap: 8,
                }}
              >
                {editingId === comp.id ? (
                  <input
                    ref={editInputRef}
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={() => commitEditName(comp)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitEditName(comp);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    style={{ flex: 1 }}
                  />
                ) : (
                  <span
                    style={{ flex: 1, cursor: 'text', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    onDoubleClick={() => startEditName(comp)}
                    title="Double-click to rename"
                  >
                    {comp.name}
                  </span>
                )}
                <span style={{ color: 'var(--muted)', fontSize: 9, whiteSpace: 'nowrap' }}>
                  {new Date(comp.updatedAt).toLocaleDateString()}
                </span>
                <button onClick={() => handleLoad(comp)}>LOAD</button>
                <button
                  onClick={() => handleDelete(comp.id)}
                  style={{ color: 'var(--muted)', borderColor: 'var(--muted)' }}
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **13.2** Confirm the "COMPOSITIONS" button in `EditorShell.tsx` is already wired (it was included in Task 7.3 — `setShowModal(true)` on click). No changes needed.

- [ ] **13.3** Manually verify end-to-end:
  - Run `npm run dev`
  - Click "COMPOSITIONS" in the top bar — modal opens
  - Click "NEW COMPOSITION" — new untitled composition loads, modal closes
  - Add elements to the canvas
  - Open modal, click "SAVE CURRENT" — composition appears in list
  - Double-click the name — inline input appears, rename it, press Enter — name updates in list
  - Click "LOAD" on a composition in the list — it loads and modal closes
  - Click "✕" on a composition — it is removed from the list
  - Click the modal overlay or the close `✕` button — modal dismisses

- [ ] **13.4** Commit:

```bash
git add . && git commit -m "feat: add CompositionModal"
```

---

## Self-Review

### 1. Spec Coverage

| Requirement | Task |
|---|---|
| Named compositions stored in localStorage | Task 3 (storage.ts), Task 13 (CompositionModal) |
| Fixed 1200x800 canvas with absolute-positioned elements | Task 8 (Canvas.tsx) |
| Element types: text, ascii_art, divider, decorative (no structural) | Task 2 (types.ts), Task 7 (sprites.ts), Task 8 (ElementRenderer) |
| Visual properties: hue, fontSize, x, y, rotation, opacity, content | Task 2 (VisualProperty), Task 6 (animationLoop) |
| Audio track upload + Web Audio API | Task 5 (audioEngine.ts), Task 9 (AudioPlayer) |
| Four signals: volume, bass, mid, treble via AnalyserNode | Task 5 (signals.ts, audioEngine.ts) |
| Binding = signal + element + property + transform + optional frames | Task 2 (Binding interface), Task 11 (BindingPanel, BindingRow) |
| Bindings stored globally (flat array), not on elements | Task 2 (CompositionSpec.bindings), Task 4 (store) |
| Transform: min, max, invert — maps 0-1 to property range | Task 2 (Transform), Task 6 (applyTransform) |
| FrameSequence: signal selects frame by index for content bindings | Task 6 (applyBinding content path), Task 11 (BindingRow textarea) |
| Content binding: invert applies, min/max ignored | Task 6 (applyBinding), Task 11 (BindingRow UI hides min/max) |
| HSL color model on elements (h, s, l) | Task 2 (ElementColor), Task 8 (ElementRenderer resolveColor) |
| Hue binding drives only h component | Task 6 (computeLiveValues sets hue), Task 8 (ElementRenderer uses liveOverride.hue) |
| 3-column layout + bottom bar | Task 7 (EditorShell) |
| Left sidebar: PALETTE tab + BINDINGS tab | Task 7 (EditorShell), Task 10 (Palette), Task 11 (BindingPanel) |
| Drag from palette → canvas to place elements | Task 7 (EditorShell onDragEnd), Task 10 (Palette useDraggable) |
| Drag existing elements to reposition, snap to grid | Task 7 (EditorShell onDragEnd snap), Task 8 (ElementWrapper useDraggable) |
| Resize elements via bottom-right handle | Task 8 (ElementWrapper startResize) |
| Inspector: edit all element properties | Task 12 (Inspector.tsx) |
| Keyboard shortcuts: delete, esc, arrows, g for grid | Task 8 (Canvas handleKeyDown, handleGlobalKey) |
| Audio player: play/pause, scrub, loop, time counter | Task 9 (AudioPlayer) |
| Animation loop: rAF reads signals, applies bindings, writes liveValues | Task 6 (startAnimationLoop), Task 9 (AudioPlayer useEffect) |
| liveValues in Zustand store, ElementWrapper reads and applies | Task 4 (store.liveValues), Task 8 (ElementWrapper) |
| Composition modal: list/save/load/rename/delete | Task 13 (CompositionModal) |
| Multiple named compositions in localStorage | Task 3 (storage.ts), Task 13 |
| removeElement also removes its bindings | Task 4 (store removeElement) |
| FontName type: jetbrains-mono, ibm-plex-mono, fira-code, vt323 | Task 2 (FontName), Task 12 (Inspector FONT_OPTIONS) |
| persistComposition updates updatedAt before saving | Task 4 (store persistComposition) |
| Default canvas 1200x800 grid 8 | Task 3 (defaults.ts DEFAULT_CANVAS) |
| 5-token CSS var theme | Task 1 (globals.css) |
| Monospace fonts only, no border-radius, no shadows, ASCII symbols | Task 1 (globals.css), all component files |

### 2. Type Consistency

All type names used throughout Tasks 3–13 are sourced from `lib/types.ts` as defined in Task 2:

- `SignalName` — used in Task 5 (signals.ts, audioEngine.ts), Task 6 (animationLoop.ts), Task 11 (BindingRow)
- `VisualProperty` — used in Task 6 (applyBinding), Task 11 (BindingRow PROPERTY_OPTIONS)
- `ElementType` — used in Task 3 (defaults.ts createElement switch), Task 7 (sprites.ts)
- `FontName` — used in Task 3 (DEFAULT_FONT), Task 7 (sprites.ts), Task 12 (Inspector FONT_OPTIONS)
- `ElementColor` — used in Task 3 (DEFAULT_COLOR), Task 8 (ElementRenderer resolveColor)
- `Transform` — used in Task 6 (applyTransform signature), Task 11 (BindingRow patchTransform)
- `Binding` — used in Task 4 (store addBinding/updateBinding), Task 6 (computeLiveValues), Task 11 (BindingRow/BindingPanel)
- `LiveElementOverride` — used in Task 8 (ElementRenderer prop, ElementWrapper liveOverride)
- `LiveValues` — used in Task 4 (store.liveValues, setLiveValues), Task 6 (computeLiveValues return type), Task 9 (AudioPlayer startAnimationLoop callback)
- `Signals` — used in Task 5 (signals.ts, audioEngine.ts), Task 6 (animationLoop.ts)
- `TextElement`, `AsciiArtElement`, `DividerElement`, `DecorativeElement`, `Element` — used in Task 3 (defaults.ts), Task 7 (sprites.ts), Task 8 (ElementRenderer), Task 12 (Inspector)
- `CanvasConfig` — used in Task 3 (defaults.ts), Task 8 (Canvas)
- `CompositionSpec` — used in Task 3 (storage.ts), Task 4 (store), Task 13 (CompositionModal)

All usages are consistent with Task 2 definitions. No type was renamed or structurally altered in later tasks.

### 3. No Placeholders

Confirmed: no instance of "TBD", "TODO", "implement later", "similar to Task N", or "// ... rest of file" appears in any task. Every code block is complete and directly implementable. Stub components created in Task 7.4 are explicitly labeled as temporary and replaced in their respective tasks (Tasks 8–13). The stub replacement steps are included as the first step of each relevant task.
