// components/editor/Palette.tsx
'use client';
import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { PALETTE_ITEMS, PaletteItemDef } from '@/lib/library/sprites';
import { VisualizerModal } from './visualizer/VisualizerModal';

function PaletteItem({ item }: { item: PaletteItemDef }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${item.id}`,
    data: { type: 'palette-item', itemId: item.id },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '5px 8px',
        borderBottom: '1px solid var(--surface)',
        cursor: 'grab',
        opacity: isDragging ? 0.4 : 1,
        background: 'var(--bg)',
        userSelect: 'none',
      }}
    >
      <span
        style={{
          fontFamily: 'monospace',
          fontSize: 11,
          color: 'var(--muted)',
          minWidth: 40,
          whiteSpace: 'pre',
        }}
      >
        {item.preview}
      </span>
      <span
        style={{
          fontSize: 9,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text)',
        }}
      >
        {item.label}
      </span>
    </div>
  );
}

export function Palette() {
  const [showVisualizerModal, setShowVisualizerModal] = useState(false);

  return (
    <div>
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
        ELEMENTS
      </div>
      {PALETTE_ITEMS.map((item) => (
        <PaletteItem key={item.id} item={item} />
      ))}
      <div style={{ padding: '6px 8px', borderTop: '1px solid var(--muted)', marginTop: 4 }}>
        <button
          onClick={() => setShowVisualizerModal(true)}
          style={{
            width: '100%',
            padding: '4px 0',
            fontFamily: 'monospace',
            fontSize: 9,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            background: 'var(--surface)',
            border: '1px solid var(--muted)',
            color: 'var(--text)',
            cursor: 'pointer',
          }}
        >
          ⊙ VISUALIZER
        </button>
      </div>
      <div
        style={{
          padding: '6px 8px',
          fontSize: 9,
          color: 'var(--muted)',
          borderTop: '1px solid var(--surface)',
          marginTop: 4,
        }}
      >
        Drag items onto the canvas to place them.
      </div>
      {showVisualizerModal && (
        <VisualizerModal onClose={() => setShowVisualizerModal(false)} />
      )}
    </div>
  );
}
