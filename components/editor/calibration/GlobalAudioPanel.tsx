// components/editor/calibration/GlobalAudioPanel.tsx
'use client';
import useStudioStore from '@/lib/store/studioStore';
import { DEFAULT_GLOBAL_AUDIO } from '@/lib/composition/defaults';
import type { GlobalAudioConfig } from '@/lib/types';

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

export function GlobalAudioPanel() {
  const composition = useStudioStore((s) => s.composition);
  const updateGlobalAudioConfig = useStudioStore((s) => s.updateGlobalAudioConfig);

  const cfg: GlobalAudioConfig = {
    ...DEFAULT_GLOBAL_AUDIO,
    ...(composition?.globalAudioConfig ?? {}),
  };

  return (
    <div style={{ fontSize: 11, borderTop: '2px solid var(--muted)' }}>
      {/* Header */}
      <div style={{
        padding: '6px 8px', fontSize: 9, letterSpacing: '0.08em',
        textTransform: 'uppercase' as const, color: 'var(--muted)',
        borderBottom: '1px solid var(--muted)', background: 'var(--surface)',
      }}>
        GLOBAL AUDIO CALIBRATION
      </div>

      {/* Signal Sensitivity Section */}
      <SectionHeader>SIGNAL SENSITIVITY</SectionHeader>

      <RangeSlider
        label="VOLUME"
        value={cfg.volumeSensitivity}
        min={0.1}
        max={3.0}
        step={0.1}
        onChange={(value) => updateGlobalAudioConfig({ volumeSensitivity: value })}
      />

      <RangeSlider
        label="BASS"
        value={cfg.bassSensitivity}
        min={0.1}
        max={3.0}
        step={0.1}
        onChange={(value) => updateGlobalAudioConfig({ bassSensitivity: value })}
      />

      <RangeSlider
        label="MID"
        value={cfg.midSensitivity}
        min={0.1}
        max={3.0}
        step={0.1}
        onChange={(value) => updateGlobalAudioConfig({ midSensitivity: value })}
      />

      <RangeSlider
        label="TREBLE"
        value={cfg.trebleSensitivity}
        min={0.1}
        max={3.0}
        step={0.1}
        onChange={(value) => updateGlobalAudioConfig({ trebleSensitivity: value })}
      />

      {/* Signal Processing Section */}
      <SectionHeader>SIGNAL PROCESSING</SectionHeader>

      <RangeSlider
        label="NOISE FLOOR"
        value={cfg.noiseFloor}
        min={0}
        max={0.2}
        step={0.01}
        onChange={(value) => updateGlobalAudioConfig({ noiseFloor: value })}
      />

      <RangeSlider
        label="SMOOTHING"
        value={cfg.signalSmoothing}
        min={0}
        max={1}
        step={0.05}
        onChange={(value) => updateGlobalAudioConfig({ signalSmoothing: value })}
      />
    </div>
  );
}
