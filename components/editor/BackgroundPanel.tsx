// components/editor/BackgroundPanel.tsx
'use client';
import { useState } from 'react';
import useStudioStore from '@/lib/store/studioStore';
import { DEFAULT_BACKGROUND } from '@/lib/composition/defaults';
import type { LissajousColor } from '@/lib/types';

const CURATED_SWATCHES = [
  // reds
  '#ff2020', '#e84040', '#c85858', '#a06060',
  // oranges
  '#ff6820', '#e87840', '#d49060', '#c8a880',
  // yellows
  '#ffe020', '#e8c840', '#d4b060', '#c8a040',
  // yellow-greens
  '#c8d420', '#a8b840', '#889060', '#a0b460',
  // greens
  '#40d840', '#58c070', '#70a878', '#78c870',
  // teals
  '#20d8a0', '#40c0a0', '#20c8c8', '#58b098',
  // blues
  '#2080ff', '#4090e8', '#60a0d4', '#4060c8',
  // indigos / purples
  '#6040ff', '#7858e8', '#8860c8', '#9070d4',
  // violets / pinks
  '#c020e0', '#b040c8', '#a058b0', '#c060d4',
  // pinks / magentas
  '#ff20a0', '#e84090', '#d06080', '#ff60c0',
  // warm muted (original)
  '#c8d4b8', '#b8c8d4', '#d4b8c8', '#d4c8b8',
  '#b8d4c8', '#c8b8d4', '#e8dcc8', '#d4d4b8',
  '#8c9078', '#907888', '#788890', '#f0e8d0',
  // neutrals
  '#ffffff', '#d0d0d0', '#a0a0a0', '#707070', '#404040', '#101010',
];

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 9,
        letterSpacing: '0.08em',
        textTransform: 'uppercase' as const,
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
    <div
      style={{
        padding: '4px 8px',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: 2,
      }}
    >
      {children}
    </div>
  );
}

