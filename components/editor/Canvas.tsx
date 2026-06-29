// components/editor/Canvas.tsx
'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useDroppable } from '@dnd-kit/core';
import useStudioStore from '@/lib/store/studioStore';
import { ElementWrapper } from './ElementWrapper';
import { CanvasBackground } from './CanvasBackground';

export function Canvas() {
  const composition = useStudioStore((s) => s.composition);
  const selectedElementId = useStudioStore((s) => s.selectedElementId);
  const setSelectedElementId = useStudioStore((s) => s.setSelectedElementId);
  const removeElement = useStudioStore((s) => s.removeElement);
  const updateElement = useStudioStore((s) => s.updateElement);

  const [gridVisible, setGridVisible] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const { setNodeRef, isOver } = useDroppable({ id: 'canvas-droppable' });

  const canvas = composition?.canvas ?? { width: 1200, height: 800, grid: 8 };
  const elements = composition?.elements ?? [];

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!selectedElementId) return;

      // Delete / Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT')) return;
        removeElement(selectedElementId);
        return;
      }

      // Escape — deselect
      if (e.key === 'Escape') {
        setSelectedElementId(null);
        return;
      }

      // Arrow keys — nudge
      const el = elements.find((el) => el.id === selectedElementId);
      if (!el) return;
      const step = e.shiftKey ? canvas.grid * 4 : canvas.grid;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        updateElement(selectedElementId, { position: { x: el.position.x - step, y: el.position.y } });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        updateElement(selectedElementId, { position: { x: el.position.x + step, y: el.position.y } });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        updateElement(selectedElementId, { position: { x: el.position.x, y: el.position.y - step } });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        updateElement(selectedElementId, { position: { x: el.position.x, y: el.position.y + step } });
      }
    },
    [selectedElementId, elements, canvas.grid, removeElement, setSelectedElementId, updateElement]
  );

  // Grid toggle on 'g' key (global)
  const handleGlobalKey = useCallback((e: KeyboardEvent) => {
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT')) return;
    if (e.key === 'g') setGridVisible((v) => !v);
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keydown', handleGlobalKey);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keydown', handleGlobalKey);
    };
  }, [handleKeyDown, handleGlobalKey]);

  const gridOverlayStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    backgroundImage: `
      linear-gradient(to right, var(--muted) 1px, transparent 1px),
      linear-gradient(to bottom, var(--muted) 1px, transparent 1px)
    `,
    backgroundSize: `${canvas.grid}px ${canvas.grid}px`,
    backgroundPosition: '0 0',
    opacity: 0.15,
    pointerEvents: 'none',
  };

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (canvasRef as any).current = node;
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) setSelectedElementId(null);
      }}
      style={{
        width: canvas.width,
        height: canvas.height,
        position: 'relative',
        background: 'var(--surface)',
        border: isOver ? '1px solid var(--accent)' : '1px solid var(--muted)',
        boxShadow: '2px 2px 0 rgba(0,0,0,0.08)',
        flexShrink: 0,
      }}
    >
      <CanvasBackground />
      {gridVisible && <div style={gridOverlayStyle} />}
      {elements
        .slice()
        .sort((a, b) => a.z - b.z)
        .map((el) => (
          <ElementWrapper
            key={el.id}
            element={el}
            isSelected={el.id === selectedElementId}
            onSelect={() => setSelectedElementId(el.id)}
          />
        ))}
    </div>
  );
}
