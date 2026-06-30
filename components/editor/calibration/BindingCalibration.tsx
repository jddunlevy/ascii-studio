// components/editor/calibration/BindingCalibration.tsx
'use client';
import { useState } from 'react';
import useStudioStore from '@/lib/store/studioStore';
import type { BindingCalibration as BindingCalibrationType, Binding } from '@/lib/types';

interface BindingCalibrationProps {
  binding: Binding;
}

const DEFAULT_CALIBRATION: BindingCalibrationType = {
  signalOffset: 0,
  signalMultiplier: 1.0,
  clampMin: 0,
  clampMax: 1,
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

interface RangeSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  unit?: string;
}

function RangeSlider({ label, value, min, max, step, onChange, unit = '' }: RangeSliderProps) {
  return (
    <div style={{ padding: '4px 8px', display: 'flex', flexDirection: 'column' as const, gap: 2 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.08em' }}>
          {label}
        </label>
        <span style={{ color: 'var(--text)', fontSize: 10, fontFamily: 'var(--font-mono, monospace)' }}>
          {value.toFixed(2)}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: '100%' }}
      />
    </div>
  );
}

export function BindingCalibration({ binding }: BindingCalibrationProps) {
  const updateBinding = useStudioStore((s) => s.updateBinding);
  const [expanded, setExpanded] = useState(false);

  const calibration: BindingCalibrationType = {
    ...DEFAULT_CALIBRATION,
    ...(binding.calibration ?? {}),
  };

  const handleCalibrationChange = (changes: Partial<BindingCalibrationType>) => {
    updateBinding(binding.id, {
      calibration: { ...calibration, ...changes },
    });
  };

  return (
    <div style={{ fontSize: 11, marginTop: 4 }}>
      {/* Collapse/Expand Button */}
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          padding: '2px 6px',
          fontSize: 9,
          letterSpacing: '0.08em',
          textTransform: 'uppercase' as const,
          width: '100%',
          textAlign: 'left',
          background: 'var(--surface)',
          borderColor: 'var(--surface)',
        }}
      >
        {expanded ? '▾' : '▸'} CALIBRATION
      </button>

      {/* Calibration Controls */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--surface)' }}>
          <SectionHeader>SIGNAL ADJUSTMENT</SectionHeader>

          <RangeSlider
            label="OFFSET"
            value={calibration.signalOffset}
            min={-1}
            max={1}
            step={0.01}
            onChange={(value) => handleCalibrationChange({ signalOffset: value })}
          />

          <RangeSlider
            label="MULTIPLIER"
            value={calibration.signalMultiplier}
            min={0.1}
            max={3.0}
            step={0.1}
            onChange={(value) => handleCalibrationChange({ signalMultiplier: value })}
            unit="x"
          />

          <SectionHeader>CLAMPING</SectionHeader>

          <RangeSlider
            label="MIN"
            value={calibration.clampMin}
            min={0}
            max={1}
            step={0.01}
            onChange={(value) => handleCalibrationChange({ clampMin: value })}
          />

          <RangeSlider
            label="MAX"
            value={calibration.clampMax}
            min={0}
            max={1}
            step={0.01}
            onChange={(value) => handleCalibrationChange({ clampMax: value })}
          />
        </div>
      )}
    </div>
  );
}
