// components/editor/Inspector.tsx
'use client';
import useStudioStore from '@/lib/store/studioStore';
import type { Element, FontName } from '@/lib/types';

const FONT_OPTIONS: { value: FontName; label: string }[] = [
  { value: 'jetbrains-mono', label: 'JetBrains Mono' },
  { value: 'ibm-plex-mono', label: 'IBM Plex Mono' },
  { value: 'fira-code', label: 'Fira Code' },
  { value: 'vt323', label: 'VT323' },
];

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

interface InspectorProps {}

export function Inspector(_props: InspectorProps) {
  const selectedElementId = useStudioStore((s) => s.selectedElementId);
  const composition = useStudioStore((s) => s.composition);
  const updateElement = useStudioStore((s) => s.updateElement);

  if (!selectedElementId || !composition) {
    return (
      <div style={{ padding: 12, color: 'var(--muted)', fontSize: 11 }}>
        Select an element.
      </div>
    );
  }

  const element = composition.elements.find((el) => el.id === selectedElementId);
  if (!element) {
    return (
      <div style={{ padding: 12, color: 'var(--muted)', fontSize: 11 }}>
        Element not found.
      </div>
    );
  }

  function patch(changes: Partial<Element>) {
    updateElement(selectedElementId!, changes as Partial<Element>);
  }

  const hasFont = element.type === 'text' || element.type === 'ascii_art';
  const hasFontSize = element.type === 'text' || element.type === 'ascii_art' || element.type === 'decorative';
  const hasContent = element.type === 'text' || element.type === 'ascii_art';
  const hasPattern = element.type === 'divider';

  const colorPreview = `hsl(${element.color.h}, ${element.color.s}%, ${element.color.l}%)`;

  return (
    <div style={{ fontSize: 11 }}>
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
        }}
      >
        INSPECTOR — {element.type.replace('_', ' ').toUpperCase()}
      </div>

      {/* Position */}
      <SectionHeader>POSITION</SectionHeader>
      <InlineRow>
        <div style={{ flex: 1 }}>
          <label>X</label>
          <input
            type="number"
            value={element.position.x}
            onChange={(e) =>
              patch({ position: { x: parseInt(e.target.value) || 0, y: element.position.y } })
            }
            style={{ width: '100%' }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label>Y</label>
          <input
            type="number"
            value={element.position.y}
            onChange={(e) =>
              patch({ position: { x: element.position.x, y: parseInt(e.target.value) || 0 } })
            }
            style={{ width: '100%' }}
          />
        </div>
      </InlineRow>

      {/* Size */}
      <SectionHeader>SIZE</SectionHeader>
      <InlineRow>
        <div style={{ flex: 1 }}>
          <label>W</label>
          <input
            type="number"
            value={element.size.w}
            onChange={(e) =>
              patch({ size: { w: parseInt(e.target.value) || 24, h: element.size.h } })
            }
            style={{ width: '100%' }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label>H</label>
          <input
            type="number"
            value={element.size.h}
            onChange={(e) =>
              patch({ size: { w: element.size.w, h: parseInt(e.target.value) || 16 } })
            }
            style={{ width: '100%' }}
          />
        </div>
      </InlineRow>

      {/* Rotation */}
      <SectionHeader>ROTATION</SectionHeader>
      <Row>
        <label>DEGREES (-360 to 360)</label>
        <input
          type="number"
          min={-360}
          max={360}
          value={element.rotation}
          onChange={(e) => patch({ rotation: parseInt(e.target.value) || 0 })}
          style={{ width: '100%' }}
        />
      </Row>

      {/* Opacity */}
      <SectionHeader>OPACITY</SectionHeader>
      <Row>
        <label>0 – 1</label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={element.opacity}
          onChange={(e) => patch({ opacity: parseFloat(e.target.value) })}
          style={{ width: '100%' }}
        />
        <span style={{ color: 'var(--muted)' }}>{element.opacity.toFixed(2)}</span>
      </Row>

      {/* Color */}
      <SectionHeader>COLOR</SectionHeader>
      <InlineRow>
        <div
          style={{
            width: 20,
            height: 20,
            background: colorPreview,
            border: '1px solid var(--muted)',
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1 }}>
          <label>H (0-360)</label>
          <input
            type="number"
            min={0}
            max={360}
            value={element.color.h}
            onChange={(e) =>
              patch({ color: { ...element.color, h: parseInt(e.target.value) || 0 } })
            }
            style={{ width: '100%' }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label>S (0-100)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={element.color.s}
            onChange={(e) =>
              patch({ color: { ...element.color, s: parseInt(e.target.value) || 0 } })
            }
            style={{ width: '100%' }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label>L (0-100)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={element.color.l}
            onChange={(e) =>
              patch({ color: { ...element.color, l: parseInt(e.target.value) || 0 } })
            }
            style={{ width: '100%' }}
          />
        </div>
      </InlineRow>

      {/* Font (text and ascii_art only) */}
      {hasFont && (
        <>
          <SectionHeader>FONT</SectionHeader>
          <Row>
            <label>TYPEFACE</label>
            <select
              value={(element as { font: FontName }).font}
              onChange={(e) => patch({ font: e.target.value as FontName } as Partial<Element>)}
              style={{ width: '100%' }}
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </Row>
        </>
      )}

      {/* Font Size (text, ascii_art, decorative) */}
      {hasFontSize && (
        <>
          <SectionHeader>FONT SIZE</SectionHeader>
          <Row>
            <label>PX</label>
            <input
              type="number"
              min={8}
              max={96}
              value={(element as { fontSize: number }).fontSize}
              onChange={(e) =>
                patch({ fontSize: parseInt(e.target.value) || 13 } as Partial<Element>)
              }
              style={{ width: '100%' }}
            />
          </Row>
        </>
      )}

      {/* Content (text only) */}
      {hasContent && (
        <>
          <SectionHeader>CONTENT</SectionHeader>
          <Row>
            <label>TEXT</label>
            <textarea
              value={(element as { content: string }).content}
              onChange={(e) => patch({ content: e.target.value } as Partial<Element>)}
              rows={4}
              style={{ width: '100%', resize: 'vertical', fontFamily: 'monospace', fontSize: 11 }}
            />
          </Row>
        </>
      )}

      {/* Pattern (divider only) */}
      {hasPattern && (
        <>
          <SectionHeader>PATTERN</SectionHeader>
          <Row>
            <label>CHARACTER(S)</label>
            <input
              type="text"
              value={(element as { pattern: string }).pattern}
              onChange={(e) => patch({ pattern: e.target.value } as Partial<Element>)}
              style={{ width: '100%' }}
            />
          </Row>
        </>
      )}

      {/* Lock + gradient */}
      <SectionHeader>OPTIONS</SectionHeader>
      <InlineRow>
        <input
          type="checkbox"
          checked={element.locked}
          onChange={(e) => patch({ locked: e.target.checked })}
          id="inspector-locked"
        />
        <label htmlFor="inspector-locked" style={{ display: 'inline', textTransform: 'none', letterSpacing: 0, color: 'var(--text)' }}>
          Locked
        </label>
      </InlineRow>
      <InlineRow>
        <input
          type="checkbox"
          checked={element.gradient ?? false}
          onChange={(e) => patch({ gradient: e.target.checked })}
          id="inspector-gradient"
        />
        <label htmlFor="inspector-gradient" style={{ display: 'inline', textTransform: 'none', letterSpacing: 0, color: 'var(--text)' }}>
          Gradient overlay
        </label>
      </InlineRow>

      {/* Z-index */}
      <Row>
        <label>Z-INDEX (LAYER)</label>
        <input
          type="number"
          value={element.z}
          onChange={(e) => patch({ z: parseInt(e.target.value) || 0 })}
          style={{ width: '100%' }}
        />
      </Row>
    </div>
  );
}
