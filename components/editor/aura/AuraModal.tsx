'use client';
import { useState } from 'react';
import { nanoid } from 'nanoid';
import useStudioStore from '@/lib/store/studioStore';
import { DEFAULT_COLOR } from '@/lib/composition/defaults';
import type { AuraElement, ColorStop } from '@/lib/types';

interface AuraModalProps {
  onClose: () => void;
}

export function AuraModal({ onClose }: AuraModalProps) {
  const [colorStops, setColorStops] = useState<ColorStop[]>([
    { position: 0, color: '#4ECDC4' },
    { position: 1, color: '#8E44AD' },
  ]);
  const [blur, setBlur] = useState(50);
  const [blendMode, setBlendMode] = useState<'normal' | 'screen' | 'overlay' | 'multiply'>('screen');

  const addElement = useStudioStore((s) => s.addElement);
  const composition = useStudioStore((s) => s.composition);

  function handleAddColorStop() {
    if (colorStops.length >= 5) return;

    const newPosition = colorStops.length > 0
      ? (colorStops[colorStops.length - 1].position + 1) / 2
      : 0.5;

    const newStop: ColorStop = {
      position: newPosition,
      color: '#FFFFFF',
    };

    setColorStops([...colorStops, newStop].sort((a, b) => a.position - b.position));
  }

  function handleRemoveColorStop(index: number) {
    if (colorStops.length <= 2) return;
    setColorStops(colorStops.filter((_, i) => i !== index));
  }

  function handleUpdateColorStop(index: number, changes: Partial<ColorStop>) {
    const updated = colorStops.map((stop, i) =>
      i === index ? { ...stop, ...changes } : stop
    );
    setColorStops(updated.sort((a, b) => a.position - b.position));
  }

  function handleAdd() {
    const z = (composition?.elements.length ?? 0) + 1;
    const element: AuraElement = {
      id: nanoid(),
      type: 'aura',
      colorStops,
      blur,
      blendMode,
      position: { x: 100, y: 100 },
      size: { w: 200, h: 200 },
      z,
      rotation: 0,
      opacity: 1,
      color: { ...DEFAULT_COLOR },
      locked: false,
    };

    addElement(element);
    onClose();
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
      }}
    >
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--muted)',
          padding: 24,
          width: 400,
          fontFamily: 'monospace',
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div
          style={{
            fontSize: 9,
            color: 'var(--muted)',
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            borderBottom: '1px solid var(--muted)',
            paddingBottom: 12,
            marginBottom: 12,
          }}
        >
          AURA
        </div>

        {/* Color Stops */}
        <div style={{ marginBottom: 12 }}>
          <label
            style={{
              display: 'block',
              fontSize: 9,
              color: 'var(--muted)',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            COLOR STOPS ({colorStops.length}/5)
          </label>

          {colorStops.map((stop, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                gap: 8,
                marginBottom: 8,
                alignItems: 'center',
              }}
            >
              <div style={{ flex: 1 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 8,
                    color: 'var(--muted)',
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
                  style={{
                    width: '100%',
                    fontFamily: 'monospace',
                    fontSize: 11,
                    padding: '4px 6px',
                    border: '1px solid var(--muted)',
                    background: 'var(--bg)',
                    color: 'var(--text)',
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 8,
                    color: 'var(--muted)',
                    marginBottom: 2,
                  }}
                >
                  COLOR
                </label>
                <input
                  type="color"
                  value={stop.color}
                  onChange={(e) =>
                    handleUpdateColorStop(index, { color: e.target.value })
                  }
                  style={{
                    width: '100%',
                    height: 28,
                    border: '1px solid var(--muted)',
                    background: 'var(--bg)',
                    cursor: 'pointer',
                  }}
                />
              </div>
              {colorStops.length > 2 && (
                <button
                  onClick={() => handleRemoveColorStop(index)}
                  style={{
                    fontFamily: 'monospace',
                    fontSize: 11,
                    padding: '4px 8px',
                    border: '1px solid var(--muted)',
                    background: 'var(--bg)',
                    color: 'var(--muted)',
                    cursor: 'pointer',
                    alignSelf: 'flex-end',
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}

          {colorStops.length < 5 && (
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
                marginTop: 4,
              }}
            >
              + ADD COLOR STOP
            </button>
          )}
        </div>

        {/* Blur */}
        <div style={{ marginBottom: 12 }}>
          <label
            style={{
              display: 'block',
              fontSize: 9,
              color: 'var(--muted)',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            BLUR (0-100)
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={blur}
            onChange={(e) => setBlur(parseInt(e.target.value))}
            style={{
              width: '100%',
              marginBottom: 4,
            }}
          />
          <div
            style={{
              fontSize: 11,
              color: 'var(--muted)',
              textAlign: 'center',
            }}
          >
            {blur}
          </div>
        </div>

        {/* Blend Mode */}
        <div style={{ marginBottom: 12 }}>
          <label
            style={{
              display: 'block',
              fontSize: 9,
              color: 'var(--muted)',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            BLEND MODE
          </label>
          <select
            value={blendMode}
            onChange={(e) => setBlendMode(e.target.value as typeof blendMode)}
            style={{
              width: '100%',
              fontFamily: 'monospace',
              fontSize: 11,
              padding: '4px 6px',
              border: '1px solid var(--muted)',
              background: 'var(--bg)',
              color: 'var(--text)',
            }}
          >
            <option value="normal">normal</option>
            <option value="screen">screen</option>
            <option value="overlay">overlay</option>
            <option value="multiply">multiply</option>
          </select>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button
            onClick={handleAdd}
            style={{
              flex: 1,
              fontFamily: 'monospace',
              fontSize: 11,
              padding: '4px 8px',
              border: '1px solid var(--accent)',
              background: 'var(--accent)',
              color: 'var(--bg)',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            ADD
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              fontFamily: 'monospace',
              fontSize: 11,
              padding: '4px 8px',
              border: '1px solid var(--muted)',
              background: 'var(--bg)',
              color: 'var(--muted)',
              cursor: 'pointer',
            }}
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
}
