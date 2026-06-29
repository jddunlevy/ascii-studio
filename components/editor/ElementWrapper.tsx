// components/editor/ElementWrapper.tsx
'use client';
import { useRef } from 'react';
import { useDraggable } from '@dnd-kit/core';
import useStudioStore from '@/lib/store/studioStore';
import { ElementRenderer } from './ElementRenderer';
import type { Element } from '@/lib/types';

interface ElementWrapperProps {
  element: Element;
  isSelected: boolean;
  onSelect: () => void;
}

export function ElementWrapper({ element, isSelected, onSelect }: ElementWrapperProps) {
  const liveValues = useStudioStore((s) => s.liveValues);
  const updateElement = useStudioStore((s) => s.updateElement);
  const liveOverride = liveValues[element.id];

  // Apply live position offsets if present
  const x = element.position.x + (liveOverride?.x ?? 0);
  const y = element.position.y + (liveOverride?.y ?? 0);
  const rotation = (liveOverride?.rotation ?? element.rotation);
  const opacity = liveOverride?.opacity ?? element.opacity;

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: element.id,
    disabled: element.locked,
    data: { type: 'element', elementId: element.id },
  });

  const resizingRef = useRef(false);
  const resizeStart = useRef({ mouseX: 0, mouseY: 0, w: 0, h: 0 });

  function startResize(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    resizingRef.current = true;
    resizeStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      w: element.size.w,
      h: element.size.h,
    };

    function onMouseMove(ev: MouseEvent) {
      if (!resizingRef.current) return;
      const dx = ev.clientX - resizeStart.current.mouseX;
      const dy = ev.clientY - resizeStart.current.mouseY;
      updateElement(element.id, {
        size: {
          w: Math.max(24, resizeStart.current.w + dx),
          h: Math.max(16, resizeStart.current.h + dy),
        },
      });
    }

    function onMouseUp() {
      resizingRef.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  return (
    <div
      ref={setNodeRef}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget || !(e.target as HTMLElement).closest('[data-resize]')) {
          onSelect();
        }
      }}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: element.size.w,
        height: element.size.h,
        transform: `rotate(${rotation}deg)`,
        opacity,
        zIndex: element.z,
        outline: isSelected ? '1px solid var(--accent)' : '1px solid transparent',
        cursor: isDragging ? 'grabbing' : element.locked ? 'default' : 'grab',
        userSelect: 'none',
        overflow: 'hidden',
      }}
      {...(element.locked ? {} : { ...listeners, ...attributes })}
    >
      <ElementRenderer element={element} liveOverride={liveOverride} />

      {/* Resize handle — bottom-right corner */}
      {isSelected && !element.locked && (
        <div
          data-resize="true"
          onMouseDown={startResize}
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            width: 10,
            height: 10,
            background: 'var(--accent)',
            cursor: 'se-resize',
          }}
        />
      )}

      {/* Locked indicator */}
      {element.locked && isSelected && (
        <div
          style={{
            position: 'absolute',
            top: 2,
            right: 4,
            fontSize: 9,
            color: 'var(--muted)',
          }}
        >
          □
        </div>
      )}
    </div>
  );
}
