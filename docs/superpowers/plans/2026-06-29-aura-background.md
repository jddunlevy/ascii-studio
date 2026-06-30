# Aura Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Lissajous line-trace renderer with large radial gradient blobs that drift across the canvas using Lissajous math, filling the entire screen with saturated color and film grain — either EDM-dark (screen blend on near-black) or aura-light (normal blend on cream).

**Architecture:** Each palette color becomes a large radial gradient blob whose center point traces a Lissajous orbit. All blobs are drawn every frame on top of a slow fade to the background color, producing accumulation. In dark mode `globalCompositeOperation = 'screen'` makes colors add like light; in light mode `'source-over'` at moderate opacity produces the aura/watercolor look. A film grain texture (ImageData, refreshed every 3 frames) overlays everything. Audio drives orbit speed (mid), blob radius (volume + beats), and phase drift (treble). The user toggles dark/light in the panel.

**Tech Stack:** React, TypeScript, HTML5 Canvas API (radial gradients, ImageData, globalCompositeOperation), Zustand, existing `audioEngine` singleton, existing `BeatDetector`

## Global Constraints

- Monospace fonts only (JetBrains Mono, IBM Plex Mono, Fira Code, VT323)
- 5-token color system: `--bg`, `--surface`, `--text`, `--muted`, `--accent`
- 1px solid borders, sharp corners, no border-radius, no shadows
- Inline styles only — no new CSS classes
- ASCII symbols for icons (✕, +, ◻, ◼) — no emoji, no icon libraries
- No new external dependencies
- Read `node_modules/next/dist/docs/` before using any Next.js APIs not already in the codebase

---

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

### Task 2: Rewrite CanvasBackground as radial blob renderer

**Files:**
- Modify: `components/editor/CanvasBackground.tsx` (full rewrite)

**Interfaces:**
- Consumes: `BackgroundConfig` — `enabled`, `colors: LissajousColor[]`, `reactivity`, `darkMode`
- Consumes: `audioEngine.getSignals()` → `{ volume, bass, mid, treble }` each 0–1
- Consumes: `BeatDetector` — `detectBeat(signal, threshold, minInterval): boolean`
- Consumes: `DEFAULT_BACKGROUND` from `@/lib/composition/defaults`
- Produces: `<CanvasBackground />` — canvas at `position: absolute, inset: 0, zIndex: 0`

**Rendering model:**
- N blobs (one per palette color), each with a Lissajous orbit for its center point
- `BLOB_ORBITS[i]` provides `{ a, b, phase }` for blob i's orbit
- Dark mode: `globalCompositeOperation = 'screen'`, near-black bg `rgb(10, 8, 12)`
- Light mode: `globalCompositeOperation = 'source-over'`, cream bg from `--bg` CSS var
- Grain: offscreen canvas with random ImageData, refreshed every 3 frames, composited at 0.45 opacity

- [ ] **Step 1: Write the full CanvasBackground component**

Replace the entire contents of `components/editor/CanvasBackground.tsx` with:

