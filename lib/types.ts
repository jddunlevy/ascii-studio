export type SignalName = 'volume' | 'bass' | 'mid' | 'treble';

export type VisualProperty =
  | 'hue'
  | 'fontSize'
  | 'x'
  | 'y'
  | 'rotation'
  | 'opacity'
  | 'content';

export type ElementType = 'text' | 'ascii_art' | 'divider' | 'decorative';

export type FontName =
  | 'jetbrains-mono'
  | 'ibm-plex-mono'
  | 'fira-code'
  | 'vt323';

export interface ElementColor {
  h: number;
  s: number;
  l: number;
}

export interface Transform {
  min: number;
  max: number;
  invert: boolean;
}

export interface Binding {
  id: string;
  elementId: string;
  signal: SignalName;
  property: VisualProperty;
  transform: Transform;
  frames?: string[];
}

export interface LiveElementOverride {
  hue: number;
  fontSize: number;
  x: number;
  y: number;
  rotation: number;
  opacity: number;
  content: string;
}

export type LiveValues = Record<string, Partial<LiveElementOverride>>;

export type Signals = Record<SignalName, number>;

interface BaseElement {
  id: string;
  type: ElementType;
  position: { x: number; y: number };
  size: { w: number; h: number };
  z: number;
  rotation: number;
  opacity: number;
  color: ElementColor;
  locked: boolean;
  gradient?: boolean;
}

export interface TextElement extends BaseElement {
  type: 'text';
  content: string;
  font: FontName;
  fontSize: number;
}

export interface AsciiArtElement extends BaseElement {
  type: 'ascii_art';
  content: string;
  font: FontName;
  fontSize: number;
}

export interface DividerElement extends BaseElement {
  type: 'divider';
  pattern: string;
}

export interface DecorativeElement extends BaseElement {
  type: 'decorative';
  builtinId: string;
  fontSize: number;
}

export type Element =
  | TextElement
  | AsciiArtElement
  | DividerElement
  | DecorativeElement;

export interface CanvasConfig {
  width: number;
  height: number;
  grid: number;
}

export interface BackgroundConfig {
  enabled: boolean;
  baseHue: number;        // starting hue 0–360
  hueCount: number;       // number of gradient stops 2–6
  angle: number;          // gradient direction in degrees
  speed: number;          // hue drift speed multiplier 0–5
  minOpacity: number;     // opacity when silent 0–1
  maxOpacity: number;     // opacity at peak volume 0–1
  bassMultiplier: number; // how much bass accelerates the drift 0–5
}

export interface CompositionSpec {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  canvas: CanvasConfig;
  elements: Element[];
  bindings: Binding[];
  background?: BackgroundConfig;
}
