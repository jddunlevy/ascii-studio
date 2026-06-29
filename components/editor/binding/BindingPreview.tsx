'use client';
import { useState, useEffect, useRef } from 'react';
import { audioEngine } from '@/lib/audio/audioEngine';
import { applyTransform } from '@/lib/animation/animationLoop';
import type { Binding } from '@/lib/types';

interface BindingPreviewProps {
  binding: Binding;
}

export function BindingPreview({ binding }: BindingPreviewProps) {
  const [signalValue, setSignalValue] = useState(0);
  const [outputValue, setOutputValue] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    function tick() {
      const signals = audioEngine.getSignals();
      const sv = signals[binding.signal] ?? 0;
      const ov = binding.property !== 'content'
        ? applyTransform(sv, binding.transform)
        : 0;
      setSignalValue(sv);
      setOutputValue(ov);
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [binding.signal, binding.transform, binding.property]);

  return (
    <div style={{
      fontSize: 9, color: 'var(--muted)', fontFamily: 'monospace',
      padding: '2px 0', display: 'flex', alignItems: 'center', gap: 4,
    }}>
      <span>{binding.signal}: {signalValue.toFixed(2)}</span>
      <span style={{ color: 'var(--text)' }}>→</span>
      <span>
        {binding.property !== 'content'
          ? `${binding.property}: ${outputValue.toFixed(2)}`
          : `${binding.property}: frame`}
      </span>
    </div>
  );
}
