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

    let t = 0;
    let beatPulse = 0;

    // Work canvas: blobs are rendered here at reduced resolution.
    // Upscaled to the main canvas each frame with imageSmoothingEnabled=false
    // to produce the chunky pixel effect. Fade/persistence lives here too.
    let workCanvas: HTMLCanvasElement | null = null;
    let workCtx: CanvasRenderingContext2D | null = null;

    // Grain offscreen canvas — full resolution, composited on top after upscale
    let grainCanvas: HTMLCanvasElement | null = null;
    let grainCtx: CanvasRenderingContext2D | null = null;
    let grainData: ImageData | null = null;
    let grainFrame = 0;

    let lastW = 0;
    let lastH = 0;
    let lastPixelSize = 0;

    function setupWork(w: number, h: number, pixelSize: number) {
      const ww = Math.max(1, Math.ceil(w / pixelSize));
      const wh = Math.max(1, Math.ceil(h / pixelSize));
      if (!workCanvas) workCanvas = document.createElement('canvas');
      workCanvas.width = ww;
      workCanvas.height = wh;
      workCtx = workCanvas.getContext('2d');
      if (workCtx) {
        workCtx.fillStyle = 'rgb(0,0,0)';
        workCtx.fillRect(0, 0, ww, wh);
      }
    }

    function setupGrain(w: number, h: number) {
      grainCanvas = document.createElement('canvas');
      grainCanvas.width = w;
      grainCanvas.height = h;
      grainCtx = grainCanvas.getContext('2d');
      if (grainCtx) grainData = grainCtx.createImageData(w, h);
      grainFrame = 2;
    }

    function resize() {
      const w = canvas!.offsetWidth;
      const h = canvas!.offsetHeight;
      if (w === lastW && h === lastH) return;
      lastW = w;
      lastH = h;
      canvas!.width = w;
      canvas!.height = h;
      const cfg = useStudioStore.getState().composition?.background ?? DEFAULT_BACKGROUND;
      const pixelSize = Math.max(1, Math.round(cfg.pixelSize ?? 4));
      setupWork(w, h, pixelSize);
      lastPixelSize = pixelSize;
      setupGrain(w, h);
      ctx!.fillStyle = 'rgb(0,0,0)';
      ctx!.fillRect(0, 0, w, h);
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    function drawGrain() {
      if (!grainCanvas || !grainCtx || !grainData) return;
      // Refresh noise pattern every 3 frames, composite every frame
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
      const pixelSize = Math.max(1, Math.round(cfg.pixelSize ?? 4));

      if (!cfg.enabled) {
        ctx!.globalCompositeOperation = 'source-over';
        ctx!.fillStyle = 'rgb(0,0,0)';
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

      // Recreate work canvas when pixel size changes
      if (pixelSize !== lastPixelSize) {
        setupWork(w, h, pixelSize);
        lastPixelSize = pixelSize;
      }

      if (!workCtx || !workCanvas) {
        raf = requestAnimationFrame(tick);
        return;
      }

      const ww = workCanvas.width;
      const wh = workCanvas.height;

      const signals = audioEngine.getSignals();
      const r = cfg.reactivity;

      // Beat detection
      const beat = beatDetector.detectBeat(signals.bass, 0.65, 300);
      if (beat) beatPulse = 0.25;
      beatPulse = Math.max(0, beatPulse - 0.008);

      t += 0.006 + signals.mid * r * 0.01;
      if (t > 1e6) t -= 1e6;

      const phaseShift = signals.treble * r * 0.8;

      // Blob geometry — computed in work-canvas space so pixelSize doesn't
      // affect the visual proportions of the blobs
      const cx_w = ww / 2;
      const cy_w = wh / 2;
      const spreadX_w = ww * (0.2 + signals.volume * r * 0.08);
      const spreadY_w = wh * (0.2 + signals.volume * r * 0.08);
      const blobRadius_w =
        Math.min(ww, wh) * 0.52 +
        beatPulse * Math.min(ww, wh) * 0.18 +
        signals.volume * r * Math.min(ww, wh) * 0.15;

      // Glow intensity with volume pulse — drives blob alpha stops
      const glowBase = Math.max(0, Math.min(1, cfg.glowIntensity ?? 0.5));
      const glow = Math.min(1, glowBase + signals.volume * r * 0.5);

      const colors = cfg.colors.length > 0 ? cfg.colors : DEFAULT_BACKGROUND.colors;

      // ---- Fade work canvas toward pure black ----
      const fadeAlpha = 0.028 + (beat ? 0.04 : 0);
      workCtx.globalCompositeOperation = 'source-over';
      workCtx.fillStyle = `rgba(0,0,0,${fadeAlpha})`;
      workCtx.fillRect(0, 0, ww, wh);

      // ---- Draw blobs to work canvas (screen = additive light) ----
      workCtx.globalCompositeOperation = 'screen';

      for (let i = 0; i < colors.length; i++) {
        const orbit = BLOB_ORBITS[i % BLOB_ORBITS.length];
        const blobT = t + orbit.phase;
        const bx_w = cx_w + spreadX_w * Math.sin(orbit.a * blobT + phaseShift);
        const by_w = cy_w + spreadY_w * Math.sin(orbit.b * blobT);

        const grad = workCtx.createRadialGradient(bx_w, by_w, 0, bx_w, by_w, blobRadius_w);
        grad.addColorStop(0,    hexToRgba(colors[i].hex, glow * 0.88));
        grad.addColorStop(0.45, hexToRgba(colors[i].hex, glow * 0.35));
        grad.addColorStop(1,    hexToRgba(colors[i].hex, 0));
        workCtx.fillStyle = grad;
        workCtx.fillRect(0, 0, ww, wh);
      }

      // ---- Upscale work canvas → main canvas (no smoothing = chunky pixels) ----
      ctx!.globalCompositeOperation = 'source-over';
      ctx!.globalAlpha = 1;
      ctx!.imageSmoothingEnabled = false;
      ctx!.drawImage(workCanvas, 0, 0, ww, wh, 0, 0, w, h);

      // ---- Grain overlay at full resolution ----
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
