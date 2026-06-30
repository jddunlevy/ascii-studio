### Task 1: Add darkMode field to BackgroundConfig

**Files:**
- Modify: `lib/types.ts` — add `darkMode: boolean` to `BackgroundConfig`
- Modify: `lib/composition/defaults.ts` — add `darkMode: false` to `DEFAULT_BACKGROUND`
- Modify: `lib/composition/storage.ts` — extend `migrateBackground` to add `darkMode` when missing from v1 Lissajous saves

**Interfaces:**
- Produces: `BackgroundConfig` with fields `enabled`, `colors`, `glow`, `reactivity`, `darkMode: boolean`
- Produces: `DEFAULT_BACKGROUND.darkMode = false`

- [ ] **Step 1: Add `darkMode` to BackgroundConfig in lib/types.ts**

Find the `BackgroundConfig` interface and add one field:

```typescript
export interface BackgroundConfig {
  enabled: boolean;
  colors: LissajousColor[];
  glow: boolean;
  reactivity: number;
  darkMode: boolean;  // ← add this line
}
```

- [ ] **Step 2: Add `darkMode` to DEFAULT_BACKGROUND in lib/composition/defaults.ts**

Find `DEFAULT_BACKGROUND` and add one field:

```typescript
export const DEFAULT_BACKGROUND: BackgroundConfig = {
  enabled: true,
  colors: [
    { hex: '#c8d4b8' },
    { hex: '#b8c8d4' },
    { hex: '#d4b8c8' },
  ],
  glow: false,
  reactivity: 0.6,
  darkMode: false,   // ← add this line
};
```

- [ ] **Step 3: Extend migrateBackground in lib/composition/storage.ts**

The current `migrateBackground` handles the old hue-based config. It also needs to handle v1 Lissajous saves (which have `colors`/`glow`/`reactivity` but no `darkMode`). Replace the entire function:

```typescript
function migrateBackground(comp: CompositionSpec): CompositionSpec {
  const bg = comp.background as Record<string, unknown> | undefined;
  if (!bg) return comp;
  // Old hue-based config — replace entirely
  if ('baseHue' in bg) {
    return { ...comp, background: { ...DEFAULT_BACKGROUND } };
  }
  // V1 Lissajous config missing darkMode — add default
  if (!('darkMode' in bg)) {
    return { ...comp, background: { ...bg, darkMode: false } as BackgroundConfig };
  }
  return comp;
}
```

- [ ] **Step 4: Verify TypeScript**

Run: `npx tsc --noEmit`

Expected: zero errors (darkMode is a new required field on BackgroundConfig, so TypeScript will report errors if any existing code constructs a BackgroundConfig literal without it — but the only literals are in defaults.ts which was just updated, and in tests if any exist). If errors appear in other files, fix them by adding `darkMode: false`.

- [ ] **Step 5: Commit**

```bash
git add lib/types.ts lib/composition/defaults.ts lib/composition/storage.ts
git commit -m "feat: add darkMode field to BackgroundConfig with storage migration"
```

---