```tsx
// components/editor/CanvasBackground.tsx
'use client';
import { useEffect, useRef } from 'react';
import { audioEngine } from '@/lib/audio/audioEngine';
import useStudioStore from '@/lib/store/studioStore';
import { BeatDetector } from '@/lib/audio/BeatDetector';
import { DEFAULT_BACKGROUND } from '@/lib/composition/defaults';

// Lissajous orbit params per blob slot (supports up to 5 blobs)
const BLOB_ORBITS = [
  { a: 2, b: 3, phase: 0 },
  { a: 3, b: 4, phase: Math.PI * 0.66 },
  { a: 1, b: 2, phase: Math.PI * 1.33 },
  { a: 3, b: 5, phase: Math.PI },
  { a: 4, b: 5, phase: Math.PI * 1.66 },
];

// Near-black for dark mode background
const DARK_BG: [number, number, number] = [10, 8, 12];

function hexToRgba(hex: string, alpha: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return `rgba(200,200,200,${alpha})`;
  return `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${alpha})`;
}

function parseCssColor(s: string): [number, number, number] {
  const t = s.trim();
  if (/^#[0-9a-f]{6}$/i.test(t)) {
    return [parseInt(t.slice(1, 3), 16), parseInt(t.slice(3, 5), 16), parseInt(t.slice(5, 7), 16)];
  }
  return [245, 240, 232];
}

export function CanvasBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf: number;
    const beatDetector = new BeatDetector();

    // Animation state
    let t = 0;
    let beatPulse = 0;

    // Light-mode bg color from CSS var (read once at mount)
    const lightBg = parseCssColor(
      getComputedStyle(document.documentElement).getPropertyValue('--bg')
    );

    // Grain offscreen canvas — created/recreated on resize
    let grainCanvas: HTMLCanvasElement | null = null;
    let grainCtx: CanvasRenderingContext2D | null = null;
    let grainData: ImageData | null = null;
    let grainFrame = 0;

    function setupGrain(w: number, h: number) {
      grainCanvas = document.createElement('canvas');
      grainCanvas.width = w;
      grainCanvas.height = h;
      grainCtx = grainCanvas.getContext('2d');
      if (grainCtx) grainData = grainCtx.createImageData(w, h);
    }

    let lastW = 0;
    let lastH = 0;

    function resize() {
      const w = canvas!.offsetWidth;
      const h = canvas!.offsetHeight;
      if (w === lastW && h === lastH) return;
      lastW = w;
      lastH = h;
      canvas!.width = w;
      canvas!.height = h;
      setupGrain(w, h);
      const cfg = useStudioStore.getState().composition?.background ?? DEFAULT_BACKGROUND;
      const [r, g, b] = cfg.darkMode ? DARK_BG : lightBg;
      ctx!.fillStyle = `rgb(${r},${g},${b})`;
      ctx!.fillRect(0, 0, w, h);
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    function drawGrain(isDark: boolean) {
      if (!grainCanvas || !grainCtx || !grainData) return;
      // Refresh grain data every 3 frames; composite every frame
      grainFrame = (grainFrame + 1) % 3;
      if (grainFrame === 0) {
        const data = grainData.data;
        const v = isDark ? 255 : 0;
        for (let i = 0; i < data.length; i += 4) {
          data[i] = v;
          data[i + 1] = v;
          data[i + 2] = v;
          data[i + 3] = Math.random() * 18 | 0; // 0–18 alpha (~7% max)
        }
        grainCtx.putImageData(grainData, 0, 0);
      }
      ctx!.globalCompositeOperation = 'source-over';
      ctx!.globalAlpha = 0.45;
      ctx!.drawImage(grainCanvas, 0, 0);
      ctx!.globalAlpha = 1;
    }

    function tick() {
      const cfg = useStudioStore.getState().composition?.background ?? DEFAULT_BACKGROUND;
      const isDark = cfg.darkMode ?? false;

      if (!cfg.enabled) {
        ctx!.globalCompositeOperation = 'source-over';
        const [r, g, b] = isDark ? DARK_BG : lightBg;
        ctx!.fillStyle = `rgb(${r},${g},${b})`;
        ctx!.fillRect(0, 0, canvas!.width, canvas!.height);
        raf = requestAnimationFrame(tick);
        return;
      }

      const w = canvas!.width;
      const h = canvas!.height;
      if (w === 0 || h === 0) {
        raf = requestAnimationFrame(tick);
        return;
      }

      const cx = w / 2;
      const cy = h / 2;
      const signals = audioEngine.getSignals();
      const r = cfg.reactivity;

      // Beat detection
      const beat = beatDetector.detectBeat(signals.bass, 0.65, 300);
      if (beat) beatPulse = 0.25;
      beatPulse = Math.max(0, beatPulse - 0.008);

      // Advance Lissajous time (mid drives speed)
      t += 0.006 + signals.mid * r * 0.01;
      if (t > 1e6) t -= 1e6;

      // Phase shift from treble (twists orbit path)
      const phaseShift = signals.treble * r * 0.8;

      // Orbit spread from canvas center (volume widens orbits)
      const spreadX = w * (0.2 + signals.volume * r * 0.08);
      const spreadY = h * (0.2 + signals.volume * r * 0.08);

      // Blob radius (base covers ~half canvas; volume + beat expand it)
      const blobRadius =
        Math.min(w, h) * 0.52 +
        beatPulse * Math.min(w, h) * 0.18 +
        signals.volume * r * Math.min(w, h) * 0.15;

      // ---- Fade toward background ----
      const [bgR, bgG, bgB] = isDark ? DARK_BG : lightBg;
      const fadeAlpha = 0.028 + (beat ? 0.04 : 0);
      ctx!.globalCompositeOperation = 'source-over';
      ctx!.fillStyle = `rgba(${bgR},${bgG},${bgB},${fadeAlpha})`;
      ctx!.fillRect(0, 0, w, h);

      // ---- Draw blobs ----
      ctx!.globalCompositeOperation = isDark ? 'screen' : 'source-over';
      const colors = cfg.colors.length > 0 ? cfg.colors : DEFAULT_BACKGROUND.colors;

      for (let i = 0; i < colors.length; i++) {
        const orbit = BLOB_ORBITS[i % BLOB_ORBITS.length];
        const blobT = t + orbit.phase;
        const bx = cx + spreadX * Math.sin(orbit.a * blobT + phaseShift);
        const by = cy + spreadY * Math.sin(orbit.b * blobT);

        const grad = ctx!.createRadialGradient(bx, by, 0, bx, by, blobRadius);
        grad.addColorStop(0,    hexToRgba(colors[i].hex, isDark ? 0.88 : 0.60));
        grad.addColorStop(0.45, hexToRgba(colors[i].hex, isDark ? 0.35 : 0.22));
        grad.addColorStop(1,    hexToRgba(colors[i].hex, 0));
        ctx!.fillStyle = grad;
        ctx!.fillRect(0, 0, w, h);
      }

      // ---- Grain overlay ----
      drawGrain(isDark);

      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`

