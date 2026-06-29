// components/editor/BindingPanel.tsx
'use client';
import { nanoid } from 'nanoid';
import useStudioStore from '@/lib/store/studioStore';
import type { Binding } from '@/lib/types';
import { BindingRow } from './BindingRow';
import { BindingPresets } from './binding/BindingPresets';

export function BindingPanel() {
  const composition = useStudioStore((s) => s.composition);
  const addBinding = useStudioStore((s) => s.addBinding);
  const selectedElementId = useStudioStore((s) => s.selectedElementId);

  const bindings = composition?.bindings ?? [];
  const firstElementId = composition?.elements[0]?.id ?? '';

  function handleAddBinding() {
    const newBinding: Binding = {
      id: nanoid(),
      elementId: firstElementId,
      signal: 'volume',
      property: 'opacity',
      transform: { min: 0, max: 1, invert: false },
    };
    addBinding(newBinding);
  }

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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>BINDINGS</span>
        <button onClick={handleAddBinding} style={{ fontSize: 9 }}>
          ADD BINDING +
        </button>
      </div>

      <BindingPresets elementId={selectedElementId ?? ''} />

      {bindings.length === 0 ? (
        <div style={{ padding: '12px 8px', color: 'var(--muted)', fontSize: 11 }}>
          No bindings yet.
        </div>
      ) : (
        bindings.map((b) => <BindingRow key={b.id} binding={b} />)
      )}
    </div>
  );
}
