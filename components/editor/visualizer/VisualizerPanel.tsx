'use client';
import useStudioStore from '@/lib/store/studioStore';
import type {
  VisualizerElement,
  VisualizerType,
  RenderStyle,
  SignalName,
  SpectrumConfig,
  StrobeConfig,
} from '@/lib/types';

const VISUALIZER_TYPE_OPTIONS: { value: VisualizerType; label: string }[] = [
  { value: 'spectrum', label: 'Spectrum' },
  { value: 'pulse', label: 'Pulse' },
  { value: 'text', label: 'Text' },
];

const RENDER_STYLE_OPTIONS: Record<VisualizerType, RenderStyle[]> = {
  spectrum: ['bars', 'block'],
  pulse: ['star', 'dot', 'wave', 'block'],
  text: ['text'],
};

const SIGNAL_OPTIONS: { value: SignalName; label: string }[] = [
  { value: 'volume', label: 'Volume' },
  { value: 'bass', label: 'Bass' },
  { value: 'mid', label: 'Mid' },
  { value: 'treble', label: 'Treble' },
];

const DIRECTION_OPTIONS: { value: 'vertical' | 'horizontal'; label: string }[] =
  [
    { value: 'vertical', label: 'Vertical' },
    { value: 'horizontal', label: 'Horizontal' },
  ];

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 9,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--muted)',
        padding: '8px 8px 2px',
        borderTop: '1px solid var(--surface)',
        background: 'var(--surface)',
        marginTop: 4,
      }}
    >
      {children}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: '4px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
      {children}
    </div>
  );
}

interface VisualizerPanelProps {
  element: VisualizerElement;
}

