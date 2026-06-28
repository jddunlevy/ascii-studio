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