Expected: zero errors. `CanvasBackground.tsx` should be clean; any remaining errors are in `BackgroundPanel.tsx` (handled in Task 3).

- [ ] **Step 3: Run the app and visually verify**

Run: `npm run dev`

Without audio:
- Canvas fills entirely with soft overlapping color blobs — no empty corners
- Blobs slowly drift, covering the whole surface
- Film grain texture visible as subtle speckle
- Default is light/aura mode (cream-ish bg, soft pastel blobs)

With audio playing:
- Volume expands blob radius visibly
- Beat causes a brief bloom pulse
- Treble makes orbits twist faster
- Mid speeds up the drift

Toggle enabled off → canvas clears to solid background color (no blobs remain visible).

- [ ] **Step 4: Commit**

```bash
git add components/editor/CanvasBackground.tsx
git commit -m "feat: rewrite background as radial gradient blob renderer with film grain"
```

---

### Task 3: Add dark/light toggle to BackgroundPanel

**Files:**
- Modify: `components/editor/BackgroundPanel.tsx`

**Interfaces:**
- Consumes: `BackgroundConfig.darkMode: boolean`
- Consumes: `updateBackground({ darkMode: boolean })`
- Produces: THEME section above PALETTE with ◻ LIGHT / ◼ DARK toggle buttons

- [ ] **Step 1: Add THEME section to BackgroundPanel**

In `components/editor/BackgroundPanel.tsx`, find the PALETTE section header:

```tsx
      {/* Palette */}
      <SectionHeader>PALETTE</SectionHeader>
```

Insert a THEME section immediately before it:

```tsx
      {/* Theme */}
      <SectionHeader>THEME</SectionHeader>
      <div style={{ padding: '4px 8px', display: 'flex', gap: 4 }}>
        {(['light', 'dark'] as const).map((mode) => {
          const isActive = (cfg.darkMode ?? false) === (mode === 'dark');
          return (
            <button
              key={mode}
              onClick={() => updateBackground({ darkMode: mode === 'dark' })}
              style={{
                flex: 1,
                padding: '3px 0',
                background: isActive ? 'var(--accent)' : 'var(--surface)',
                color: isActive ? 'var(--bg)' : 'var(--muted)',
                border: `1px solid ${isActive ? 'var(--accent)' : 'var(--muted)'}`,
                cursor: 'pointer',
                fontSize: 9,
                letterSpacing: '0.08em',
                fontFamily: 'inherit',
              }}
            >
              {mode === 'light' ? '\u25fb LIGHT' : '\u25fc DARK'}
            </button>
          );
        })}
      </div>
```

Note: `\u25fb` = ◻, `\u25fc` = ◼ (Unicode escape to avoid encoding issues in source).

- [ ] **Step 2: Remove the GLOW MODE section**

The `glow` field is now superseded by the dark/light mode toggle (dark mode IS the glow mode via screen blend). Remove the GLOW MODE checkbox section entirely from the JSX.

Find and delete this block:

```tsx
      {/* Glow mode */}
      <SectionHeader>STYLE</SectionHeader>
      <div style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            margin: 0,
            fontSize: 11,
            color: 'var(--text)',
          }}
        >
          <input
            type="checkbox"
            checked={cfg.glow}
            onChange={(e) => updateBackground({ glow: e.target.checked })}
          />
          GLOW MODE
        </label>
      </div>
```

Leave the `glow` field on the type and in storage — do not remove it from `BackgroundConfig` or `DEFAULT_BACKGROUND` (old saved compositions have it; removing it from the type would require another migration). Simply remove the UI control.

- [ ] **Step 3: Verify TypeScript compiles with zero errors**

Run: `npx tsc --noEmit`

Expected: zero errors across the entire project.

- [ ] **Step 4: Run the app and verify toggle**

Run: `npm run dev`

Open the BACKGROUND panel:
- THEME row shows ◻ LIGHT (active/accent) and ◼ DARK buttons
- Clicking ◼ DARK: canvas shifts to near-black, blobs glow via screen blend
- Clicking ◻ LIGHT: canvas returns to cream/aura look with source-over blend
- GLOW MODE checkbox is gone — no orphaned control
- PALETTE, REACTIVITY slider still work in both modes

- [ ] **Step 5: Commit**

```bash
git add components/editor/BackgroundPanel.tsx
git commit -m "feat: add dark/light theme toggle, remove orphaned glow checkbox"
```
