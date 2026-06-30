// components/editor/CanvasBackground.tsx
'use client';
import { useEffect, useRef } from 'react';
import { audioEngine } from '@/lib/audio/audioEngine';
import useStudioStore from '@/lib/store/studioStore';
import { BeatDetector } from '@/lib/audio/BeatDetector';
import { DEFAULT_BACKGROUND } from '@/lib/composition/defaults';

// Each spotlight orbits the canvas center on its own circle.
// speed: angular velocity multiplier  |  phase: starting angle offset
const ORBITS = [
  { speed: 0.80, phase: 0 },
  { speed: 0.53, phase: Math.PI * 0.40 },
  { speed: 1.10, phase: Math.PI * 0.80 },
  { speed: 0.67, phase: Math.PI * 1.20 },
  { speed: 0.95, phase: Math.PI * 1.60 },
];

const BASE_TICK = 0.008; // radians per frame at speed = 1

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

    // Work canvas: spotlights render here at reduced resolution,
    // then upscaled with no smoothing for the pixelation effect.
    let workCanvas: HTMLCanvasElement | null = null;
    let workCtx: CanvasRenderingContext2D | null = null;

    // Grain canvas: full-res TV static composited on top each frame.
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
        workCtx.fillStyle = '#000';
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
      ctx!.fillStyle = '#000';
      ctx!.fillRect(0, 0, w, h);
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    function drawGrain() {
      if (!grainCanvas || !grainCtx || !grainData) return;
      grainFrame = (grainFrame + 1) % 3;
      if (grainFrame === 0) {
        const d = grainData.data;
        for (let i = 0; i < d.length; i += 4) {
          d[i] = d[i + 1] = d[i + 2] = 255;
          d[i + 3] = Math.random() * 18 | 0;
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
        ctx!.fillStyle = '#000';
        ctx!.fillRect(0, 0, canvas!.width, canvas!.height);
        raf = requestAnimationFrame(tick);
        return;
      }

      const w = canvas!.width;
      const h = canvas!.height;
      if (w === 0 || h === 0) { raf = requestAnimationFrame(tick); return; }

      if (pixelSize !== lastPixelSize) {
        setupWork(w, h, pixelSize);
        lastPixelSize = pixelSize;
      }
      if (!workCtx || !workCanvas) { raf = requestAnimationFrame(tick); return; }

      const ww = workCanvas.width;
      const wh = workCanvas.height;

      // Advance time
      t += BASE_TICK * Math.max(0, cfg.spotlightSpeed ?? 1.0);
      if (t > 1e6) t -= 1e6;

      // Beat pulse on glow intensity
      const signals = audioEngine.getSignals();
      const beat = beatDetector.detectBeat(signals.bass, 0.65, 300);
      if (beat) beatPulse = 1;
      beatPulse *= 0.92;

      const glowBase = Math.max(0, Math.min(1, cfg.glowIntensity ?? 0.5));
      const glow = Math.min(1, glowBase + signals.volume * (cfg.reactivity ?? 0.6) * 0.4 + beatPulse * 0.2);

      // Spotlight geometry in work-canvas space
      const cx_w = ww / 2;
      const cy_w = wh / 2;
      const orbitR_w  = Math.min(ww, wh) * 0.28;                          // orbit circle radius
      const beamR_w   = Math.min(ww, wh) * 0.45 * Math.max(0.1, cfg.spotlightSize ?? 1.0); // beam spread

      const colors = cfg.colors.length > 0 ? cfg.colors : DEFAULT_BACKGROUND.colors;

      // ---- Clear to black ----
      workCtx.globalCompositeOperation = 'source-over';
      workCtx.fillStyle = '#000';
      workCtx.fillRect(0, 0, ww, wh);

      // ---- Draw spotlights (screen blend = additive colored light) ----
      workCtx.globalCompositeOperation = 'screen';

      for (let i = 0; i < colors.length; i++) {
        const o = ORBITS[i % ORBITS.length];
        const angle = t * o.speed + o.phase;
        const x = cx_w + orbitR_w * Math.cos(angle);
        const y = cy_w + orbitR_w * Math.sin(angle);

        const grad = workCtx.createRadialGradient(x, y, 0, x, y, beamR_w);
        grad.addColorStop(0,    hexToRgba(colors[i].hex, glow));
        grad.addColorStop(0.35, hexToRgba(colors[i].hex, glow * 0.35));
        grad.addColorStop(1,    hexToRgba(colors[i].hex, 0));
        workCtx.fillStyle = grad;
        workCtx.fillRect(0, 0, ww, wh);
      }

      // ---- Upscale to main canvas (no smoothing = chunky pixels) ----
      ctx!.globalCompositeOperation = 'source-over';
      ctx!.globalAlpha = 1;
      ctx!.imageSmoothingEnabled = false;
      ctx!.drawImage(workCanvas, 0, 0, ww, wh, 0, 0, w, h);

      // ---- Grain at full resolution ----
      drawGrain();

      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
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
