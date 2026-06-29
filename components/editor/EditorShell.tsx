// components/editor/EditorShell.tsx
'use client';
import { useState, useRef } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
} from '@dnd-kit/core';
import useStudioStore from '@/lib/store/studioStore';
import { PALETTE_ITEMS } from '@/lib/library/sprites';
import { Canvas } from './Canvas';
import { Palette } from './Palette';
import { BindingPanel } from './BindingPanel';
import { Inspector } from './Inspector';
import { AudioPlayer } from './AudioPlayer';
import { CompositionModal } from '@/components/compositions/CompositionModal';

export function EditorShell() {
  const activeTab = useStudioStore((s) => s.activeTab);
  const setActiveTab = useStudioStore((s) => s.setActiveTab);
  const addElement = useStudioStore((s) => s.addElement);
  const updateElement = useStudioStore((s) => s.updateElement);
  const composition = useStudioStore((s) => s.composition);
  const compositionName = composition?.name ?? 'untitled';
  const updateCompositionName = useStudioStore((s) => s.updateCompositionName);

  const [showModal, setShowModal] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(compositionName);
  const canvasRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  function snapToGrid(val: number, grid: number): number {
    return Math.round(val / grid) * grid;
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over, delta } = event;
    const grid = composition?.canvas.grid ?? 8;

    // Dragging an existing element
    if (active.data.current?.type === 'element') {
      const elementId = active.data.current.elementId as string;
      const element = composition?.elements.find((el) => el.id === elementId);
      if (!element) return;
      const newX = snapToGrid(element.position.x + delta.x, grid);
      const newY = snapToGrid(element.position.y + delta.y, grid);
      updateElement(elementId, { position: { x: newX, y: newY } });
      return;
    }

    // Dropping a palette item onto the canvas
    if (
      active.data.current?.type === 'palette-item' &&
      over?.id === 'canvas-droppable'
    ) {
      const itemId = active.data.current.itemId as string;
      const paletteDef = PALETTE_ITEMS.find((p) => p.id === itemId);
      if (!paletteDef || !canvasRef.current) return;

      const canvasRect = canvasRef.current.getBoundingClientRect();
      // Estimate drop position: use over.rect center minus canvas origin
      const dropX = snapToGrid(
        (over.rect?.left ?? canvasRect.left) - canvasRect.left + (over.rect?.width ?? 0) / 2,
        grid
      );
      const dropY = snapToGrid(
        (over.rect?.top ?? canvasRect.top) - canvasRect.top + (over.rect?.height ?? 0) / 2,
        grid
      );

      const z = (composition?.elements.length ?? 0) + 1;
      const el = paletteDef.createElement({ x: Math.max(0, dropX), y: Math.max(0, dropY) }, z);
      addElement(el);
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          overflow: 'hidden',
          background: 'var(--bg)',
        }}
      >
        {/* Top bar */}
        <div
          style={{
            height: 32,
            borderBottom: '1px solid var(--muted)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 8px',
            gap: 8,
            background: 'var(--surface)',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 9,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
            }}
          >
            ASCII-STUDIO
          </span>
          <span style={{ color: 'var(--muted)' }}>─</span>
          {editingName ? (
            <input
              autoFocus
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={() => {
                updateCompositionName(nameValue);
                setEditingName(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  updateCompositionName(nameValue);
                  setEditingName(false);
                }
                if (e.key === 'Escape') setEditingName(false);
              }}
              style={{ width: 160 }}
            />
          ) : (
            <span
              style={{ fontSize: 11, cursor: 'text' }}
              onDoubleClick={() => {
                setNameValue(compositionName);
                setEditingName(true);
              }}
            >
              {compositionName}
            </span>
          )}
          <div style={{ marginLeft: 'auto' }}>
            <button onClick={() => setShowModal(true)}>COMPOSITIONS</button>
          </div>
        </div>

        {/* Main area */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left sidebar */}
          <div
            style={{
              width: 240,
              borderRight: '1px solid var(--muted)',
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0,
            }}
          >
            {/* Tab buttons */}
            <div
              style={{
                display: 'flex',
                borderBottom: '1px solid var(--muted)',
              }}
            >
              {(['palette', 'bindings'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    flex: 1,
                    border: 'none',
                    borderBottom:
                      activeTab === tab
                        ? '2px solid var(--accent)'
                        : '2px solid transparent',
                    borderRadius: 0,
                    background: 'var(--surface)',
                    color: activeTab === tab ? 'var(--accent)' : 'var(--muted)',
                    padding: '6px 0',
                    fontSize: 9,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              {activeTab === 'palette' ? <Palette /> : <BindingPanel />}
            </div>
          </div>

          {/* Center canvas */}
          <div
            ref={canvasRef}
            style={{
              flex: 1,
              overflow: 'auto',
              padding: 32,
              background: 'var(--bg)',
            }}
          >
            <Canvas />
          </div>

          {/* Right sidebar */}
          <div
            style={{
              width: 240,
              borderLeft: '1px solid var(--muted)',
              overflow: 'auto',
              flexShrink: 0,
            }}
          >
            <Inspector />
          </div>
        </div>

        {/* Bottom audio bar */}
        <div
          style={{
            height: 40,
            borderTop: '1px solid var(--muted)',
            flexShrink: 0,
          }}
        >
          <AudioPlayer />
        </div>
      </div>

      {showModal && <CompositionModal onClose={() => setShowModal(false)} />}
    </DndContext>
  );
}
