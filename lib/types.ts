export type SignalName = 'volume' | 'bass' | 'mid' | 'treble';

export type VisualProperty =
  | 'hue'
  | 'fontSize'
  | 'x'
  | 'y'
  | 'rotation'
  | 'opacity'
  | 'content'
  | 'blur'
  | 'colorStop0Hue'
  | 'colorStop1Hue'
  | 'colorStop2Hue'
  | 'colorStop3Hue'
  | 'colorStop4Hue';

export type BindingMode = 'continuous' | 'threshold';

export type ThresholdAction = 'switch' | 'strobe' | 'pulse';

export interface ContinuousTransform {
  min: number;
  max: number;
  invert: boolean;
}

export interface ThresholdTransform {
  threshold: number;           // 0-1, signal level that triggers
  aboveValue: number | string; // value when signal >= threshold
  belowValue: number | string; // value when signal < threshold
  returnThreshold?: number;    // optional hysteresis (defaults to threshold)
  action: ThresholdAction;     // how the transition happens
  strobeSpeed?: number;        // ms per flash (for strobe action)
  pulseDuration?: number;      // ms to hold above value (for pulse action)
}

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

export type ElementType = 'text' | 'ascii_art' | 'divider' | 'decorative' | 'visualizer' | 'aura';

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
  mode?: BindingMode;                        // NEW - optional for backward compat
  transform?: Transform;                      // OLD - keep for migration
  continuousTransform?: ContinuousTransform;  // NEW - required if mode === 'continuous'
  thresholdTransform?: ThresholdTransform;    // NEW - required if mode === 'threshold'
  frames?: string[];
  calibration?: BindingCalibration;           // NEW - optional per-binding calibration
}

export interface GlobalAudioConfig {
  volumeSensitivity: number;    // 0.1 - 3.0, default 1.0
  bassSensitivity: number;      // 0.1 - 3.0, default 1.0
  midSensitivity: number;       // 0.1 - 3.0, default 1.0
  trebleSensitivity: number;    // 0.1 - 3.0, default 1.0
  noiseFloor: number;           // 0-0.2, default 0.05
  signalSmoothing: number;      // 0-1, default 0.5
}

export interface ElementSensitivity {
  enabled: boolean;
  multiplier: number;           // 0.1 - 3.0, default 1.0
}

export interface BindingCalibration {
  signalOffset: number;         // -1 to 1, default 0
  signalMultiplier: number;     // 0.1 - 3.0, default 1.0
  clampMin: number;             // 0-1, default 0
  clampMax: number;             // 0-1, default 1
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
  sensitivity?: ElementSensitivity;  // NEW - optional per-element calibration
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

export interface ColorStop {
  position: number;  // 0-1, distance from center
  color: string;     // hex color '#rrggbb'
}

export interface AuraElement extends BaseElement {
  type: 'aura';
  colorStops: ColorStop[];  // 2-5 stops, sorted by position
  blur: number;             // 0-100, softness/glow intensity
  blendMode?: 'normal' | 'screen' | 'overlay' | 'multiply';
}

export type Element =
  | TextElement
  | AsciiArtElement
  | DividerElement
  | DecorativeElement
  | VisualizerElement
  | AuraElement;

export interface ElementPreset {
  id: string;
  name: string;
  type: 'text' | 'ascii_art';
  content: string;
  createdAt: string;
  tags?: string[];
}

export interface PresetLibrary {
  presets: ElementPreset[];
}

export interface CanvasConfig {
  width: number;
  height: number;
  grid: number;
}

export interface BackgroundConfig {
  enabled: boolean;
  baseColor: string;                                   // '#rrggbb' — resting color
  reactColor: string;                                  // '#rrggbb' — color it shifts toward
  reactSignal: 'volume' | 'bass' | 'mid' | 'treble'; // which audio signal drives the shift
  reactivity: number;                                  // 0–1, strength of the shift
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
  globalAudioConfig?: GlobalAudioConfig;  // NEW - optional for backward compat
}
