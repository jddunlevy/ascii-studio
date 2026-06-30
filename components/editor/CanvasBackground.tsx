// components/editor/CanvasBackground.tsx
'use client';
import { useEffect, useRef } from 'react';
import { audioEngine } from '@/lib/audio/audioEngine';
import useStudioStore from '@/lib/store/studioStore';
import { DEFAULT_BACKGROUND } from '@/lib/composition/defaults';

function parseHex(hex: string): [number, number, number] {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return [0, 0, 0];
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

function lerpColor(a: [number, number, number], b: [number, number, number], t: number): string {
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`;
}

export function CanvasBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf: number;
    let smooth = 0; // low-pass filtered signal value

    let lastW = 0, lastH = 0;
    function resize() {
      const w = canvas!.offsetWidth;
      const h = canvas!.offsetHeight;
      if (w === lastW && h === lastH) return;
      lastW = w; lastH = h;
      canvas!.width = w;
      canvas!.height = h;
    }
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    function tick() {
      const cfg = useStudioStore.getState().composition?.background ?? DEFAULT_BACKGROUND;
      const w = canvas!.width;
      const h = canvas!.height;
      if (w === 0 || h === 0) { raf = requestAnimationFrame(tick); return; }

      if (!cfg.enabled) {
        ctx!.fillStyle = '#000';
        ctx!.fillRect(0, 0, w, h);
        raf = requestAnimationFrame(tick);
        return;
      }

      const signals = audioEngine.getSignals();
      const raw = signals[cfg.reactSignal ?? 'bass'] ?? 0;
      const target = Math.min(1, raw * (cfg.reactivity ?? 0.6));
      smooth += (target - smooth) * 0.12; // smooth to avoid jitter

      ctx!.fillStyle = lerpColor(
        parseHex(cfg.baseColor ?? '#000000'),
        parseHex(cfg.reactColor ?? '#1a0a2e'),
        smooth
      );
      ctx!.fillRect(0, 0, w, h);

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
