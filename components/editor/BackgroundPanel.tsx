// components/editor/BackgroundPanel.tsx
'use client';
import useStudioStore from '@/lib/store/studioStore';
import { DEFAULT_BACKGROUND } from '@/lib/composition/defaults';

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

function InlineRow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
      {children}
    </div>
  );
}

export function BackgroundPanel() {
  const composition = useStudioStore((s) => s.composition);
  const updateBackground = useStudioStore((s) => s.updateBackground);

  const cfg = composition?.background ?? DEFAULT_BACKGROUND;

  function patch<K extends keyof typeof cfg>(key: K, value: (typeof cfg)[K]) {
    updateBackground({ [key]: value } as Partial<typeof cfg>);
  }

  return (
    <div style={{ fontSize: 11, borderTop: '2px solid var(--muted)' }}>
      {/* Header */}
      <div
        style={{
          padding: '6px 8px',
          fontSize: 9,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          borderBottom: '1px solid var(--muted)',
          background: 'var(--surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>BACKGROUND</span>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, margin: 0, textTransform: 'none', letterSpacing: 0, color: 'var(--text)', fontSize: 9 }}>
          <input
            type="checkbox"
            checked={cfg.enabled}
            onChange={(e) => patch('enabled', e.target.checked)}
          />
          ON
        </label>
      </div>

      {/* Base Hue */}
      <SectionHeader>BASE HUE</SectionHeader>
      <Row>
        <label>0 – 360</label>
        <input
          type="range"
          min={0}
          max={360}
          step={1}
          value={cfg.baseHue}
          onChange={(e) => patch('baseHue', parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
        <span style={{ color: 'var(--muted)' }}>{cfg.baseHue}°</span>
      </Row>

      {/* Hue Count */}
      <SectionHeader>HUE STOPS</SectionHeader>
      <Row>
        <label>NUMBER OF COLORS</label>
        <div style={{ display: 'flex', gap: 4 }}>
          {[2, 3, 4, 5, 6].map((n) => (
            <button
              key={n}
              onClick={() => patch('hueCount', n)}
              style={{
                flex: 1,
                padding: '2px 0',
                background: cfg.hueCount === n ? 'var(--accent)' : 'var(--surface)',
                color: cfg.hueCount === n ? 'var(--bg)' : 'var(--muted)',
                borderColor: cfg.hueCount === n ? 'var(--accent)' : 'var(--muted)',
              }}
            >
              {n}
            </button>
          ))}
        </div>
      </Row>

      {/* Direction */}
      <SectionHeader>DIRECTION</SectionHeader>
      <Row>
        <label>ANGLE (DEG)</label>
        <input
          type="number"
          min={0}
          max={360}
          value={cfg.angle}
          onChange={(e) => patch('angle', parseInt(e.target.value) || 0)}
          style={{ width: '100%' }}
        />
      </Row>

      {/* Speed */}
      <SectionHeader>DRIFT SPEED</SectionHeader>
      <Row>
        <label>0 (STILL) → 5 (FAST)</label>
        <input
          type="range"
          min={0}
          max={5}
          step={0.1}
          value={cfg.speed}
          onChange={(e) => patch('speed', parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
        <span style={{ color: 'var(--muted)' }}>{cfg.speed.toFixed(1)}</span>
      </Row>

      {/* Opacity range */}
      <SectionHeader>OPACITY</SectionHeader>
      <InlineRow>
        <div style={{ flex: 1 }}>
          <label>MIN</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={cfg.minOpacity}
            onChange={(e) => patch('minOpacity', parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
          <span style={{ color: 'var(--muted)' }}>{cfg.minOpacity.toFixed(2)}</span>
        </div>
        <div style={{ flex: 1 }}>
          <label>MAX</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={cfg.maxOpacity}
            onChange={(e) => patch('maxOpacity', parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
          <span style={{ color: 'var(--muted)' }}>{cfg.maxOpacity.toFixed(2)}</span>
        </div>
      </InlineRow>

      {/* Bass multiplier */}
      <SectionHeader>BASS REACTION</SectionHeader>
      <Row>
        <label>0 (NONE) → 5 (INTENSE)</label>
        <input
          type="range"
          min={0}
          max={5}
          step={0.1}
          value={cfg.bassMultiplier}
          onChange={(e) => patch('bassMultiplier', parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
        <span style={{ color: 'var(--muted)' }}>{cfg.bassMultiplier.toFixed(1)}</span>
      </Row>
    </div>
  );
}
