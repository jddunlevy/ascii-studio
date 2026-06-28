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

