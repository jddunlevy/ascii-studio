// components/editor/BindingRow.tsx
'use client';
import { useState } from 'react';
import useStudioStore from '@/lib/store/studioStore';
import type { Binding, SignalName, VisualProperty } from '@/lib/types';

const SIGNAL_OPTIONS: SignalName[] = ['volume', 'bass', 'mid', 'treble'];
const PROPERTY_OPTIONS: VisualProperty[] = [
  'hue', 'fontSize', 'x', 'y', 'rotation', 'opacity', 'content',
];

interface BindingRowProps {
  binding: Binding;
}

export function BindingRow({ binding }: BindingRowProps) {
  const updateBinding = useStudioStore((s) => s.updateBinding);
  const removeBinding = useStudioStore((s) => s.removeBinding);
  const composition = useStudioStore((s) => s.composition);
  const [expanded, setExpanded] = useState(false);

  const elements = composition?.elements ?? [];
  const isContent = binding.property === 'content';

  function patch(changes: Partial<Binding>) {
    updateBinding(binding.id, changes);
  }

  function patchTransform(changes: Partial<Binding['transform']>) {
    updateBinding(binding.id, { transform: { ...binding.transform, ...changes } });
  }

  const framesText = (binding.frames ?? []).join('\n');

  function handleFramesChange(text: string) {
    patch({ frames: text.split('\n') });
  }

  return (
    <div
      style={{
        borderBottom: '1px solid var(--surface)',
        padding: '6px 8px',
        background: 'var(--bg)',
        fontSize: 11,
      }}
    >
      {/* Row 1: element selector */}
      <div style={{ marginBottom: 4 }}>
        <label>ELEMENT</label>
        <select
          value={binding.elementId}
          onChange={(e) => patch({ elementId: e.target.value })}
          style={{ width: '100%' }}
        >
          <option value="">-- none --</option>
          {elements.map((el) => (
            <option key={el.id} value={el.id}>
              {el.id.slice(0, 8)} ({el.type})
            </option>
          ))}
        </select>
      </div>

      {/* Row 2: signal → property */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
        <select
          value={binding.signal}
          onChange={(e) => patch({ signal: e.target.value as SignalName })}
          style={{ flex: 1 }}
        >
          {SIGNAL_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <span style={{ color: 'var(--muted)' }}>→</span>
        <select
          value={binding.property}
          onChange={(e) => {
            const prop = e.target.value as VisualProperty;
            patch({ property: prop });
            if (prop !== 'content') setExpanded(false);
          }}
          style={{ flex: 1 }}
        >
          {PROPERTY_OPTIONS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* Row 3: transform controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
        {!isContent && (
          <>
            <div style={{ flex: 1 }}>
              <label>MIN</label>
              <input
                type="number"
                value={binding.transform.min}
                onChange={(e) => patchTransform({ min: parseFloat(e.target.value) || 0 })}
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label>MAX</label>
              <input
                type="number"
                value={binding.transform.max}
                onChange={(e) => patchTransform({ max: parseFloat(e.target.value) || 0 })}
                style={{ width: '100%' }}
              />
            </div>
          </>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingTop: isContent ? 0 : 10 }}>
          <label style={{ margin: 0, display: 'inline' }}>INV</label>
          <input
            type="checkbox"
            checked={binding.transform.invert}
            onChange={(e) => patchTransform({ invert: e.target.checked })}
          />
        </div>
      </div>

      {/* Row 4: expand frames + delete */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {isContent && (
          <button
            onClick={() => setExpanded((v) => !v)}
            style={{ padding: '2px 6px' }}
          >
            {expanded ? '▾' : '▸'} FRAMES
          </button>
        )}
        <button
          onClick={() => removeBinding(binding.id)}
          style={{ marginLeft: 'auto', color: 'var(--muted)', borderColor: 'var(--muted)' }}
        >
          ✕
        </button>
      </div>

      {/* Frame sequence textarea */}
      {isContent && expanded && (
        <div style={{ marginTop: 4 }}>
          <label>FRAMES (one per line)</label>
          <textarea
            value={framesText}
            onChange={(e) => handleFramesChange(e.target.value)}
            rows={6}
            style={{ width: '100%', resize: 'vertical', fontFamily: 'monospace', fontSize: 11 }}
            placeholder={' \n·\n▒\n█'}
          />
        </div>
      )}
    </div>
  );
}
