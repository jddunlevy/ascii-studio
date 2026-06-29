// components/compositions/CompositionModal.tsx
'use client';
import { useState, useEffect, useRef } from 'react';
import useStudioStore from '@/lib/store/studioStore';
import {
  listCompositions,
  saveComposition,
  deleteComposition,
} from '@/lib/composition/storage';
import { createComposition } from '@/lib/composition/defaults';
import type { CompositionSpec } from '@/lib/types';

interface CompositionModalProps {
  onClose: () => void;
}

export function CompositionModal({ onClose }: CompositionModalProps) {
  const storeLoadComposition = useStudioStore((s) => s.loadComposition);
  const persistComposition = useStudioStore((s) => s.persistComposition);
  const composition = useStudioStore((s) => s.composition);

  const [savedList, setSavedList] = useState<CompositionSpec[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  function refresh() {
    setSavedList(listCompositions());
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  function handleNew() {
    const comp = createComposition('untitled');
    saveComposition(comp);
    storeLoadComposition(comp);
    onClose();
  }

  function handleSave() {
    persistComposition();
    refresh();
  }

  function handleLoad(comp: CompositionSpec) {
    storeLoadComposition(comp);
    onClose();
  }

  function handleDelete(id: string) {
    deleteComposition(id);
    refresh();
  }

  function startEditName(comp: CompositionSpec) {
    setEditingId(comp.id);
    setEditingName(comp.name);
  }

  function commitEditName(comp: CompositionSpec) {
    const updated = { ...comp, name: editingName };
    saveComposition(updated);
    // If this is the currently loaded composition, update store name too
    if (composition?.id === comp.id) {
      storeLoadComposition(updated);
    }
    setEditingId(null);
    refresh();
  }

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
      }}
    >
      <div
        style={{
          width: 480,
          background: 'var(--surface)',
          border: '1px solid var(--muted)',
          fontFamily: 'monospace',
          fontSize: 11,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '8px 12px',
            borderBottom: '1px solid var(--muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg)',
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
            COMPOSITIONS
          </span>
          <button onClick={onClose} style={{ border: 'none', background: 'none', color: 'var(--muted)', padding: '2px 4px' }}>
            ✕
          </button>
        </div>

        {/* Action buttons */}
        <div
          style={{
            padding: '8px 12px',
            borderBottom: '1px solid var(--muted)',
            display: 'flex',
            gap: 8,
          }}
        >
          <button onClick={handleNew}>NEW COMPOSITION</button>
          <button onClick={handleSave} disabled={!composition}>
            SAVE CURRENT
          </button>
        </div>

        {/* List */}
        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          {savedList.length === 0 ? (
            <div style={{ padding: '16px 12px', color: 'var(--muted)' }}>
              No saved compositions.
            </div>
          ) : (
            savedList.map((comp) => (
              <div
                key={comp.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '6px 12px',
                  borderBottom: '1px solid var(--bg)',
                  background: composition?.id === comp.id ? 'var(--bg)' : 'var(--surface)',
                  gap: 8,
                }}
              >
                {editingId === comp.id ? (
                  <input
                    ref={editInputRef}
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={() => commitEditName(comp)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitEditName(comp);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    style={{ flex: 1 }}
                  />
                ) : (
                  <span
                    style={{ flex: 1, cursor: 'text', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    onDoubleClick={() => startEditName(comp)}
                    title="Double-click to rename"
                  >
                    {comp.name}
                  </span>
                )}
                <span style={{ color: 'var(--muted)', fontSize: 9, whiteSpace: 'nowrap' }}>
                  {new Date(comp.updatedAt).toLocaleDateString()}
                </span>
                <button onClick={() => handleLoad(comp)}>LOAD</button>
                <button
                  onClick={() => handleDelete(comp.id)}
                  style={{ color: 'var(--muted)', borderColor: 'var(--muted)' }}
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
