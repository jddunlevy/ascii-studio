// components/editor/BindingRow.tsx
'use client';
import { useState } from 'react';
import useStudioStore from '@/lib/store/studioStore';
import type { Binding, SignalName, VisualProperty, BindingMode, ThresholdAction, ContinuousTransform, ThresholdTransform } from '@/lib/types';
import { BindingPreview } from './binding/BindingPreview';
import { BindingCalibration } from './calibration/BindingCalibration';

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

  // Migration logic: default to continuous mode if no mode specified
  const mode: BindingMode = binding.mode ?? 'continuous';

  // Migrate old transform to continuousTransform if needed
  const continuousTransform: ContinuousTransform = binding.continuousTransform ??
    binding.transform ??
    { min: 0, max: 1, invert: false };

  const thresholdTransform: ThresholdTransform = binding.thresholdTransform ?? {
    threshold: 0.5,
    aboveValue: 1,
    belowValue: 0,
    action: 'switch',
  };

  function patch(changes: Partial<Binding>) {
    updateBinding(binding.id, changes);
  }

  function patchContinuousTransform(changes: Partial<ContinuousTransform>) {
    updateBinding(binding.id, {
      continuousTransform: { ...continuousTransform, ...changes },
    });
  }

  function patchThresholdTransform(changes: Partial<ThresholdTransform>) {
    updateBinding(binding.id, {
      thresholdTransform: { ...thresholdTransform, ...changes },
    });
  }

  function handleModeChange(newMode: BindingMode) {
    // When switching to threshold mode for content properties, set string defaults
    if (newMode === 'threshold' && isContent && typeof thresholdTransform.aboveValue === 'number') {
      updateBinding(binding.id, {
        mode: newMode,
        thresholdTransform: {
          ...thresholdTransform,
          aboveValue: '█',
          belowValue: ' ',
        },
      });
    } else {
      patch({ mode: newMode });
    }
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

      {/* Row 3: mode toggle */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        <button
          onClick={() => handleModeChange('continuous')}
          style={{
            flex: 1,
            padding: '4px 8px',
            background: mode === 'continuous' ? 'var(--accent)' : 'var(--surface)',
            color: mode === 'continuous' ? 'var(--bg)' : 'var(--text)',
            border: mode === 'continuous' ? '1px solid var(--accent)' : '1px solid var(--border)',
            cursor: 'pointer',
          }}
        >
          Continuous
        </button>
        <button
          onClick={() => handleModeChange('threshold')}
          style={{
            flex: 1,
            padding: '4px 8px',
            background: mode === 'threshold' ? 'var(--accent)' : 'var(--surface)',
            color: mode === 'threshold' ? 'var(--bg)' : 'var(--text)',
            border: mode === 'threshold' ? '1px solid var(--accent)' : '1px solid var(--border)',
            cursor: 'pointer',
          }}
        >
          Threshold
        </button>
      </div>

      {/* Row 4: mode-specific transform controls */}
      {mode === 'continuous' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
          {!isContent && (
            <>
              <div style={{ flex: 1 }}>
                <label>MIN</label>
                <input
                  type="number"
                  value={continuousTransform.min}
                  onChange={(e) => patchContinuousTransform({ min: parseFloat(e.target.value) || 0 })}
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label>MAX</label>
                <input
                  type="number"
                  value={continuousTransform.max}
                  onChange={(e) => patchContinuousTransform({ max: parseFloat(e.target.value) || 0 })}
                  style={{ width: '100%' }}
                />
              </div>
            </>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingTop: isContent ? 0 : 10 }}>
            <label style={{ margin: 0, display: 'inline' }}>INV</label>
            <input
              type="checkbox"
              checked={continuousTransform.invert}
              onChange={(e) => patchContinuousTransform({ invert: e.target.checked })}
            />
          </div>
        </div>
      )}

      {mode === 'threshold' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 4 }}>
          {/* Threshold and return threshold */}
          <div style={{ display: 'flex', gap: 4 }}>
            <div style={{ flex: 1 }}>
              <label>THRESHOLD</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={thresholdTransform.threshold}
                onChange={(e) => patchThresholdTransform({ threshold: parseFloat(e.target.value) })}
                style={{ width: '100%' }}
              />
              <div style={{ fontSize: 9, color: 'var(--muted)', textAlign: 'center' }}>
                {thresholdTransform.threshold.toFixed(2)}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <label>RETURN</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={thresholdTransform.returnThreshold ?? thresholdTransform.threshold}
                onChange={(e) => patchThresholdTransform({ returnThreshold: parseFloat(e.target.value) })}
                style={{ width: '100%' }}
              />
              <div style={{ fontSize: 9, color: 'var(--muted)', textAlign: 'center' }}>
                {(thresholdTransform.returnThreshold ?? thresholdTransform.threshold).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Above/Below values */}
          <div style={{ display: 'flex', gap: 4 }}>
            <div style={{ flex: 1 }}>
              <label>ABOVE VALUE</label>
              <input
                type={isContent ? 'text' : 'number'}
                value={thresholdTransform.aboveValue}
                onChange={(e) => {
                  const val = isContent ? e.target.value : parseFloat(e.target.value) || 0;
                  patchThresholdTransform({ aboveValue: val });
                }}
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label>BELOW VALUE</label>
              <input
                type={isContent ? 'text' : 'number'}
                value={thresholdTransform.belowValue}
                onChange={(e) => {
                  const val = isContent ? e.target.value : parseFloat(e.target.value) || 0;
                  patchThresholdTransform({ belowValue: val });
                }}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Action dropdown */}
          <div>
            <label>ACTION</label>
            <select
              value={thresholdTransform.action}
              onChange={(e) => patchThresholdTransform({ action: e.target.value as ThresholdAction })}
              style={{ width: '100%' }}
            >
              <option value="switch">Switch</option>
              <option value="strobe">Strobe</option>
              <option value="pulse">Pulse</option>
            </select>
          </div>

          {/* Strobe speed */}
          {thresholdTransform.action === 'strobe' && (
            <div>
              <label>STROBE SPEED (ms)</label>
              <input
                type="number"
                value={thresholdTransform.strobeSpeed ?? 100}
                onChange={(e) => patchThresholdTransform({ strobeSpeed: parseFloat(e.target.value) || 100 })}
                style={{ width: '100%' }}
                min="10"
                step="10"
              />
            </div>
          )}

          {/* Pulse duration */}
          {thresholdTransform.action === 'pulse' && (
            <div>
              <label>PULSE DURATION (ms)</label>
              <input
                type="number"
                value={thresholdTransform.pulseDuration ?? 200}
                onChange={(e) => patchThresholdTransform({ pulseDuration: parseFloat(e.target.value) || 200 })}
                style={{ width: '100%' }}
                min="10"
                step="10"
              />
            </div>
          )}
        </div>
      )}

      {/* Row 5: expand frames + delete */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {isContent && mode === 'continuous' && (
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

      {/* Binding Calibration */}
      <BindingCalibration binding={binding} />

      {/* Live preview */}
      <BindingPreview binding={binding} />
    </div>
  );
}
