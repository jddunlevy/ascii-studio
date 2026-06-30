# Lissajous Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the CSS gradient background with an audio-reactive Lissajous canvas that accumulates colored curves over time, driven by bass, treble, mid, and volume signals.

**Architecture:** An HTML5 `<canvas>` element fills the background container, maintained by a RAF loop that fades existing content each frame (accumulation/trail effect) and draws new Lissajous curve segments. Audio signals drive the figure's shape (bass → a/b ratio), twist (treble → phase δ), size (volume → amplitude), and trace speed (mid → draw speed); a BeatDetector accelerates the fade on beats. The user selects 2–5 colors that gradient along the curve as it traces, with an optional glow (lighter composite) mode. A new BackgroundPanel exposes color swatches, glow toggle, and a single reactivity slider.

**Tech Stack:** React, TypeScript, HTML5 Canvas API, Zustand, existing `audioEngine` singleton, existing `BeatDetector` class

## Global Constraints

- Monospace fonts only (JetBrains Mono, IBM Plex Mono, Fira Code, VT323)
- 5-token color system: `--bg`, `--surface`, `--text`, `--muted`, `--accent`
- 1px solid borders, sharp corners, no border-radius
- Inline styles only — no new CSS classes
- No shadows
- Compact padding: 4px base rhythm, 8px secondary
- ASCII symbols for icons (✕, +)
- No new external dependencies
- Read `node_modules/next/dist/docs/` before using any Next.js APIs not already in the codebase

---

### Task 1: Replace BackgroundConfig type and defaults

**Files:**
- Modify: `lib/types.ts` (lines 139–148)
- Modify: `lib/composition/defaults.ts` (lines 22–31)

**Interfaces:**
- Produces: `LissajousColor` — `{ hex: string }` where hex is `'#rrggbb'`
- Produces: `BackgroundConfig` — `{ enabled: boolean, colors: LissajousColor[], glow: boolean, reactivity: number }`

- [ ] **Step 1: Replace BackgroundConfig in lib/types.ts**

Find and replace the block at lines 139–148 (the existing `BackgroundConfig` interface):

```typescript
// REMOVE THIS:
export interface BackgroundConfig {
  enabled: boolean;
  baseHue: number;
  hueCount: number;
  angle: number;
  speed: number;
  minOpacity: number;
  maxOpacity: number;
  bassMultiplier: number;
}

// REPLACE WITH:
export interface LissajousColor {
  hex: string; // '#rrggbb'
}

export interface BackgroundConfig {
  enabled: boolean;
  colors: LissajousColor[];  // 2–5 colors, gradient along Lissajous curve
  glow: boolean;             // true = 'lighter' composite op (glow effect)
  reactivity: number;        // 0–1, scales audio influence on figure parameters
}
```

- [ ] **Step 2: Replace DEFAULT_BACKGROUND in lib/composition/defaults.ts**

Find and replace the block at lines 22–31:

```typescript
// REMOVE THIS:
export const DEFAULT_BACKGROUND: BackgroundConfig = {
  enabled: true,
  baseHue: 0,
  hueCount: 3,
  angle: 135,
  speed: 1,
  minOpacity: 0.45,
  maxOpacity: 0.85,
  bassMultiplier: 3,
};

// REPLACE WITH:
export const DEFAULT_BACKGROUND: BackgroundConfig = {
  enabled: true,
  colors: [
    { hex: '#c8d4b8' }, // sage green
    { hex: '#b8c8d4' }, // soft blue
    { hex: '#d4b8c8' }, // dusty pink
  ],
  glow: false,
  reactivity: 0.6,
};
```

- [ ] **Step 3: Verify TypeScript**

Run: `npx tsc --noEmit`

Expected: errors only in `CanvasBackground.tsx` and `BackgroundPanel.tsx` referencing removed fields (`baseHue`, `hueCount`, etc.). Those get fixed in Tasks 2 and 3. Any error in `lib/types.ts` or `lib/composition/defaults.ts` itself is a bug introduced in this step.

- [ ] **Step 4: Commit**

```bash
git add lib/types.ts lib/composition/defaults.ts
git commit -m "feat: replace BackgroundConfig with LissajousColor palette type"
```

