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
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return [200, 200, 200];
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
      const w = canvas!.offsetWidth;
      const h = canvas!.offsetHeight;
      if (w === lastW && h === lastH) return;
      lastW = w;
      lastH = h;
      canvas!.width = w;
      canvas!.height = h;
      // Refill bg so canvas doesn't flash transparent after resize
      ctx!.fillStyle = `rgb(${bgR},${bgG},${bgB})`;
      ctx!.fillRect(0, 0, w, h);
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    function tick() {
      const cfg =
        useStudioStore.getState().composition?.background ?? DEFAULT_BACKGROUND;

      if (!cfg.enabled) {
        ctx!.fillStyle = `rgb(${bgR},${bgG},${bgB})`;
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
      delta %= Math.PI * 2;

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
      ctx!.globalCompositeOperation = 'source-over';
      ctx!.fillStyle = `rgba(${bgR},${bgG},${bgB},${fadeAlpha})`;
      ctx!.fillRect(0, 0, w, h);

      // ---- Draw new curve segment ----
      const POINTS = 80;
      const TWO_PI = Math.PI * 2;

      ctx!.globalCompositeOperation = cfg.glow ? 'lighter' : 'source-over';
      ctx!.lineWidth = 1.5;
      ctx!.lineCap = 'round';

      for (let i = 0; i < POINTS; i++) {
        const t0 = t + (i / POINTS) * frameAdvance;
        const t1 = t + ((i + 1) / POINTS) * frameAdvance;

        const x0 = cx + amp * Math.sin(aSmooth * t0 + delta);
        const y0 = cy + amp * Math.sin(bSmooth * t0);
        const x1 = cx + amp * Math.sin(aSmooth * t1 + delta);
        const y1 = cy + amp * Math.sin(bSmooth * t1);

        // Color position: cycles through palette once per 2π radians
        const colorT = (t0 % TWO_PI) / TWO_PI;
        ctx!.strokeStyle = lerpColor(cfg.colors, colorT);

        ctx!.beginPath();
        ctx!.moveTo(x0, y0);
        ctx!.lineTo(x1, y1);
        ctx!.stroke();
      }

      t += frameAdvance;
      // Prevent unbounded growth of t (safe wrap at large value)
      if (t > 1e6) t -= 1e6;

      // Reset composite op so subsequent canvas operations aren't affected
      ctx!.globalCompositeOperation = 'source-over';

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
