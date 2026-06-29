// components/editor/ElementRenderer.tsx
import type {
  Element,
  TextElement,
  AsciiArtElement,
  DividerElement,
  DecorativeElement,
  LiveElementOverride,
} from '@/lib/types';
import { SPRITE_CONTENT } from '@/lib/library/sprites';
import { VisualizerRenderer } from './visualizer/VisualizerRenderer';

const FONT_MAP: Record<string, string> = {
  'jetbrains-mono': "'JetBrains Mono', monospace",
  'ibm-plex-mono': "'IBM Plex Mono', monospace",
  'fira-code': "'Fira Code', monospace",
  'vt323': "'VT323', monospace",
};

function resolveColor(
  h: number,
  s: number,
  l: number,
  hueOverride?: number
): string {
  return `hsl(${hueOverride !== undefined ? hueOverride : h}, ${s}%, ${l}%)`;
}

function TextRenderer({
  el,
  override,
}: {
  el: TextElement;
  override?: Partial<LiveElementOverride>;
}) {
  const color = resolveColor(el.color.h, el.color.s, el.color.l, override?.hue);
  const fontSize = override?.fontSize ?? el.fontSize;
  const content = override?.content ?? el.content;
  return (
    <pre
      style={{
        fontFamily: FONT_MAP[el.font] ?? 'monospace',
        fontSize,
        color,
        margin: 0,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
      }}
    >
      {content}
    </pre>
  );
}

function AsciiArtRenderer({
  el,
  override,
}: {
  el: AsciiArtElement;
  override?: Partial<LiveElementOverride>;
}) {
  const color = resolveColor(el.color.h, el.color.s, el.color.l, override?.hue);
  const fontSize = override?.fontSize ?? el.fontSize;
  const content = override?.content ?? el.content;
  return (
    <pre
      style={{
        fontFamily: FONT_MAP[el.font] ?? 'monospace',
        fontSize,
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

function DividerRenderer({
  el,
  override,
}: {
  el: DividerElement;
  override?: Partial<LiveElementOverride>;
}) {
  const color = resolveColor(el.color.h, el.color.s, el.color.l, override?.hue);
  const repeated = (override?.content ?? el.pattern).repeat(60).slice(0, 60);
  return (
    <pre
      style={{
        fontFamily: 'monospace',
        fontSize: 13,
        color,
        margin: 0,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        width: '100%',
      }}
    >
      {repeated}
    </pre>
  );
}

function DecorativeRenderer({
  el,
  override,
}: {
  el: DecorativeElement;
  override?: Partial<LiveElementOverride>;
}) {
  const color = resolveColor(el.color.h, el.color.s, el.color.l, override?.hue);
  const fontSize = override?.fontSize ?? el.fontSize;
  const content = override?.content ?? SPRITE_CONTENT[el.builtinId] ?? el.builtinId;
  return (
    <pre
      style={{
        fontFamily: 'monospace',
        fontSize,
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

interface ElementRendererProps {
  element: Element;
  liveOverride?: Partial<LiveElementOverride>;
  // Audio data for visualizer elements — undefined for non-visualizer elements
  audioSignal?: number;
  freqData?: Uint8Array;
  isPlaying?: boolean;
  sampleRate?: number;
}

export function ElementRenderer({
  element,
  liveOverride,
  audioSignal,
  freqData,
  isPlaying,
  sampleRate,
}: ElementRendererProps) {
  switch (element.type) {
    case 'text':
      return <TextRenderer el={element} override={liveOverride} />;
    case 'ascii_art':
      return <AsciiArtRenderer el={element} override={liveOverride} />;
    case 'divider':
      return <DividerRenderer el={element} override={liveOverride} />;
    case 'decorative':
      return <DecorativeRenderer el={element} override={liveOverride} />;
    case 'visualizer':
      return (
        <VisualizerRenderer
          element={element}
          signal={audioSignal ?? 0}
          freqData={freqData ?? new Uint8Array(0)}
          isPlaying={isPlaying ?? false}
          sampleRate={sampleRate ?? 44100}
        />
      );
  }
}
