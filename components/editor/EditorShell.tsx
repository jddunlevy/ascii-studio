// components/editor/EditorShell.tsx
'use client';
import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
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
import { BackgroundPanel } from './BackgroundPanel';
import { CompositionModal } from '@/components/compositions/CompositionModal';

export function EditorShell() {
  const activeTab = useStudioStore((s) => s.activeTab);
  const setActiveTab = useStudioStore((s) => s.setActiveTab);
  const addElement = useStudioStore((s) => s.addElement);
  const composition = useStudioStore((s) => s.composition);
  const compositionName = composition?.name ?? 'untitled';
  const updateCompositionName = useStudioStore((s) => s.updateCompositionName);

  const [showModal, setShowModal] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(compositionName);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  function snapToGrid(val: number, grid: number): number {
    return Math.round(val / grid) * grid;
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const grid = composition?.canvas.grid ?? 8;
    const canvas = composition?.canvas ?? { width: 1200, height: 800, grid: 8 };

    // Palette item dropped onto canvas
    if (
      active.data.current?.type === 'palette-item' &&
      over?.id === 'canvas-droppable'
    ) {
      const itemId = active.data.current.itemId as string;
      const paletteDef = PALETTE_ITEMS.find((p) => p.id === itemId);
      if (!paletteDef) return;

      // active.rect.current.translated = final screen rect of the dragged item
      // over.rect = screen rect of the canvas droppable
      const activeRect = active.rect.current.translated;
      const canvasRect = over.rect;
      if (!activeRect || !canvasRect) return;

      const dropX = snapToGrid(
        Math.max(0, Math.min(canvas.width - 80, activeRect.left - canvasRect.left)),
        grid
      );
      const dropY = snapToGrid(
        Math.max(0, Math.min(canvas.height - 24, activeRect.top - canvasRect.top)),
        grid
      );

      const z = (composition?.elements.length ?? 0) + 1;
      const el = paletteDef.createElement({ x: dropX, y: dropY }, z);
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
            style={{
              flex: 1,
              overflow: 'auto',
              padding: 32,
              background: 'var(--bg)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-start',
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
            <BackgroundPanel />
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
