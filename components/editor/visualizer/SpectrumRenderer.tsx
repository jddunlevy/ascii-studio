'use client';
import { useRef, useEffect } from 'react';
import type { VisualizerElement } from '@/lib/types';
import { calculateBarAmplitudes, smoothAmplitudes, applyDecay } from '@/lib/audio/SpectrumCalculator';

interface SpectrumRendererProps {
  element: VisualizerElement;
  freqData: Uint8Array;
  isPlaying: boolean;
}

export function SpectrumRenderer({ element, freqData, isPlaying }: SpectrumRendererProps) {
  const previousAmpsRef = useRef<number[]>([]);

  if (!element.spectrum) {
    return <div>No spectrum config</div>;
  }

  const { barCount, freqRanges, barChar, direction, spacing, smoothing, peakHold, decaySpeed } = element.spectrum;
  const sampleRate = 44100; // Typical sample rate

  // Calculate bar amplitudes
  let amplitudes = isPlaying
    ? calculateBarAmplitudes(freqData, barCount, freqRanges, sampleRate)
    : new Array(barCount).fill(0.1); // Fallback: 10% height when not playing

  // Apply smoothing
  if (previousAmpsRef.current.length === barCount) {
    amplitudes = smoothAmplitudes(amplitudes, previousAmpsRef.current, smoothing);
  }

  // Apply decay
  if (previousAmpsRef.current.length === barCount) {
    amplitudes = applyDecay(amplitudes, previousAmpsRef.current, decaySpeed);
  }

  previousAmpsRef.current = amplitudes;

  const color = `hsl(${element.color.h}, ${element.color.s}%, ${element.color.l}%)`;

  if (direction === 'vertical') {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: spacing, height: '100%' }}>
        {amplitudes.map((amp, i) => {
          const barHeight = Math.max(1, Math.floor(amp * element.size.h));
          const barContent = barChar.repeat(Math.ceil(barHeight / element.fontSize));
          return (
            <pre
              key={i}
              style={{
                fontFamily: 'monospace',
                fontSize: element.fontSize,
                color,
                margin: 0,
                whiteSpace: 'pre',
                lineHeight: 1,
                height: barHeight,
                overflow: 'hidden',
                writingMode: 'vertical-rl',
                textOrientation: 'upright',
              }}
            >
              {barContent}
            </pre>
          );
        })}
      </div>
    );
  }

  // Horizontal direction
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing }}>
      {amplitudes.map((amp, i) => {
        const barWidth = Math.max(1, Math.floor(amp * element.size.w));
        const barContent = barChar.repeat(Math.ceil(barWidth / (element.fontSize * 0.6)));
        return (
          <pre
            key={i}
            style={{
              fontFamily: 'monospace',
              fontSize: element.fontSize,
              color,
              margin: 0,
              whiteSpace: 'nowrap',
              lineHeight: 1,
              width: barWidth,
              overflow: 'hidden',
            }}
          >
            {barContent}
          </pre>
        );
      })}
    </div>
  );
}
