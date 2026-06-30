import { nanoid } from 'nanoid';
import type {
  CompositionSpec,
  Element,
  ElementType,
  ElementColor,
  FontName,
  CanvasConfig,
  BackgroundConfig,
} from '@/lib/types';

export const DEFAULT_FONT: FontName = 'jetbrains-mono';

export const DEFAULT_COLOR: ElementColor = { h: 30, s: 15, l: 20 };

const DEFAULT_CANVAS: CanvasConfig = {
  width: 1200,
  height: 800,
  grid: 8,
};

export const DEFAULT_BACKGROUND: BackgroundConfig = {
  enabled: true,
  colors: [
    { hex: '#c8d4b8' }, // sage green
    { hex: '#b8c8d4' }, // soft blue
    { hex: '#d4b8c8' }, // dusty pink
  ],
  glow: false,
  reactivity: 0.6,
  darkMode: true,
  glowIntensity: 0.5,
  pixelSize: 4,
};

export function createComposition(name: string): CompositionSpec {
  const now = new Date().toISOString();
  return {
    id: nanoid(),
    name,
    createdAt: now,
    updatedAt: now,
    canvas: { ...DEFAULT_CANVAS },
    elements: [],
    bindings: [],
    background: { ...DEFAULT_BACKGROUND },
  };
}

export function createElement(
  type: ElementType,
  pos: { x: number; y: number },
  z: number
): Element {
  const base = {
    id: nanoid(),
    position: { x: pos.x, y: pos.y },
    size: { w: 160, h: 48 },
    z,
    rotation: 0,
    opacity: 1,
    color: { ...DEFAULT_COLOR },
    locked: false,
  };

  switch (type) {
    case 'text':
      return {
        ...base,
        type: 'text',
        content: 'text',
        font: DEFAULT_FONT,
        fontSize: 13,
      };
    case 'ascii_art':
      return {
        ...base,
        type: 'ascii_art',
        content: '█░░█\n█░░█\n████',
        font: DEFAULT_FONT,
        fontSize: 13,
        size: { w: 80, h: 64 },
      };
    case 'divider':
      return {
        ...base,
        type: 'divider',
        pattern: '─',
        size: { w: 240, h: 24 },
      };
    case 'decorative':
      return {
        ...base,
        type: 'decorative',
        builtinId: 'dot-grid',
        fontSize: 13,
        size: { w: 80, h: 64 },
      };
    case 'visualizer':
      return {
        ...base,
        type: 'visualizer',
        visualType: 'spectrum',
        renderStyle: 'bars',
        audioSignal: 'volume',
        strobe: {
          enabled: false,
          threshold: 0.7,
          speed: 100,
        },
        spectrum: {
          barCount: 16,
          freqRanges: [60, 250, 500, 2000, 4000, 8000, 16000],
          barChar: '█',
          direction: 'vertical',
          spacing: 4,
          smoothing: 0.8,
          peakHold: true,
          decaySpeed: 0.1,
        },
        fontSize: 13,
        size: { w: 240, h: 120 },
      };
  }
}
