// components/editor/calibration/ElementSensitivity.tsx
'use client';
import useStudioStore from '@/lib/store/studioStore';
import type { ElementSensitivity as ElementSensitivityType } from '@/lib/types';

interface ElementSensitivityProps {
  elementId: string;
  sensitivity?: ElementSensitivityType;
}

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
  disabled?: boolean;
}

function RangeSlider({ label, value, min, max, step, onChange, disabled = false }: RangeSliderProps) {
  return (
    <div style={{ padding: '4px 8px', display: 'flex', flexDirection: 'column' as const, gap: 2 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{
          fontSize: 9,
          color: disabled ? 'var(--surface)' : 'var(--muted)',
          letterSpacing: '0.08em'
        }}>
          {label}
        </label>
        <span style={{
          color: disabled ? 'var(--surface)' : 'var(--text)',
          fontSize: 10,
          fontFamily: 'var(--font-mono, monospace)'
        }}>
          {value.toFixed(1)}x
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        disabled={disabled}
        style={{ width: '100%' }}
      />
    </div>
  );
}

export function ElementSensitivity({ elementId, sensitivity }: ElementSensitivityProps) {
  const setElementSensitivity = useStudioStore((s) => s.setElementSensitivity);

  const enabled = sensitivity?.enabled ?? false;
  const multiplier = sensitivity?.multiplier ?? 1.0;

  const handleToggle = (checked: boolean) => {
    if (checked) {
      setElementSensitivity(elementId, { enabled: true, multiplier: 1.0 });
    } else {
      setElementSensitivity(elementId, null);
    }
  };

  const handleMultiplierChange = (value: number) => {
    setElementSensitivity(elementId, { enabled: true, multiplier: value });
  };

  return (
    <div style={{ fontSize: 11 }}>
      <SectionHeader>PER-ELEMENT AUDIO SENSITIVITY</SectionHeader>

      <div style={{ padding: '6px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => handleToggle(e.target.checked)}
          id="element-sensitivity-enable"
        />
        <label
          htmlFor="element-sensitivity-enable"
          style={{
            display: 'inline',
            textTransform: 'none',
            letterSpacing: 0,
            color: 'var(--text)',
            fontSize: 10
          }}
        >
          Override global sensitivity
        </label>
      </div>

      <RangeSlider
        label="MULTIPLIER"
        value={multiplier}
        min={0.1}
        max={3.0}
        step={0.1}
        onChange={handleMultiplierChange}
        disabled={!enabled}
      />
    </div>
  );
}
