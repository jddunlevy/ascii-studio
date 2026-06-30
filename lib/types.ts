export type SignalName = 'volume' | 'bass' | 'mid' | 'treble';

export type VisualProperty =
  | 'hue'
  | 'fontSize'
  | 'x'
  | 'y'
  | 'rotation'
  | 'opacity'
  | 'content';

export type VisualizerType = 'spectrum' | 'pulse' | 'text';

export type RenderStyle = 'star' | 'dot' | 'wave' | 'bars' | 'block' | 'text';

export interface StrobeConfig {
  enabled: boolean;
  threshold: number;    // 0-1, audio level that triggers strobe
  speed: number;        // ms between flashes when active
}

export interface SpectrumConfig {
  barCount: number;           // 4-32 bars
  freqRanges: number[];       // frequency boundaries in Hz
  barChar: string;            // character to render bars: █, ▓, |, etc.
  direction: 'vertical' | 'horizontal';
  spacing: number;            // px between bars
  smoothing: number;          // 0-1, interpolation smoothness
  peakHold: boolean;          // show peak indicators
  decaySpeed: number;         // how fast bars fall (0-1)
}

export type ElementType = 'text' | 'ascii_art' | 'divider' | 'decorative' | 'visualizer';

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

export interface VisualizerElement extends BaseElement {
  type: 'visualizer';
  visualType: VisualizerType;
  renderStyle: RenderStyle;
  audioSignal: SignalName;
  strobe: StrobeConfig;
  spectrum?: SpectrumConfig;
  fontSize: number;
  font?: FontName;
  content?: string;
}

export type Element =
  | TextElement
  | AsciiArtElement
  | DividerElement
  | DecorativeElement
  | VisualizerElement;

export interface CanvasConfig {
  width: number;
  height: number;
  grid: number;
}

export interface LissajousColor {
  hex: string; // '#rrggbb'
}

export interface BackgroundConfig {
  enabled: boolean;
  colors: LissajousColor[];    // 2–5 colors, gradient along Lissajous curve
  glow: boolean;               // retained for storage compatibility; not used by renderer
  reactivity: number;          // 0–1, scales audio influence on figure parameters
  darkMode: boolean;           // retained for storage compatibility; always dark now
  glowIntensity?: number;      // 0–1, blob center brightness (pulses with volume)
  pixelSize?: number;          // 1–32, pixelation block size (1 = off)
  spotlightSize?: number;      // 0.1–3, multiplier on spotlight radius
  spotlightSpeed?: number;     // 0–4, multiplier on animation speed
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
