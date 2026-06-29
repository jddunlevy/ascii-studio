// lib/library/sprites.ts
import { nanoid } from 'nanoid';
import { DEFAULT_COLOR, DEFAULT_FONT } from '@/lib/composition/defaults';
import type { Element } from '@/lib/types';

export const SPRITE_CONTENT: Record<string, string> = {
  'dot-grid': '· · ·\n· · ·\n· · ·',
  'block-fill': '▓▓▓\n▓▓▓\n▓▓▓',
  'cross': '─┼─\n │ \n─┼─',
  'bracket': '[ ]',
  'arrow-r': '─→',
  'arrow-d': '↓',
  'star': '★',
  'pulse': '·∘○◯',
  'wave': '~≈~~~',
  'hash': '###\n###\n###',
};

export interface PaletteItemDef {
  id: string;
  label: string;
  preview: string;
  createElement(pos: { x: number; y: number }, z: number): Element;
}

export const PALETTE_ITEMS: PaletteItemDef[] = [
  {
    id: 'text',
    label: 'TEXT',
    preview: 'Aa',
    createElement(pos, z) {
      return {
        id: nanoid(),
        type: 'text',
        content: 'text here',
        font: DEFAULT_FONT,
        fontSize: 13,
        position: { x: pos.x, y: pos.y },
        size: { w: 160, h: 24 },
        z,
        rotation: 0,
        opacity: 1,
        color: { ...DEFAULT_COLOR },
        locked: false,
      };
    },
  },
  {
    id: 'ascii_art',
    label: 'ASCII ART',
    preview: '▓▒░',
    createElement(pos, z) {
      return {
        id: nanoid(),
        type: 'ascii_art',
        content: '█░░█\n█░░█\n████',
        font: DEFAULT_FONT,
        fontSize: 13,
        position: { x: pos.x, y: pos.y },
        size: { w: 80, h: 64 },
        z,
        rotation: 0,
        opacity: 1,
        color: { ...DEFAULT_COLOR },
        locked: false,
      };
    },
  },
  {
    id: 'divider',
    label: 'DIVIDER',
    preview: '────',
    createElement(pos, z) {
      return {
        id: nanoid(),
        type: 'divider',
        pattern: '─',
        position: { x: pos.x, y: pos.y },
        size: { w: 240, h: 24 },
        z,
        rotation: 0,
        opacity: 1,
        color: { ...DEFAULT_COLOR },
        locked: false,
      };
    },
  },
];
