import { nanoid } from 'nanoid';
import type {
  CompositionSpec,
  Element,
  ElementType,
  ElementColor,
  FontName,
  CanvasConfig,
} from '@/lib/types';

export const DEFAULT_FONT: FontName = 'jetbrains-mono';

export const DEFAULT_COLOR: ElementColor = { h: 30, s: 15, l: 20 };

const DEFAULT_CANVAS: CanvasConfig = {
  width: 1200,
  height: 800,
  grid: 8,
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
  }
}
