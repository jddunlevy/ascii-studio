// components/editor/CanvasBackground.tsx
'use client';
import { useEffect, useRef } from 'react';
import { audioEngine } from '@/lib/audio/audioEngine';
import useStudioStore from '@/lib/store/studioStore';
import { DEFAULT_BACKGROUND } from '@/lib/composition/defaults';

export function CanvasBackground() {
  const divRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef(0);

  useEffect(() => {
    let raf: number;

    function tick() {
      // Read config fresh each frame — no React subscription needed
      const cfg = useStudioStore.getState().composition?.background ?? DEFAULT_BACKGROUND;

      if (!cfg.enabled) {
        if (divRef.current) divRef.current.style.opacity = '0';
        raf = requestAnimationFrame(tick);
        return;
      }

      const s = audioEngine.getSignals();

      // Advance hue by speed + bass acceleration
      hueRef.current = (hueRef.current + cfg.speed * 0.4 + s.bass * cfg.bassMultiplier) % 360;

      // Build evenly-spaced hue stops around the wheel
      const stops = Array.from({ length: cfg.hueCount }, (_, i) => {
        const h = (hueRef.current + cfg.baseHue + (360 / cfg.hueCount) * i) % 360;
        return `hsl(${h}deg, 90%, 38%)`;
      }).join(', ');

      const opacity = cfg.minOpacity + s.volume * (cfg.maxOpacity - cfg.minOpacity);

      if (divRef.current) {
        divRef.current.style.background = `linear-gradient(${cfg.angle}deg, ${stops})`;
        divRef.current.style.opacity = String(Math.min(1, Math.max(0, opacity)));
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
        mixBlendMode: 'color',
        zIndex: 0,
      }}
    />
  );
}
