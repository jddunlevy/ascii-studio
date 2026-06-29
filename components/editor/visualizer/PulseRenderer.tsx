'use client';
import type { VisualizerElement } from '@/lib/types';

const SPRITE_CONTENT: Record<string, string> = {
  star: '★',
  dot: '·',
  wave: '~≈~~~',
  block: '▓▓▓',
};

interface PulseRendererProps {
  element: VisualizerElement;
  signal: number; // 0-1
}

export function PulseRenderer({ element, signal }: PulseRendererProps) {
  const content = SPRITE_CONTENT[element.renderStyle] ?? element.renderStyle;

  // Map signal to opacity (0.2 to 1.0)
  const opacity = 0.2 + signal * 0.8;

  // Map signal to fontSize (0.5x to 2.0x)
  const scaledFontSize = element.fontSize * (0.5 + signal * 1.5);

  const color = `hsl(${element.color.h}, ${element.color.s}%, ${element.color.l}%)`;

  return (
    <pre
      style={{
        fontFamily: 'monospace',
        fontSize: scaledFontSize,
        color,
        opacity,
        margin: 0,
        whiteSpace: 'pre',
        lineHeight: 1.2,
        transition: 'font-size 0.05s ease-out, opacity 0.05s ease-out',
      }}
    >
      {content}
    </pre>
  );
}
