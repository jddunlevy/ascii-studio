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
  const rgb = t.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/);
  if (rgb) {
    return [parseInt(rgb[1], 10), parseInt(rgb[2], 10), parseInt(rgb[3], 10)];
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
      grainFrame = 2;
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
