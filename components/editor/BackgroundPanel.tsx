// components/editor/BackgroundPanel.tsx
'use client';
import { useState } from 'react';
import useStudioStore from '@/lib/store/studioStore';
import { DEFAULT_BACKGROUND } from '@/lib/composition/defaults';
import type { BackgroundConfig } from '@/lib/types';

const SWATCHES = [
  // blacks & near-blacks
  '#000000', '#0d0d0d', '#1a1a1a', '#0a0a12',
  // dark tints
  '#1a0000', '#1a0a00', '#1a1a00', '#001a00',
  '#001a1a', '#00001a', '#1a001a', '#0a0a1a',
  // deep saturated
  '#3d0000', '#3d1a00', '#003d00', '#00003d',
  '#3d003d', '#003d3d', '#1a3d00', '#3d3d00',
  // mids
  '#800000', '#804000', '#008000', '#000080',
  '#800080', '#008080', '#408000', '#804000',
  // brights
  '#ff0000', '#ff6000', '#ffcc00', '#00cc00',
  '#00cccc', '#0000ff', '#cc00cc', '#00ffcc',
  // lights & pastels
  '#ff8080', '#ffbf80', '#ffff80', '#80ff80',
  '#80ffff', '#8080ff', '#ff80ff', '#c0ffc0',
  // greys & white
  '#404040', '#808080', '#c0c0c0', '#ffffff',
];

const SIGNALS = ['volume', 'bass', 'mid', 'treble'] as const;
const SIGNAL_LABELS: Record<typeof SIGNALS[number], string> = {
  volume: 'VOL', bass: 'BASS', mid: 'MID', treble: 'TREB',
};

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase' as const,
      color: 'var(--muted)', padding: '8px 8px 2px',
      borderTop: '1px solid var(--surface)', background: 'var(--surface)', marginTop: 4,
    }}>
      {children}
    </div>
  );
}

function ColorPicker({
  label, value, onChange,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  const [hexInput, setHexInput] = useState(value);

  function handleHex(v: string) {
    setHexInput(v);
    if (/^#[0-9a-f]{6}$/i.test(v)) onChange(v.toLowerCase());
  }

  // Keep local input in sync when value changes externally
  if (hexInput !== value && /^#[0-9a-f]{6}$/i.test(value)) {
    setHexInput(value);
  }

  return (
    <div style={{ padding: '4px 8px' }}>
      <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: 4 }}>
        {label}
      </div>
      {/* Preview + hex input + native picker */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
        <div style={{ width: 24, height: 24, background: value, border: '1px solid var(--muted)', flexShrink: 0 }} />
        <input
          type="text"
          value={hexInput}
          onChange={(e) => handleHex(e.target.value)}
          maxLength={7}
          placeholder="#000000"
          style={{
            fontFamily: 'var(--font-mono, monospace)', fontSize: 11, width: 72,
            padding: '2px 4px', border: '1px solid var(--muted)',
            background: 'var(--bg)', color: 'var(--text)', outline: 'none',
          }}
        />
        <label title="Pick shade" style={{
          width: 22, height: 22, border: '1px solid var(--muted)', background: 'var(--surface)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, color: 'var(--muted)', flexShrink: 0, overflow: 'hidden',
          position: 'relative' as const,
        }}>
          ⊙
          <input
            type="color"
            value={value}
            onChange={(e) => { onChange(e.target.value); setHexInput(e.target.value); }}
            style={{ position: 'absolute' as const, opacity: 0, width: '100%', height: '100%', cursor: 'pointer', padding: 0, border: 'none' }}
          />
        </label>
      </div>
      {/* Swatch grid */}
      <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 3 }}>
        {SWATCHES.map((hex) => (
          <button
            key={hex}
            onClick={() => { onChange(hex); setHexInput(hex); }}
            title={hex}
            style={{
              width: 14, height: 14, background: hex, padding: 0, cursor: 'pointer',
              border: value === hex ? '2px solid var(--accent)' : '1px solid var(--muted)',
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function BackgroundPanel() {
  const composition = useStudioStore((s) => s.composition);
  const updateBackground = useStudioStore((s) => s.updateBackground);
  const cfg: BackgroundConfig = { ...DEFAULT_BACKGROUND, ...(composition?.background ?? {}) };

  return (
    <div style={{ fontSize: 11, borderTop: '2px solid var(--muted)' }}>
      {/* Header */}
      <div style={{
        padding: '6px 8px', fontSize: 9, letterSpacing: '0.08em',
        textTransform: 'uppercase' as const, color: 'var(--muted)',
        borderBottom: '1px solid var(--muted)', background: 'var(--surface)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span>BACKGROUND</span>
        <label style={{
          display: 'flex', alignItems: 'center', gap: 4, margin: 0,
          textTransform: 'none' as const, letterSpacing: 0, color: 'var(--text)', fontSize: 9,
        }}>
          <input
            type="checkbox"
            checked={cfg.enabled}
            onChange={(e) => updateBackground({ enabled: e.target.checked })}
          />
          ON
        </label>
      </div>

      {/* Base color */}
      <SectionHeader>BASE COLOR</SectionHeader>
      <ColorPicker
        label="RESTING"
        value={cfg.baseColor}
        onChange={(hex) => updateBackground({ baseColor: hex })}
      />

      {/* React color */}
      <SectionHeader>SHIFT TO</SectionHeader>
      <ColorPicker
        label="ON SIGNAL"
        value={cfg.reactColor}
        onChange={(hex) => updateBackground({ reactColor: hex })}
      />

      {/* Signal selector */}
      <SectionHeader>SIGNAL</SectionHeader>
      <div style={{ padding: '4px 8px', display: 'flex', gap: 4 }}>
        {SIGNALS.map((sig) => {
          const active = (cfg.reactSignal ?? 'bass') === sig;
          return (
            <button
              key={sig}
              onClick={() => updateBackground({ reactSignal: sig })}
              style={{
                flex: 1, padding: '3px 0',
                background: active ? 'var(--accent)' : 'var(--surface)',
                color: active ? 'var(--bg)' : 'var(--muted)',
                border: `1px solid ${active ? 'var(--accent)' : 'var(--muted)'}`,
                cursor: 'pointer', fontSize: 9, letterSpacing: '0.08em', fontFamily: 'inherit',
              }}
            >
              {SIGNAL_LABELS[sig]}
            </button>
          );
        })}
      </div>

      {/* Reactivity */}
      <SectionHeader>REACTIVITY</SectionHeader>
      <div style={{ padding: '4px 8px', display: 'flex', flexDirection: 'column' as const, gap: 2 }}>
        <label style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.08em' }}>
          0 (SUBTLE) → 1 (INTENSE)
        </label>
        <input
          type="range" min={0} max={1} step={0.01}
          value={cfg.reactivity}
          onChange={(e) => updateBackground({ reactivity: parseFloat(e.target.value) })}
          style={{ width: '100%' }}
        />
        <span style={{ color: 'var(--muted)', fontSize: 9 }}>
          {cfg.reactivity.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
