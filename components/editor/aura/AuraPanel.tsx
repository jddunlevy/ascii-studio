'use client';
import useStudioStore from '@/lib/store/studioStore';
import type { AuraElement, ColorStop } from '@/lib/types';

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

interface AuraPanelProps {
  element: AuraElement;
}

export function AuraPanel({ element }: AuraPanelProps) {
  const updateElement = useStudioStore((s) => s.updateElement);

  function patch(changes: Partial<AuraElement>) {
    updateElement(element.id, changes);
  }

  function handleUpdateColorStop(index: number, changes: Partial<ColorStop>) {
    const updated = element.colorStops.map((stop, i) =>
      i === index ? { ...stop, ...changes } : stop
    );
    patch({ colorStops: updated.sort((a, b) => a.position - b.position) });
  }

  function handleAddColorStop() {
    if (element.colorStops.length >= 5) return;

    const newPosition = element.colorStops.length > 0
      ? (element.colorStops[element.colorStops.length - 1].position + 1) / 2
      : 0.5;

    const newStop: ColorStop = {
      position: newPosition,
      color: '#FFFFFF',
    };

    patch({
      colorStops: [...element.colorStops, newStop].sort((a, b) => a.position - b.position),
    });
  }

  function handleRemoveColorStop(index: number) {
    if (element.colorStops.length <= 2) return;
    patch({
      colorStops: element.colorStops.filter((_, i) => i !== index),
    });
  }

  return (
    <div style={{ fontSize: 11 }}>
      {/* COLOR STOPS Section */}
      <SectionHeader>COLOR STOPS ({element.colorStops.length}/5)</SectionHeader>

      {element.colorStops.map((stop, index) => (
        <div
          key={index}
          style={{
            padding: '8px',
            borderBottom: '1px solid var(--surface)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 4,
            }}
          >
            <label
              style={{
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--muted)',
              }}
            >
              STOP {index}
            </label>
            {element.colorStops.length > 2 && (
              <button
                onClick={() => handleRemoveColorStop(index)}
                style={{
                  fontFamily: 'monospace',
                  fontSize: 9,
                  padding: '2px 6px',
                  border: '1px solid var(--muted)',
                  background: 'var(--bg)',
                  color: 'var(--muted)',
                  cursor: 'pointer',
                }}
              >
                REMOVE
              </button>
            )}
          </div>

          <div style={{ marginBottom: 4 }}>
            <label
              style={{
                fontSize: 8,
                color: 'var(--muted)',
                display: 'block',
                marginBottom: 2,
              }}
            >
              POSITION (0-1)
            </label>
            <input
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={stop.position}
              onChange={(e) =>
                handleUpdateColorStop(index, {
                  position: parseFloat(e.target.value) || 0,
                })
              }
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label
              style={{
                fontSize: 8,
                color: 'var(--muted)',
                display: 'block',
                marginBottom: 2,
              }}
            >
              COLOR
            </label>
            <div style={{ display: 'flex', gap: 4 }}>
              <input
                type="color"
                value={stop.color}
                onChange={(e) => handleUpdateColorStop(index, { color: e.target.value })}
                style={{
                  width: 40,
                  height: 28,
                  border: '1px solid var(--muted)',
                  background: 'var(--bg)',
                  cursor: 'pointer',
                }}
              />
              <input
                type="text"
                value={stop.color}
                onChange={(e) => handleUpdateColorStop(index, { color: e.target.value })}
                style={{
                  flex: 1,
                  fontFamily: 'monospace',
                  fontSize: 11,
                }}
              />
            </div>
          </div>
        </div>
      ))}

      {element.colorStops.length < 5 && (
        <Row>
          <button
            onClick={handleAddColorStop}
            style={{
              width: '100%',
              fontFamily: 'monospace',
              fontSize: 9,
              padding: '4px 8px',
              border: '1px solid var(--muted)',
              background: 'var(--bg)',
              color: 'var(--text)',
              cursor: 'pointer',
            }}
          >
            + ADD COLOR STOP
          </button>
        </Row>
      )}

      {/* BLUR Section */}
      <SectionHeader>BLUR</SectionHeader>
      <Row>
        <label>INTENSITY (0-100)</label>
        <input
          type="range"
          min={0}
          max={100}
          value={element.blur}
          onChange={(e) => patch({ blur: parseInt(e.target.value) })}
          style={{ width: '100%' }}
        />
        <span style={{ color: 'var(--muted)', textAlign: 'center' }}>
          {element.blur}
        </span>
      </Row>

      {/* BLEND MODE Section */}
      <SectionHeader>BLEND MODE</SectionHeader>
      <Row>
        <label>MODE</label>
        <select
          value={element.blendMode || 'normal'}
          onChange={(e) =>
            patch({
              blendMode: e.target.value as 'normal' | 'screen' | 'overlay' | 'multiply',
            })
          }
          style={{ width: '100%' }}
        >
          <option value="normal">normal</option>
          <option value="screen">screen</option>
          <option value="overlay">overlay</option>
          <option value="multiply">multiply</option>
        </select>
      </Row>
    </div>
  );
}
