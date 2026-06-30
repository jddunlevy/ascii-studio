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

// Near-black base
const DARK_BG: [number, number, number] = [10, 8, 12];

// Palette-tint constants: keep background dark but hued rather than grey.
// TINT_SCALE darkens the avg palette color toward the DARK_BG range.
// TINT_BLEND controls how strongly the palette hue shifts the fade target.
const TINT_SCALE = 0.20;
const TINT_BLEND = 0.65;

function hexToRgba(hex: string, alpha: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return `rgba(200,200,200,${alpha})`;
  return `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${alpha})`;
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
      const [r, g, b] = DARK_BG;
      ctx!.fillStyle = `rgb(${r},${g},${b})`;
      ctx!.fillRect(0, 0, w, h);
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    function drawGrain() {
      if (!grainCanvas || !grainCtx || !grainData) return;
      // Refresh grain data every 3 frames; composite every frame
      grainFrame = (grainFrame + 1) % 3;
      if (grainFrame === 0) {
        const data = grainData.data;
        for (let i = 0; i < data.length; i += 4) {
          data[i] = 255;
          data[i + 1] = 255;
          data[i + 2] = 255;
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

      if (!cfg.enabled) {
        ctx!.globalCompositeOperation = 'source-over';
        const [r, g, b] = DARK_BG;
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

      const colors = cfg.colors.length > 0 ? cfg.colors : DEFAULT_BACKGROUND.colors;

      // ---- Fade toward palette-tinted dark ----
      // Compute the average palette color, scale it very dark, then blend
      // toward that instead of neutral black. Areas where blobs have been
      // converge to a dim hued version of the palette rather than grey.
      let avgR = 0, avgG = 0, avgB = 0;
      for (const c of colors) {
        avgR += parseInt(c.hex.slice(1, 3), 16);
        avgG += parseInt(c.hex.slice(3, 5), 16);
        avgB += parseInt(c.hex.slice(5, 7), 16);
      }
      avgR /= colors.length;
      avgG /= colors.length;
      avgB /= colors.length;

      const tR = Math.round(DARK_BG[0] + (avgR * TINT_SCALE - DARK_BG[0]) * TINT_BLEND);
      const tG = Math.round(DARK_BG[1] + (avgG * TINT_SCALE - DARK_BG[1]) * TINT_BLEND);
      const tB = Math.round(DARK_BG[2] + (avgB * TINT_SCALE - DARK_BG[2]) * TINT_BLEND);

      const fadeAlpha = 0.016 + (beat ? 0.03 : 0);
      ctx!.globalCompositeOperation = 'source-over';
      ctx!.fillStyle = `rgba(${tR},${tG},${tB},${fadeAlpha})`;
      ctx!.fillRect(0, 0, w, h);

      // ---- Draw blobs (screen = additive light, spotlights stay bright) ----
      ctx!.globalCompositeOperation = 'screen';

      for (let i = 0; i < colors.length; i++) {
        const orbit = BLOB_ORBITS[i % BLOB_ORBITS.length];
        const blobT = t + orbit.phase;
        const bx = cx + spreadX * Math.sin(orbit.a * blobT + phaseShift);
        const by = cy + spreadY * Math.sin(orbit.b * blobT);

        const grad = ctx!.createRadialGradient(bx, by, 0, bx, by, blobRadius);
        grad.addColorStop(0,    hexToRgba(colors[i].hex, 0.88));
        grad.addColorStop(0.45, hexToRgba(colors[i].hex, 0.35));
        grad.addColorStop(1,    hexToRgba(colors[i].hex, 0));
        ctx!.fillStyle = grad;
        ctx!.fillRect(0, 0, w, h);
      }

      // ---- Grain overlay ----
      drawGrain();

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