export function VisualizerPanel({ element }: VisualizerPanelProps) {
  const updateVisualizer = useStudioStore((s) => s.updateVisualizer);

  function patch(changes: Partial<VisualizerElement>) {
    updateVisualizer(element.id, changes);
  }

  function patchSpectrum(changes: Partial<SpectrumConfig>) {
    if (!element.spectrum) return;
    updateVisualizer(element.id, {
      spectrum: { ...element.spectrum, ...changes },
    });
  }

  function patchStrobe(changes: Partial<StrobeConfig>) {
    updateVisualizer(element.id, {
      strobe: { ...element.strobe, ...changes },
    });
  }

  return (
    <div style={{ fontSize: 11 }}>
      {/* VISUALIZER Section */}
      <SectionHeader>VISUALIZER</SectionHeader>

      <Row>
        <label style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }}>
          TYPE
        </label>
        <select
          value={element.visualType}
          onChange={(e) => patch({ visualType: e.target.value as VisualizerType })}
          style={{ width: '100%' }}
        >
          {VISUALIZER_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </Row>

      <Row>
        <label style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }}>
          RENDER STYLE
        </label>
        <select
          value={element.renderStyle}
          onChange={(e) => patch({ renderStyle: e.target.value as RenderStyle })}
          style={{ width: '100%' }}
        >
          {RENDER_STYLE_OPTIONS[element.visualType].map((style) => (
            <option key={style} value={style}>{style}</option>
          ))}
        </select>
      </Row>

      <Row>
        <label style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }}>
          AUDIO SIGNAL
        </label>
        <select
          value={element.audioSignal}
          onChange={(e) => patch({ audioSignal: e.target.value as SignalName })}
          style={{ width: '100%' }}
        >
          {SIGNAL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </Row>

      {/* STROBE Section */}
      <SectionHeader>STROBE</SectionHeader>

      <Row>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="checkbox"
            checked={element.strobe.enabled}
            onChange={(e) => patchStrobe({ enabled: e.target.checked })}
            id="visualizer-strobe-enabled"
          />
          <label
            htmlFor="visualizer-strobe-enabled"
            style={{
              display: 'inline',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontSize: 9,
              color: 'var(--muted)',
            }}
          >
            ENABLED
          </label>
        </div>
      </Row>

      {element.strobe.enabled && (
        <>
          <Row>
            <label style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }}>
              THRESHOLD (0-1)
            </label>
            <input
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={element.strobe.threshold}
              onChange={(e) =>
                patchStrobe({ threshold: parseFloat(e.target.value) || 0 })
              }
              style={{ width: '100%' }}
            />
          </Row>

          <Row>
            <label style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }}>
              SPEED (MS)
            </label>
            <input
              type="number"
              min={10}
              max={1000}
              value={element.strobe.speed}
              onChange={(e) => patchStrobe({ speed: parseInt(e.target.value) || 100 })}
              style={{ width: '100%' }}
            />
          </Row>
        </>
      )}

      {/* SPECTRUM Section (only shown when visualType === 'spectrum') */}
      {element.visualType === 'spectrum' && (
        <>
          <SectionHeader>SPECTRUM</SectionHeader>

          <Row>
            <label style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }}>
              BAR COUNT (4-32)
            </label>
            <input
              type="number"
              min={4}
              max={32}
              value={element.spectrum?.barCount ?? 16}
              onChange={(e) =>
                patchSpectrum({ barCount: parseInt(e.target.value) || 16 })
              }
              style={{ width: '100%' }}
            />
          </Row>

          <Row>
            <label style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }}>
              BAR CHARACTER
            </label>
            <input
              type="text"
              maxLength={1}
              value={element.spectrum?.barChar ?? '█'}
              onChange={(e) =>
                patchSpectrum({ barChar: e.target.value || '█' })
              }
              style={{ width: '100%' }}
            />
          </Row>

          <Row>
            <label style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }}>
              DIRECTION
            </label>
            <select
              value={element.spectrum?.direction ?? 'vertical'}
              onChange={(e) =>
                patchSpectrum({
                  direction: e.target.value as 'vertical' | 'horizontal',
                })
              }
              style={{ width: '100%' }}
            >
              {DIRECTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Row>

          <Row>
            <label style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }}>
              SPACING (0-20)
            </label>
            <input
              type="number"
              min={0}
              max={20}
              value={element.spectrum?.spacing ?? 2}
              onChange={(e) =>
                patchSpectrum({ spacing: parseInt(e.target.value) || 0 })
              }
              style={{ width: '100%' }}
            />
          </Row>

          <Row>
            <label style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }}>
              SMOOTHING (0-1)
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={element.spectrum?.smoothing ?? 0.5}
              onChange={(e) =>
                patchSpectrum({ smoothing: parseFloat(e.target.value) || 0.5 })
              }
              style={{ width: '100%' }}
            />
            <span style={{ color: 'var(--muted)' }}>
              {(element.spectrum?.smoothing ?? 0.5).toFixed(2)}
            </span>
          </Row>

          <Row>
            <label style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }}>
              DECAY SPEED (0-1)
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={element.spectrum?.decaySpeed ?? 0.5}
              onChange={(e) =>
                patchSpectrum({ decaySpeed: parseFloat(e.target.value) || 0.5 })
              }
              style={{ width: '100%' }}
            />
            <span style={{ color: 'var(--muted)' }}>
              {(element.spectrum?.decaySpeed ?? 0.5).toFixed(2)}
            </span>
          </Row>
        </>
      )}

      {/* CONTENT Section (only shown when visualType === 'text') */}
      {element.visualType === 'text' && (
        <>
          <SectionHeader>CONTENT</SectionHeader>

          <Row>
            <label style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }}>
              TEMPLATE
            </label>
            <input
              type="text"
              value={element.content ?? ''}
              onChange={(e) => patch({ content: e.target.value })}
              style={{ width: '100%' }}
            />
          </Row>
        </>
      )}

      {/* STYLE Section */}
      <SectionHeader>STYLE</SectionHeader>

      <Row>
        <label style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }}>
          FONT SIZE (PX)
        </label>
        <input
          type="number"
          min={8}
          max={96}
          value={element.fontSize}
          onChange={(e) => patch({ fontSize: parseInt(e.target.value) || 13 })}
          style={{ width: '100%' }}
        />
      </Row>
    </div>
  );
}
