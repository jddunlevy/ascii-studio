// components/compositions/CompositionModal.tsx
export function CompositionModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--muted)',
          padding: 24,
          width: 480,
        }}
      >
        <p style={{ marginBottom: 16 }}>Compositions — Task 13</p>
        <button onClick={onClose}>CLOSE</button>
      </div>
    </div>
  );
}
