'use client';
import { nanoid } from 'nanoid';
import useStudioStore from '@/lib/store/studioStore';
import type { SignalName, VisualProperty } from '@/lib/types';

const PRESETS = [
  {
    label: 'BASS PULSE',
    binding: {
      signal: 'bass' as SignalName,
      property: 'opacity' as VisualProperty,
      transform: { min: 0.2, max: 1.0, invert: false },
    },
  },
  {
    label: 'VOLUME FADE',
    binding: {
      signal: 'volume' as SignalName,
      property: 'opacity' as VisualProperty,
      transform: { min: 0.0, max: 1.0, invert: false },
    },
  },
  {
    label: 'HUE SHIFT',
    binding: {
      signal: 'treble' as SignalName,
      property: 'hue' as VisualProperty,
      transform: { min: 0, max: 360, invert: false },
    },
  },
  {
    label: 'SIZE PUMP',
    binding: {
      signal: 'bass' as SignalName,
      property: 'fontSize' as VisualProperty,
      transform: { min: 10, max: 32, invert: false },
    },
  },
];

interface BindingPresetsProps {
  elementId: string;
}

export function BindingPresets({ elementId }: BindingPresetsProps) {
  const addBinding = useStudioStore((s) => s.addBinding);

  if (!elementId) {
    return (
      <div style={{ padding: '6px 8px', color: 'var(--muted)', fontSize: 9 }}>
        Select an element to add presets.
      </div>
    );
  }

  function handleAdd(preset: typeof PRESETS[0]) {
    addBinding({
      id: nanoid(),
      elementId,
      ...preset.binding,
    });
  }

  return (
    <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--surface)' }}>
      <div
        style={{
          fontSize: 9,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          marginBottom: 4,
        }}
      >
        PRESETS
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            onClick={() => handleAdd(preset)}
            style={{
              fontSize: 9,
              padding: '2px 6px',
              fontFamily: 'monospace',
              border: '1px solid var(--muted)',
              background: 'var(--bg)',
              color: 'var(--muted)',
              cursor: 'pointer',
              letterSpacing: '0.04em',
            }}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}