---

### Task 2: Rewrite CanvasBackground as Lissajous renderer

**Files:**
- Modify: `components/editor/CanvasBackground.tsx` (full rewrite)

**Interfaces:**
- Consumes: `BackgroundConfig` — `enabled`, `colors: LissajousColor[]`, `glow: boolean`, `reactivity: number`
- Consumes: `audioEngine.getSignals()` → `{ volume, bass, mid, treble }` each 0–1
- Consumes: `BeatDetector` from `@/lib/audio/BeatDetector` — `detectBeat(signal: number, threshold: number, minInterval: number): boolean`
- Consumes: `DEFAULT_BACKGROUND` from `@/lib/composition/defaults`
- Consumes: `useStudioStore.getState().composition?.background`
- Produces: `<CanvasBackground />` — renders a `<canvas>` at `position: absolute, inset: 0, zIndex: 0`

**Lissajous math reference:**
- `x(t) = cx + amp * sin(a * t + δ)`
- `y(t) = cy + amp * sin(b * t)`
- `a/b` ratio determines shape: 1:1 = circle, 1:2 = figure-8, 2:3 = pretzel, etc.

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
import type { LissajousColor } from '@/lib/types';

// a:b ratio table — bass 0→1 maps index 0→5
const RATIOS: Array<{ a: number; b: number }> = [
  { a: 1, b: 1 }, // circle
  { a: 1, b: 2 }, // figure-8
  { a: 2, b: 3 }, // pretzel
  { a: 3, b: 4 }, // complex knot
  { a: 3, b: 5 }, // intricate
  { a: 4, b: 5 }, // very intricate
];

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function lerpColor(colors: LissajousColor[], t: number): string {
  // t is 0–1; interpolates linearly through the color array
  if (colors.length === 0) return '#888888';
  if (colors.length === 1) return colors[0].hex;
  const scaled = Math.max(0, Math.min(1, t)) * (colors.length - 1);
  const i = Math.min(Math.floor(scaled), colors.length - 2);
  const f = scaled - i;
  const [r0, g0, b0] = hexToRgb(colors[i].hex);
  const [r1, g1, b1] = hexToRgb(colors[i + 1].hex);
  return `rgb(${Math.round(r0 + f * (r1 - r0))},${Math.round(g0 + f * (g1 - g0))},${Math.round(b0 + f * (b1 - b0))})`;
}