export function BackgroundPanel() {
  const composition = useStudioStore((s) => s.composition);
  const updateBackground = useStudioStore((s) => s.updateBackground);
  const cfg = composition?.background ?? DEFAULT_BACKGROUND;

  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [hexInput, setHexInput] = useState('');

  function patchColors(newColors: LissajousColor[]) {
    updateBackground({ colors: newColors });
  }

  function addColor() {
    if (cfg.colors.length >= 5) return;
    const newColor: LissajousColor = { hex: '#e8dcc8' };
    patchColors([...cfg.colors, newColor]);
    setEditingIdx(cfg.colors.length);
    setHexInput('#e8dcc8');
  }

  function removeColor(idx: number) {
    if (cfg.colors.length <= 2) return;
    const next = cfg.colors.filter((_, i) => i !== idx);
    patchColors(next);
    if (editingIdx === idx) {
      setEditingIdx(null);
    } else if (editingIdx !== null && editingIdx > idx) {
      setEditingIdx(editingIdx - 1);
    }
  }

  function setColor(idx: number, hex: string) {
    patchColors(cfg.colors.map((c, i) => (i === idx ? { hex } : c)));
  }

  function handleSwatchClick(idx: number) {
    if (editingIdx === idx) {
      setEditingIdx(null);
    } else {
      setEditingIdx(idx);
      setHexInput(cfg.colors[idx]?.hex ?? '#e8dcc8');
    }
  }

  function handleHexInput(value: string) {
    setHexInput(value);
    if (/^#[0-9a-f]{6}$/i.test(value) && editingIdx !== null) {
      setColor(editingIdx, value.toLowerCase());
    }
  }

  return (
    <div style={{ fontSize: 11, borderTop: '2px solid var(--muted)' }}>
      {/* Header with enabled toggle */}
      <div
        style={{
          padding: '6px 8px',
          fontSize: 9,
          letterSpacing: '0.08em',
          textTransform: 'uppercase' as const,
          color: 'var(--muted)',
          borderBottom: '1px solid var(--muted)',
          background: 'var(--surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>BACKGROUND</span>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            margin: 0,
            textTransform: 'none' as const,
            letterSpacing: 0,
            color: 'var(--text)',
            fontSize: 9,
          }}
        >
          <input
            type="checkbox"
            checked={cfg.enabled}
            onChange={(e) => updateBackground({ enabled: e.target.checked })}
          />
          ON
        </label>
      </div>

      {/* Palette */}
      <SectionHeader>PALETTE</SectionHeader>
      <Row>
        {/* Swatch row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            flexWrap: 'wrap' as const,
          }}
        >
          {cfg.colors.map((color, idx) => (
            <div key={idx} style={{ position: 'relative' as const }}>
              <button
                onClick={() => handleSwatchClick(idx)}
                title={color.hex}
                style={{
                  width: 24,
                  height: 24,
                  background: color.hex,
                  border:
                    editingIdx === idx
                      ? '2px solid var(--accent)'
                      : '1px solid var(--muted)',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'block',
                }}
              />
              {cfg.colors.length > 2 && (
                <button
                  onClick={() => removeColor(idx)}
                  title="Remove color"
                  style={{
                    position: 'absolute' as const,
                    top: -6,
                    right: -6,
                    width: 12,
                    height: 12,
                    background: 'var(--surface)',
                    border: '1px solid var(--muted)',
                    fontSize: 8,
                    padding: 0,
                    cursor: 'pointer',
                    color: 'var(--muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          {cfg.colors.length < 5 && (
            <button
              onClick={addColor}
              title="Add color"
              style={{
                width: 24,
                height: 24,
                background: 'var(--bg)',
                border: '1px dashed var(--muted)',
                cursor: 'pointer',
                fontSize: 14,
                color: 'var(--muted)',
                padding: 0,
                lineHeight: '22px',
              }}
            >
              +
            </button>
          )}
        </div>

        {/* Color editor — shown when a swatch is selected */}
        {editingIdx !== null && (
          <div
            style={{
              marginTop: 8,
              borderTop: '1px solid var(--surface)',
              paddingTop: 6,
            }}
          >
            <div
              style={{
                fontSize: 9,
                color: 'var(--muted)',
                letterSpacing: '0.08em',
                marginBottom: 4,
              }}
            >
              SELECT
            </div>
            {/* Curated swatch grid */}
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 3 }}>
              {CURATED_SWATCHES.map((hex) => (
                <button
                  key={hex}
                  onClick={() => {
                    setColor(editingIdx, hex);
                    setHexInput(hex);
                  }}
                  title={hex}
                  style={{
                    width: 16,
                    height: 16,
                    background: hex,
                    border:
                      cfg.colors[editingIdx]?.hex === hex
                        ? '2px solid var(--accent)'
                        : '1px solid var(--muted)',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                />
              ))}
            </div>
            {/* Hex input + native color picker */}
            <div
              style={{
                marginTop: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <div
                style={{
                  width: 16,
                  height: 16,
                  background: cfg.colors[editingIdx]?.hex ?? '#888888',
                  border: '1px solid var(--muted)',
                  flexShrink: 0,
                }}
              />
              <input
                type="text"
                value={hexInput}
                onChange={(e) => handleHexInput(e.target.value)}
                placeholder="#rrggbb"
                maxLength={7}
                style={{
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: 11,
                  width: 72,
                  padding: '2px 4px',
                  border: '1px solid var(--muted)',
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  outline: 'none',
                }}
              />
              <label
                title="Pick exact shade"
                style={{
                  width: 22,
                  height: 22,
                  border: '1px solid var(--muted)',
                  background: 'var(--surface)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  color: 'var(--muted)',
                  flexShrink: 0,
                  overflow: 'hidden',
                  position: 'relative' as const,
                }}
              >
                ⊙
                <input
                  type="color"
                  value={cfg.colors[editingIdx]?.hex ?? '#e8dcc8'}
                  onChange={(e) => {
                    const hex = e.target.value;
                    setColor(editingIdx, hex);
                    setHexInput(hex);
                  }}
                  style={{
                    position: 'absolute' as const,
                    opacity: 0,
                    width: '100%',
                    height: '100%',
                    cursor: 'pointer',
                    padding: 0,
                    border: 'none',
                  }}
                />
              </label>
            </div>
          </div>
        )}
      </Row>
      {/* Reactivity */}
      <SectionHeader>REACTIVITY</SectionHeader>
      <Row>
        <label
          style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.08em' }}
        >
          0 (SUBTLE) → 1 (INTENSE)
        </label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={cfg.reactivity}
          onChange={(e) =>
            updateBackground({ reactivity: parseFloat(e.target.value) })
          }
          style={{ width: '100%' }}
        />
        <span style={{ color: 'var(--muted)', fontSize: 9 }}>
          {cfg.reactivity.toFixed(2)}
        </span>
      </Row>
    </div>
  );
}