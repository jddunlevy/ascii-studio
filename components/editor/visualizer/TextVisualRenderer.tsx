'use client';
import type { VisualizerElement } from '@/lib/types';

const FONT_MAP: Record<string, string> = {
  'jetbrains-mono': "'JetBrains Mono', monospace",
  'ibm-plex-mono': "'IBM Plex Mono', monospace",
  'fira-code': "'Fira Code', monospace",
  'vt323': "'VT323', monospace",
};

interface TextVisualRendererProps {
  element: VisualizerElement;
  signal: number; // 0-1, current audio signal level
}

export function TextVisualRenderer({ element, signal }: TextVisualRendererProps) {
  // Get template content, fallback to "{signal:percent}" if undefined or empty
  const template = element.content?.trim() || '{signal:percent}';

  // Format signal as percent (0-1 -> 0-100%)
  const percentValue = Math.round(signal * 100);

  // Format signal as bar (8 characters: filled with ████, rest with ░)
  const filledCount = Math.floor(signal * 8);
  const emptyCount = 8 - filledCount;
  const barValue = '█'.repeat(filledCount) + '░'.repeat(emptyCount);

  // Format signal as decimal (2 decimal places)
  const decimalValue = signal.toFixed(2);

  // Replace all {signal:FORMAT} tokens with their formatted values
  const content = template
    .replace(/{signal:percent}/g, `${percentValue}%`)
    .replace(/{signal:bar}/g, barValue)
    .replace(/{signal:decimal}/g, decimalValue);

  const fontFamily = FONT_MAP[element.font ?? 'jetbrains-mono'] ?? 'monospace';
  const color = `hsl(${element.color.h}, ${element.color.s}%, ${element.color.l}%)`;

  return (
    <pre
      style={{
        fontFamily,
        fontSize: element.fontSize,
        color,
        margin: 0,
        whiteSpace: 'pre',
        lineHeight: 1.2,
      }}
    >
      {content}
    </pre>
  );
}
