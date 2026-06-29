'use client';
import { useRef, useState } from 'react';
import type { StrobeConfig } from '@/lib/types';
import { BeatDetector } from '@/lib/audio/BeatDetector';

interface StrobeLayerProps {
  children: React.ReactNode;
  signal: number;      // 0-1, current audio signal level
  config: StrobeConfig;
}

export function StrobeLayer({ children, signal, config }: StrobeLayerProps) {
  const beatDetectorRef = useRef(new BeatDetector());
  const [flashOn, setFlashOn] = useState(false);

  // If strobe is disabled, render children as-is
  if (!config.enabled) {
    return <>{children}</>;
  }

  // Detect beat and toggle flash state
  const beatDetected = beatDetectorRef.current.detectBeat(
    signal,
    config.threshold,
    config.speed
  );

  if (beatDetected) {
    setFlashOn((prev) => !prev);
  }

  return (
    <div
      style={{
        opacity: flashOn ? 0 : 1,
        transition: 'opacity 0.03s',
      }}
    >
      {children}
    </div>
  );
}
