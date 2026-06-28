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

