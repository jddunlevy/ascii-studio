'use client';
import { useState } from 'react';
import { nanoid } from 'nanoid';
import useStudioStore from '@/lib/store/studioStore';
import { DEFAULT_COLOR } from '@/lib/composition/defaults';
import type { VisualizerType, RenderStyle, SignalName, VisualizerElement } from '@/lib/types';

interface VisualizerModalProps {
  onClose: () => void;
}

const VISUALIZER_TYPES: VisualizerType[] = ['spectrum', 'pulse', 'text'];
const SIGNAL_OPTIONS: SignalName[] = ['volume', 'bass', 'mid', 'treble'];

const RENDER_STYLE_OPTIONS: Record<VisualizerType, RenderStyle[]> = {
  spectrum: ['bars', 'block'],
  pulse: ['star', 'dot', 'wave', 'block'],
  text: ['text'],
};

const DEFAULT_RENDER_STYLE: Record<VisualizerType, RenderStyle> = {
  spectrum: 'bars',
  pulse: 'star',
  text: 'text',
};

export function VisualizerModal({ onClose }: VisualizerModalProps) {
  const [visualType, setVisualType] = useState<VisualizerType>('spectrum');
  const [renderStyle, setRenderStyle] = useState<RenderStyle>('bars');
  const [audioSignal, setAudioSignal] = useState<SignalName>('volume');
  const [templateContent, setTemplateContent] = useState('vol: {signal:percent}');

  const addVisualizer = useStudioStore((s) => s.addVisualizer);

  function handleVisualTypeChange(newType: VisualizerType) {
    setVisualType(newType);
    // Update renderStyle to default for this type if current one isn't valid
    const validStyles = RENDER_STYLE_OPTIONS[newType];
    if (!validStyles.includes(renderStyle)) {
      setRenderStyle(DEFAULT_RENDER_STYLE[newType]);
    }
  }

  function handleAdd() {
    const element: VisualizerElement = {
      id: nanoid(),
      type: 'visualizer',
      visualType,
      renderStyle,
      audioSignal,
      strobe: { enabled: false, threshold: 0.8, speed: 100 },
      spectrum:
        visualType === 'spectrum'
          ? {
              barCount: 16,
              freqRanges: Array.from({ length: 16 + 1 }, (_, i) =>
                Math.round(20 * Math.pow(20000 / 20, i / 16))
              ),
              barChar: '█',
              direction: 'vertical',
              spacing: 2,
              smoothing: 0.7,
              peakHold: false,
              decaySpeed: 0.1,
            }
          : undefined,
      fontSize: 16,
      font: 'jetbrains-mono',
      content: visualType === 'text' ? templateContent : undefined,
      position: { x: 100, y: 100 },
      size: { w: 200, h: 120 },
      z: 1,
      rotation: 0,
      opacity: 1,
      color: { ...DEFAULT_COLOR },
      locked: false,
    };

    addVisualizer(element);
    onClose();
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
      }}
    >
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--muted)',
          padding: 24,
          width: 320,
          fontFamily: 'monospace',
        }}
      >
        {/* Header */}
        <div
          style={{
            fontSize: 9,
            color: 'var(--muted)',
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            borderBottom: '1px solid var(--muted)',
            paddingBottom: 12,
            marginBottom: 12,
          }}
        >
          VISUALIZER
        </div>

        {/* Form fields */}
        <div style={{ marginBottom: 12 }}>
          <label
            style={{
              display: 'block',
              fontSize: 9,
              color: 'var(--muted)',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            TYPE
          </label>
          <select
            value={visualType}
            onChange={(e) => handleVisualTypeChange(e.target.value as VisualizerType)}
            style={{
              width: '100%',
              fontFamily: 'monospace',
              fontSize: 11,
              padding: '4px 6px',
              border: '1px solid var(--muted)',
              background: 'var(--bg)',
              color: 'var(--text)',
            }}
          >
            {VISUALIZER_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label
            style={{
              display: 'block',
              fontSize: 9,
              color: 'var(--muted)',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            RENDER STYLE
          </label>
          <select
            value={renderStyle}
            onChange={(e) => setRenderStyle(e.target.value as RenderStyle)}
            style={{
              width: '100%',
              fontFamily: 'monospace',
              fontSize: 11,
              padding: '4px 6px',
              border: '1px solid var(--muted)',
              background: 'var(--bg)',
              color: 'var(--text)',
            }}
          >
            {RENDER_STYLE_OPTIONS[visualType].map((style) => (
              <option key={style} value={style}>
                {style}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label
            style={{
              display: 'block',
              fontSize: 9,
              color: 'var(--muted)',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            SIGNAL
          </label>
          <select
            value={audioSignal}
            onChange={(e) => setAudioSignal(e.target.value as SignalName)}
            style={{
              width: '100%',
              fontFamily: 'monospace',
              fontSize: 11,
              padding: '4px 6px',
              border: '1px solid var(--muted)',
              background: 'var(--bg)',
              color: 'var(--text)',
            }}
          >
            {SIGNAL_OPTIONS.map((signal) => (
              <option key={signal} value={signal}>
                {signal}
              </option>
            ))}
          </select>
        </div>

        {/* Template field (only for text visualizer) */}
        {visualType === 'text' && (
          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                display: 'block',
                fontSize: 9,
                color: 'var(--muted)',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: 4,
              }}
            >
              TEMPLATE
            </label>
            <input
              type="text"
              value={templateContent}
              onChange={(e) => setTemplateContent(e.target.value)}
              style={{
                width: '100%',
                fontFamily: 'monospace',
                fontSize: 11,
                padding: '4px 6px',
                border: '1px solid var(--muted)',
                background: 'var(--bg)',
                color: 'var(--text)',
                boxSizing: 'border-box',
              }}
            />
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button
            onClick={handleAdd}
            style={{
              flex: 1,
              fontFamily: 'monospace',
              fontSize: 11,
              padding: '4px 8px',
              border: '1px solid var(--accent)',
              background: 'var(--accent)',
              color: 'var(--bg)',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            ADD
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              fontFamily: 'monospace',
              fontSize: 11,
              padding: '4px 8px',
              border: '1px solid var(--muted)',
              background: 'var(--bg)',
              color: 'var(--muted)',
              cursor: 'pointer',
            }}
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
}
