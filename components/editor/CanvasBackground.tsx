// components/editor/CanvasBackground.tsx
'use client';
import { useEffect, useRef } from 'react';
import { audioEngine } from '@/lib/audio/audioEngine';

export function CanvasBackground() {
  const divRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef(0);

  useEffect(() => {
    let raf: number;

    function tick() {
      const s = audioEngine.getSignals();
      // Hue drifts continuously; bass pushes it faster
      hueRef.current = (hueRef.current + 0.4 + s.bass * 3) % 360;
      const h = hueRef.current;
      // Opacity swells with volume
      const opacity = 0.45 + s.volume * 0.4;

      if (divRef.current) {
        divRef.current.style.background = `linear-gradient(135deg,
          hsl(${h}deg, 90%, 40%),
          hsl(${(h + 120) % 360}deg, 85%, 35%),
          hsl(${(h + 240) % 360}deg, 90%, 38%))`;
        divRef.current.style.opacity = String(opacity);
      }

      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      ref={divRef}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        // color blend: tints the canvas surface without blowing out lightness
        mixBlendMode: 'color',
        zIndex: 0,
      }}
    />
  );
}
