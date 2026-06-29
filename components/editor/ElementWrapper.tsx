// components/editor/ElementWrapper.tsx
'use client';
import { useRef } from 'react';
import useStudioStore from '@/lib/store/studioStore';
import { ElementRenderer } from './ElementRenderer';
import type { Element } from '@/lib/types';

interface ElementWrapperProps {
  element: Element;
  isSelected: boolean;
  onSelect: () => void;
  // Optional audio data for visualizer elements
  audioSignal?: number;
  freqData?: Uint8Array;
  isPlaying?: boolean;
  sampleRate?: number;
}

export function ElementWrapper({ element, isSelected, onSelect, audioSignal, freqData, isPlaying, sampleRate }: ElementWrapperProps) {
  const liveValues = useStudioStore((s) => s.liveValues);
  const updateElement = useStudioStore((s) => s.updateElement);
  const canvasConfig = useStudioStore((s) => s.composition?.canvas ?? { width: 1200, height: 800, grid: 8 });
  const liveOverride = liveValues[element.id];

  const rotation = liveOverride?.rotation ?? element.rotation;
  const opacity = liveOverride?.opacity ?? element.opacity;

  const wrapperRef = useRef<HTMLDivElement>(null);

  // Drag state — all in refs so we never trigger React re-renders during drag
  const dragActive = useRef(false);
  const dragOrigin = useRef({ mouseX: 0, mouseY: 0, elemX: 0, elemY: 0 });

  // Resize state
  const resizingRef = useRef(false);
  const resizeStart = useRef({ mouseX: 0, mouseY: 0, w: 0, h: 0 });

  function snap(val: number) {
    return Math.round(val / canvasConfig.grid) * canvasConfig.grid;
  }

  function clampX(val: number) {
    return Math.max(0, Math.min(canvasConfig.width - element.size.w, val));
  }

  function clampY(val: number) {
    return Math.max(0, Math.min(canvasConfig.height - element.size.h, val));
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (element.locked) return;
    // Let resize handle handle itself
    if ((e.target as HTMLElement).closest('[data-resize]')) return;

    e.preventDefault();
    e.stopPropagation();
    onSelect();

    dragActive.current = true;
    dragOrigin.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      // Drag from stored position so audio overrides don't cause a jump
      elemX: element.position.x,
      elemY: element.position.y,
    };

    if (wrapperRef.current) wrapperRef.current.style.cursor = 'grabbing';

    function onMouseMove(ev: MouseEvent) {
      if (!dragActive.current || !wrapperRef.current) return;
      const dx = ev.clientX - dragOrigin.current.mouseX;
      const dy = ev.clientY - dragOrigin.current.mouseY;
      // Clamp in real time — element can never visually leave the canvas
      const nx = clampX(dragOrigin.current.elemX + dx);
      const ny = clampY(dragOrigin.current.elemY + dy);
      // Imperative DOM update: no React re-render during drag
      wrapperRef.current.style.left = `${nx}px`;
      wrapperRef.current.style.top = `${ny}px`;
    }

    function onMouseUp(ev: MouseEvent) {
      if (!dragActive.current) return;
      dragActive.current = false;

      const dx = ev.clientX - dragOrigin.current.mouseX;
      const dy = ev.clientY - dragOrigin.current.mouseY;
      const nx = snap(clampX(dragOrigin.current.elemX + dx));
      const ny = snap(clampY(dragOrigin.current.elemY + dy));

      // Commit to store — one React re-render, no snap-back glitch
      updateElement(element.id, { position: { x: nx, y: ny } });

      if (wrapperRef.current) {
        wrapperRef.current.style.left = `${nx}px`;
        wrapperRef.current.style.top = `${ny}px`;
        wrapperRef.current.style.cursor = 'grab';
      }

      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

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

  // Visual position: stored + audio live override (not used during drag — drag updates DOM directly)
  const visualX = element.position.x + (liveOverride?.x ?? 0);
  const visualY = element.position.y + (liveOverride?.y ?? 0);

  return (
    <div
      ref={wrapperRef}
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute',
        left: visualX,
        top: visualY,
        width: element.size.w,
        height: element.size.h,
        transform: `rotate(${rotation}deg)`,
        opacity,
        zIndex: element.z,
        outline: isSelected ? '1px solid var(--accent)' : '1px solid transparent',
        cursor: element.locked ? 'default' : 'grab',
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      <ElementRenderer
        element={element}
        liveOverride={liveOverride}
        audioSignal={audioSignal}
        freqData={freqData}
        isPlaying={isPlaying}
        sampleRate={sampleRate}
      />

      {/* Gradient overlay */}
      {element.gradient && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, hsl(0,100%,60%), hsl(120,100%,55%), hsl(240,100%,60%), hsl(0,100%,60%))',
            backgroundSize: '300% 300%',
            animation: 'studio-hue-shift 4s linear infinite',
            mixBlendMode: 'overlay',
            opacity: 0.65,
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
      )}

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
            zIndex: 2,
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
            zIndex: 2,
          }}
        >
          □
        </div>
      )}
    </div>
  );
}