function parseCssColor(s: string): [number, number, number] {
  const trimmed = s.trim();
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) return hexToRgb(trimmed);
  return [245, 240, 232]; // warm cream fallback
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

    // Lissajous state — persists across frames
    let t = 0;
    let aSmooth = 2;
    let bSmooth = 3;
    let delta = 0;
    let beatFadeBoost = 0;

    // Read bg color from CSS custom property for the fade rect
    const bgStyle = getComputedStyle(document.documentElement)
      .getPropertyValue('--bg');
    const [bgR, bgG, bgB] = parseCssColor(bgStyle);

    // Resize canvas pixel dimensions to match layout — clears canvas content
    let lastW = 0;
    let lastH = 0;
    function resize() {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      if (w === lastW && h === lastH) return;
      lastW = w;
      lastH = h;
      canvas.width = w;
      canvas.height = h;
      // Refill bg so canvas doesn't flash transparent after resize
      ctx.fillStyle = `rgb(${bgR},${bgG},${bgB})`;
      ctx.fillRect(0, 0, w, h);
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    function tick() {
      const cfg =
        useStudioStore.getState().composition?.background ?? DEFAULT_BACKGROUND;

      if (!cfg.enabled) {
        raf = requestAnimationFrame(tick);
        return;
      }

      const w = canvas.width;
      const h = canvas.height;
      if (w === 0 || h === 0) {
        raf = requestAnimationFrame(tick);
        return;
      }

      const cx = w / 2;
      const cy = h / 2;
      const halfMin = Math.min(cx, cy);

      const signals = audioEngine.getSignals();
      const r = cfg.reactivity; // 0–1 scale factor for all audio influence

      // Beat detection → temporary fade acceleration
      const beat = beatDetector.detectBeat(signals.bass, 0.65, 300);
      if (beat) beatFadeBoost = 0.18;
      beatFadeBoost = Math.max(0, beatFadeBoost - 0.006);

      // Bass → a:b ratio (lerp toward target so shape morphs gradually)
      const ratioIdx = Math.round(signals.bass * r * (RATIOS.length - 1));
      const target = RATIOS[Math.min(ratioIdx, RATIOS.length - 1)];
      aSmooth += (target.a - aSmooth) * 0.006;
      bSmooth += (target.b - bSmooth) * 0.006;

      // Treble → phase δ increment (twists/rotates the figure)
      const basePhaseInc = 0.003;
      const treblePhaseInc = signals.treble * r * 0.018;
      delta += basePhaseInc + treblePhaseInc;

      // Volume → amplitude (how much of the canvas the figure fills)
      const baseAmp = 0.35;
      const volumeAmp = signals.volume * r * 0.42;
      const amp = Math.min(0.9, baseAmp + volumeAmp) * halfMin;

      // Mid → frame advance (how much curve is traced per frame)
      const baseAdvance = 0.04; // radians per frame at idle
      const midAdvance = signals.mid * r * 0.12;
      const frameAdvance = baseAdvance + midAdvance;

      // Fade: base rate + beat boost
      const fadeAlpha = 0.014 + beatFadeBoost;

      // ---- Fade old content toward bg color ----
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = `rgba(${bgR},${bgG},${bgB},${fadeAlpha})`;
      ctx.fillRect(0, 0, w, h);

      // ---- Draw new curve segment ----
      const POINTS = 80;
      const TWO_PI = Math.PI * 2;

      ctx.globalCompositeOperation = cfg.glow ? 'lighter' : 'source-over';
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';

      for (let i = 0; i < POINTS; i++) {
        const t0 = t + (i / POINTS) * frameAdvance;
        const t1 = t + ((i + 1) / POINTS) * frameAdvance;

        const x0 = cx + amp * Math.sin(aSmooth * t0 + delta);
        const y0 = cy + amp * Math.sin(bSmooth * t0);
        const x1 = cx + amp * Math.sin(aSmooth * t1 + delta);
        const y1 = cy + amp * Math.sin(bSmooth * t1);

        // Color position: cycles through palette once per 2π radians
        const colorT = (t0 % TWO_PI) / TWO_PI;
        ctx.strokeStyle = lerpColor(cfg.colors, colorT);

        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      }

      t += frameAdvance;
      // Prevent unbounded growth of t (safe wrap at large value)
      if (t > 1e6) t -= 1e6;

      // Reset composite op so subsequent canvas operations aren't affected
      ctx.globalCompositeOperation = 'source-over';

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

Expected: only remaining errors should be in `BackgroundPanel.tsx` (still references old fields). `CanvasBackground.tsx` should be clean.

- [ ] **Step 3: Run the app and visually verify**

Run: `npm run dev`

Without audio loaded:
- A Lissajous figure should be tracing slowly across the canvas background
- The figure should cycle through sage/blue/pink gradient colors as it traces
- The figure should be alive (drifting) — not static or blank
- Canvas fills the entire composition area

Load and play an audio file:
- Bass hits slowly morph the figure shape (circle → figure-8 → pretzel, etc.)
- High treble passages make the figure twist/spin faster
- Loud sections expand the figure toward canvas edges
- Beats cause brief trail-clearing bursts (old paths wipe faster)
- Reactivity at 0 → figure ignores audio and drifts at base rate

- [ ] **Step 4: Commit**

```bash
git add components/editor/CanvasBackground.tsx
git commit -m "feat: replace CSS gradient background with Lissajous canvas renderer"
```

---

### Task 3: Rewrite BackgroundPanel with color picker UI

**Files:**
- Modify: `components/editor/BackgroundPanel.tsx` (full rewrite)

**Interfaces:**
- Consumes: `BackgroundConfig` — `enabled`, `colors: LissajousColor[]`, `glow: boolean`, `reactivity: number`
- Consumes: `useStudioStore` — `composition`, `updateBackground(changes: Partial<BackgroundConfig>): void`
- Consumes: `LissajousColor` from `@/lib/types`
- Produces: `<BackgroundPanel />` — panel with: enabled toggle, palette row (add/remove/edit swatches), glow toggle, reactivity slider

- [ ] **Step 1: Write the full BackgroundPanel component**

Replace the entire contents of `components/editor/BackgroundPanel.tsx` with:

```tsx
// components/editor/BackgroundPanel.tsx
'use client';
import { useState } from 'react';
import useStudioStore from '@/lib/store/studioStore';
import { DEFAULT_BACKGROUND } from '@/lib/composition/defaults';
import type { LissajousColor } from '@/lib/types';

const CURATED_SWATCHES = [
  '#c8d4b8', // sage green
  '#b8c8d4', // soft blue
  '#d4b8c8', // dusty pink
  '#d4c8b8', // warm sand
  '#b8d4c8', // seafoam
  '#c8b8d4', // lavender mist
  '#e8dcc8', // cream
  '#d4d4b8', // pale chartreuse
  '#8c9078', // muted olive
  '#907888', // mauve
  '#788890', // slate
  '#f0e8d0', // warm white
];

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 9,
        letterSpacing: '0.08em',
        textTransform: 'uppercase' as const,
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
    <div
      style={{
        padding: '4px 8px',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: 2,
      }}
    >
      {children}
    </div>
  );
}

export function BackgroundPanel() {
  const composition = useStudioStore((s) => s.composition);
  const updateBackground = useStudioStore((s) => s.updateBackground);
  const cfg = composition?.background ?? DEFAULT_BACKGROUND;

  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [hexInput, setHexInput] = useState('');

  function patchColors(newColors: LissajousColor[]) {
    updateBackground({ colors: newColors });
  }

  function addColor() {
    if (cfg.colors.length >= 5) return;
    const newColor: LissajousColor = { hex: '#e8dcc8' };
    patchColors([...cfg.colors, newColor]);
    setEditingIdx(cfg.colors.length);
    setHexInput('#e8dcc8');
  }

  function removeColor(idx: number) {
    if (cfg.colors.length <= 2) return;
    const next = cfg.colors.filter((_, i) => i !== idx);
    patchColors(next);
    if (editingIdx === idx) {
      setEditingIdx(null);
    } else if (editingIdx !== null && editingIdx > idx) {
      setEditingIdx(editingIdx - 1);
    }
  }

  function setColor(idx: number, hex: string) {
    patchColors(cfg.colors.map((c, i) => (i === idx ? { hex } : c)));
  }

  function handleSwatchClick(idx: number) {
    if (editingIdx === idx) {
      setEditingIdx(null);
    } else {
      setEditingIdx(idx);
      setHexInput(cfg.colors[idx]?.hex ?? '#e8dcc8');
    }
  }

  function handleHexInput(value: string) {
    setHexInput(value);
    if (/^#[0-9a-f]{6}$/i.test(value) && editingIdx !== null) {
      setColor(editingIdx, value.toLowerCase());
    }
  }

  return (
    <div style={{ fontSize: 11, borderTop: '2px solid var(--muted)' }}>
      {/* Header with enabled toggle */}
      <div
        style={{
          padding: '6px 8px',
          fontSize: 9,
          letterSpacing: '0.08em',
          textTransform: 'uppercase' as const,
          color: 'var(--muted)',
          borderBottom: '1px solid var(--muted)',
          background: 'var(--surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>BACKGROUND</span>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            margin: 0,
            textTransform: 'none' as const,
            letterSpacing: 0,
            color: 'var(--text)',
            fontSize: 9,
          }}
        >
          <input
            type="checkbox"
            checked={cfg.enabled}
            onChange={(e) => updateBackground({ enabled: e.target.checked })}
          />
          ON
        </label>
      </div>

      {/* Palette */}
      <SectionHeader>PALETTE</SectionHeader>
      <Row>
        {/* Swatch row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            flexWrap: 'wrap' as const,
          }}
        >
          {cfg.colors.map((color, idx) => (
            <div key={idx} style={{ position: 'relative' as const }}>
              <button
                onClick={() => handleSwatchClick(idx)}
                title={color.hex}
                style={{
                  width: 24,
                  height: 24,
                  background: color.hex,
                  border:
                    editingIdx === idx
                      ? '2px solid var(--accent)'
                      : '1px solid var(--muted)',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'block',
                }}
              />
              {cfg.colors.length > 2 && (
                <button
                  onClick={() => removeColor(idx)}
                  title="Remove color"
                  style={{
                    position: 'absolute' as const,
                    top: -6,
                    right: -6,
                    width: 12,
                    height: 12,
                    background: 'var(--surface)',
                    border: '1px solid var(--muted)',
                    fontSize: 8,
                    padding: 0,
                    cursor: 'pointer',
                    color: 'var(--muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          {cfg.colors.length < 5 && (
            <button
              onClick={addColor}
              title="Add color"
              style={{
                width: 24,
                height: 24,
                background: 'var(--bg)',
                border: '1px dashed var(--muted)',
                cursor: 'pointer',
                fontSize: 14,
                color: 'var(--muted)',
                padding: 0,
                lineHeight: '22px',
              }}
            >
              +
            </button>
          )}
        </div>

        {/* Color editor — shown when a swatch is selected */}
        {editingIdx !== null && (
          <div
            style={{
              marginTop: 8,
              borderTop: '1px solid var(--surface)',
              paddingTop: 6,
            }}
          >
            <div
              style={{
                fontSize: 9,
                color: 'var(--muted)',
                letterSpacing: '0.08em',
                marginBottom: 4,
              }}
            >
              SELECT
            </div>
            {/* Curated swatch grid */}
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 3 }}>
              {CURATED_SWATCHES.map((hex) => (
                <button
                  key={hex}
                  onClick={() => {
                    setColor(editingIdx, hex);
                    setHexInput(hex);
                  }}
                  title={hex}
                  style={{
                    width: 16,
                    height: 16,
                    background: hex,
                    border:
                      cfg.colors[editingIdx]?.hex === hex
                        ? '2px solid var(--accent)'
                        : '1px solid var(--muted)',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                />
              ))}
            </div>
            {/* Hex input */}
            <div
              style={{
                marginTop: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <div
                style={{
                  width: 16,
                  height: 16,
                  background: cfg.colors[editingIdx]?.hex ?? '#888888',
                  border: '1px solid var(--muted)',
                  flexShrink: 0,
                }}
              />
              <input
                type="text"
                value={hexInput}
                onChange={(e) => handleHexInput(e.target.value)}
                placeholder="#rrggbb"
                maxLength={7}
                style={{
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: 11,
                  width: 72,
                  padding: '2px 4px',
                  border: '1px solid var(--muted)',
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  outline: 'none',
                }}
              />
            </div>
          </div>
        )}
      </Row>

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

      {/* Reactivity */}
      <SectionHeader>REACTIVITY</SectionHeader>
      <Row>
        <label
          style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.08em' }}
        >
          0 (SUBTLE) → 1 (INTENSE)
        </label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={cfg.reactivity}
          onChange={(e) =>
            updateBackground({ reactivity: parseFloat(e.target.value) })
          }
          style={{ width: '100%' }}
        />
        <span style={{ color: 'var(--muted)', fontSize: 9 }}>
          {cfg.reactivity.toFixed(2)}
        </span>
      </Row>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles with zero errors**

Run: `npx tsc --noEmit`

Expected: zero errors across the entire project.

- [ ] **Step 3: Run the app and verify the panel**

Run: `npm run dev`

Check the BACKGROUND panel in the right sidebar:
- Enabled toggle shows/hides the canvas
- PALETTE shows 3 swatches (sage, blue, pink)
- Clicking a swatch selects it (accent border) and opens editor below
- Curated grid: clicking a swatch updates the selected palette entry live on the canvas
- Hex input: typing a valid `#rrggbb` value updates the swatch and canvas live
- "+" adds a cream swatch (disabled at 5 colors)
- ✕ removes a swatch (hidden when only 2 colors remain)
- GLOW MODE checkbox toggles the glow effect visibly on the canvas
- REACTIVITY slider at 0 → figure ignores audio; at 1 → dramatic audio response

- [ ] **Step 4: Commit**

```bash
git add components/editor/BackgroundPanel.tsx
git commit -m "feat: rewrite BackgroundPanel with Lissajous color picker UI"
```
